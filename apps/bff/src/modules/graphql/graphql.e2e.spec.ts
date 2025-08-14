import request from 'supertest';
import { createTestApp } from '../../main';

describe('GraphQL BFF (e2e)', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    await app.init(); // Initialize the app properly for testing
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected GraphQL queries without JWT', async () => {
    const res = await request(server)
      .post('/graphql')
      .send({ query: '{ currentUser { id email } }' })
      .set('content-type', 'application/json');
    
    // Test 1 (UNAUTH): call a protected query -> expect authorization error
    expect(res.status).toBe(200); // GraphQL returns 200 with errors
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/Unauthorized|unauthenticated|forbidden/i);
  });

  it('returns data for protected queries with JWT', async () => {
    // Test 2 (AUTH): obtain JWT via REST /auth/login, call the same protected query with Authorization: Bearer <token> -> expect 200 and minimal shape assertions
    
    // Prepare org/user, then login via REST to get JWT
    const orgsResp = await request(server).get('/orgs?limit=1');
    const orgId = orgsResp.body?.[0]?.id ?? 
      (await request(server).post('/orgs').send({ name: 'GQL Demo Org' })).body.id;

    await request(server)
      .post('/users')
      .send({ orgId, email: 'gqltester@example.com', givenName: 'Gql', familyName: 'Tester' });

    const login = await request(server)
      .post('/auth/login')
      .send({ orgId, email: 'gqltester@example.com' });

    const token = login.body?.accessToken;
    expect(token).toBeTruthy();

    const res = await request(server)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ currentUser { id email displayName } }' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.currentUser).toBeDefined();
    expect(res.body.data.currentUser.email).toBe('gqltester@example.com');
    expect(res.body.data.currentUser.id).toBeTruthy();
  });
});