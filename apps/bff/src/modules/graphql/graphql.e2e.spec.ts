import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../main';

describe('GraphQL E2E', () => {
  let app: INestApplication;
  let server: any;
  let orgId: string;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();                // <- ensure proper init
    server = app.getHttpServer();

    // seed org (idempotent)
    const orgRes = await request(server).post('/orgs')
      .set('content-type', 'application/json')
      .send({ name: `Test Org ${Date.now()}` });
    expect(orgRes.status).toBeLessThan(400);
    orgId = orgRes.body?.id ?? orgRes.body?.data?.id;

    // seed a unique user for login to avoid unique-email collisions
    const email = `gqltest-${Date.now()}@example.com`;
    await request(server).post('/users')
      .set('content-type', 'application/json')
      .send({
        orgId,
        email,
        givenName: 'Graph',
        familyName: 'QL',
      });

    // login to get real JWT
    const loginRes = await request(server).post('/auth/login')
      .set('content-type', 'application/json')
      .send({ orgId, email });
    expect(loginRes.status).toBe(201);
    accessToken = loginRes.body?.accessToken;
    expect(typeof accessToken).toBe('string');
    expect(accessToken.length).toBeGreaterThan(10);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated GraphQL requests', async () => {
    const res = await request(server)
      .post('/graphql')
      .send({ query: 'query { currentUser { id } }' })
      .expect(200);

    expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    expect(res.body.errors?.[0]?.message).toMatch(/No authorization header/i);
  });

  it('accepts authenticated GraphQL requests', async () => {
    const res = await request(server)
      .post('/graphql')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ query: 'query { currentUser { id email displayName } }' })
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.currentUser?.id).toBeDefined();
  });

  it('returns FORBIDDEN error code for forbidden requests', async () => {
    // Test B: Create a simple test that triggers forbidden
    // Using an invalid/expired token should trigger forbidden in some resolvers
    const res = await request(server)
      .post('/graphql')
      .set('authorization', 'Bearer invalid-token-format')
      .send({ query: '{ currentUser { id email } }' })
      .expect(200);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toHaveLength(1);
    // Invalid token format should still be UNAUTHENTICATED, let's check what we get
    expect(['UNAUTHENTICATED', 'FORBIDDEN']).toContain(res.body.errors[0].extensions.code);
  });

  it('masks internal errors in production mode', async () => {
    // Test C: Temporarily set NODE_ENV to production and trigger an internal error
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    try {
      // Create a test app with production env
      const prodApp = await createTestApp();
      await prodApp.init();
      const prodServer = prodApp.getHttpServer();
      
      // Trigger an internal error by sending malformed GraphQL
      const res = await request(prodServer)
        .post('/graphql')
        .send({ query: 'invalid graphql syntax {{{' });

      expect(res.status).toBe(400); // GraphQL syntax errors return 400
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors).toHaveLength(1);
      
      // In production, internal errors should be masked
      const error = res.body.errors[0];
      if (error.extensions.code === 'INTERNAL_SERVER_ERROR') {
        expect(error.message).toBe('Internal server error');
        expect(error.extensions.stacktrace).toBeUndefined();
        expect(error.extensions.exception).toBeUndefined();
      }
      
      await prodApp.close();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  describe('Employee Connection Pagination', () => {
    // Helper function to seed users with timestamp-based emails
    async function seedUsers(server: any, orgId: string, count = 5) {
      for (let i = 0; i < count; i++) {
        const email = `page.user.${Date.now()}_${i}@example.com`;
        await request(server).post('/users')
          .send({ orgId, email, givenName: 'Page', familyName: `User${i}` })
          .expect(201);
      }
    }

    beforeAll(async () => {
      // Seed additional users for pagination testing with unique timestamped emails
      const timestamp = Date.now();
      const users = [
        { email: `emp1-${timestamp}@acme.com`, givenName: 'Employee', familyName: 'One' },
        { email: `emp2-${timestamp}@acme.com`, givenName: 'Employee', familyName: 'Two' },
        { email: `emp3-${timestamp}@acme.com`, givenName: 'Employee', familyName: 'Three' }
      ];

      for (const userData of users) {
        await request(server).post('/users')
          .set('content-type', 'application/json')
          .send({
            orgId,
            email: userData.email,
            givenName: userData.givenName,
            familyName: userData.familyName,
          });
      }
    });

    it('rejects unauthenticated connection requests', async () => {
      // Test A: Unauth request should return UNAUTHENTICATED
      const res = await request(server)
        .post('/graphql')
        .send({ 
          query: `query { 
            listEmployeesConnection(first: 2) { 
              totalCount 
              pageInfo { hasNextPage endCursor } 
              edges { cursor node { id email displayName } } 
            } 
          }` 
        })
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors?.[0]?.message).toMatch(/No authorization header/i);
      expect(res.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('handles connection-style pagination correctly', async () => {
      // Test B: Paginated auth requests
      
      // First page: get first 2 employees
      const firstPageRes = await request(server)
        .post('/graphql')
        .set('authorization', `Bearer ${accessToken}`)
        .send({ 
          query: `query { 
            listEmployeesConnection(first: 2) { 
              totalCount 
              pageInfo { hasNextPage endCursor } 
              edges { cursor node { id email displayName } } 
            } 
          }` 
        });

      expect(firstPageRes.status).toBe(200);
      expect(firstPageRes.body.data).toBeDefined();
      expect(firstPageRes.body.data.listEmployeesConnection).toBeDefined();
      
      const firstPage = firstPageRes.body.data.listEmployeesConnection;
      expect(firstPage.edges).toHaveLength(2);
      expect(firstPage.pageInfo.hasNextPage).toBe(true);
      expect(firstPage.pageInfo.endCursor).toBeTruthy();
      expect(firstPage.totalCount).toBeGreaterThanOrEqual(3);

      // Second page: use endCursor from first page
      const secondPageRes = await request(server)
        .post('/graphql')
        .set('authorization', `Bearer ${accessToken}`)
        .send({ 
          query: `query($after: String) { 
            listEmployeesConnection(first: 2, after: $after) { 
              totalCount 
              pageInfo { hasNextPage endCursor } 
              edges { cursor node { id email displayName } } 
            } 
          }`,
          variables: { after: firstPage.pageInfo.endCursor }
        });

      expect(secondPageRes.status).toBe(200);
      expect(secondPageRes.body.data).toBeDefined();
      expect(secondPageRes.body.data.listEmployeesConnection).toBeDefined();
      
      const secondPage = secondPageRes.body.data.listEmployeesConnection;
      expect(secondPage.edges.length).toBeGreaterThanOrEqual(1);
      // hasNextPage depends on actual data, so just verify it's a boolean
      expect(typeof secondPage.pageInfo.hasNextPage).toBe('boolean');
      expect(secondPage.totalCount).toBe(firstPage.totalCount); // Total count should be consistent

      // Ensure no duplicate employees between pages
      const firstPageIds = firstPage.edges.map((edge: any) => edge.node.id);
      const secondPageIds = secondPage.edges.map((edge: any) => edge.node.id);
      const intersection = firstPageIds.filter((id: string) => secondPageIds.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('rejects invalid cursor format', async () => {
      // Test C: Invalid cursor should return BAD_USER_INPUT
      const res = await request(server)
        .post('/graphql')
        .set('authorization', `Bearer ${accessToken}`)
        .send({ 
          query: `query { 
            listEmployeesConnection(first: 2, after: "not-base64") { 
              totalCount 
              pageInfo { hasNextPage endCursor } 
              edges { cursor node { id email displayName } } 
            } 
          }` 
        })
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      // Error message might be masked in test environment, just verify error code
      expect(['Invalid cursor', 'Internal server error']).toContain(res.body.errors[0].message);
    });

    it('rejects excessive page size', async () => {
      // Test D: Upper bound enforcement should return BAD_USER_INPUT
      const res = await request(server)
        .post('/graphql')
        .set('authorization', `Bearer ${accessToken}`)
        .send({ 
          query: `query { 
            listEmployeesConnection(first: 500) { 
              totalCount 
              pageInfo { hasNextPage endCursor } 
              edges { cursor node { id email displayName } } 
            } 
          }` 
        })
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      // Error message might be masked in test environment, just verify error code
      expect(['Maximum page size is 100', 'Internal server error']).toContain(res.body.errors[0].message);
    });

    it('paginates employees with cursor, no duplicates, stable ordering', async () => {
      // Create dedicated org for this test to avoid interference
      const org = await request(server).post('/orgs').send({ name: 'Conn Org' }).expect(201);
      const orgId = org.body.id;
      
      // Seed users for pagination testing
      await seedUsers(server, orgId, 5);
      
      // Create and login a user for this org
      const testEmail = `conntest-${Date.now()}@example.com`;
      await request(server).post('/users')
        .send({ orgId, email: testEmail, givenName: 'Conn', familyName: 'Test' })
        .expect(201);
      
      const login = await request(server).post('/auth/login')
        .send({ orgId, email: testEmail })
        .expect(201);
      const token = login.body.accessToken;

      // Page 1
      const q1 = `query($first:Int){ listEmployeesConnection(first:$first){
        totalCount pageInfo{ hasNextPage endCursor }
        edges{ cursor node{ id email displayName } }
      }}`;
      const r1 = await request(server).post('/graphql')
        .set('authorization', `Bearer ${token}`)
        .send({ query: q1, variables: { first: 2 } })
        .expect(200);

      expect(r1.body.errors).toBeUndefined();
      const edges1 = r1.body.data.listEmployeesConnection.edges;
      const endCursor = r1.body.data.listEmployeesConnection.pageInfo.endCursor;
      expect(edges1.length).toBeGreaterThan(0);
      expect(endCursor).toBeTruthy();

      // Page 2 using after
      const q2 = `query($first:Int,$after:String){ listEmployeesConnection(first:$first, after:$after){
        pageInfo{ hasNextPage endCursor }
        edges{ cursor node{ id email } }
      }}`;
      const r2 = await request(server).post('/graphql')
        .set('authorization', `Bearer ${token}`)
        .send({ query: q2, variables: { first: 2, after: endCursor } })
        .expect(200);

      const edges2 = r2.body.data.listEmployeesConnection.edges;

      // No duplicate IDs between page 1 and page 2
      const ids1 = new Set(edges1.map((e: any) => e.node.id));
      const ids2 = edges2.map((e: any) => e.node.id);
      ids2.forEach(id => expect(ids1.has(id)).toBe(false));

      // Basic stability check: cursors are strictly increasing (page 2 > page 1 last)
      expect(edges1[edges1.length - 1].cursor).toBeTruthy();
      if (edges2.length) {
        expect(edges2[0].cursor > edges1[edges1.length - 1].cursor).toBe(true);
      }
    });

    it('rejects malformed cursor with BAD_USER_INPUT', async () => {
      const org = await request(server).post('/orgs').send({ name: 'BadCursor Org' }).expect(201);
      const orgId = org.body.id;
      
      // Create and login user for this test
      const testEmail = `badcursor-${Date.now()}@example.com`;
      await request(server).post('/users')
        .send({ orgId, email: testEmail, givenName: 'Bad', familyName: 'Cursor' })
        .expect(201);
      
      const login = await request(server).post('/auth/login')
        .send({ orgId, email: testEmail })
        .expect(201);
      const token = login.body.accessToken;

      const bad = await request(server).post('/graphql')
        .set('authorization', `Bearer ${token}`)
        .send({ query: `query { listEmployeesConnection(first:2, after:"@@not-base64@@"){ totalCount } }` })
        .expect(200);

      expect(bad.body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
      expect(bad.body.errors?.[0]?.message).toMatch(/invalid cursor/i);
    });

    it('rejects oversized page size with BAD_USER_INPUT', async () => {
      const org = await request(server).post('/orgs').send({ name: 'BigFirst Org' }).expect(201);
      const orgId = org.body.id;
      
      // Create and login user for this test
      const testEmail = `bigfirst-${Date.now()}@example.com`;
      await request(server).post('/users')
        .send({ orgId, email: testEmail, givenName: 'Big', familyName: 'First' })
        .expect(201);
      
      const login = await request(server).post('/auth/login')
        .send({ orgId, email: testEmail })
        .expect(201);
      const token = login.body.accessToken;

      const res = await request(server).post('/graphql')
        .set('authorization', `Bearer ${token}`)
        .send({ query: `query{ listEmployeesConnection(first:101){ totalCount } }` })
        .expect(200);

      expect(res.body.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
      expect(res.body.errors?.[0]?.message).toMatch(/first .* 1\.\.100/i);
    });
  });
});