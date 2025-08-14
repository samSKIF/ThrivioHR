import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../main';

describe('GraphQL E2E', () => {
  let app: INestApplication;
  let http: request.SuperTest<request.Test>;
  let orgId: string;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();                // <- ensure proper init
    http = request(app.getHttpServer());

    // seed org (idempotent)
    const orgRes = await http.post('/orgs')
      .set('content-type', 'application/json')
      .send({ name: `Test Org ${Date.now()}` });
    expect(orgRes.status).toBeLessThan(400);
    orgId = orgRes.body?.id ?? orgRes.body?.data?.id;

    // seed a unique user for login to avoid unique-email collisions
    const email = `gqltest-${Date.now()}@example.com`;
    await http.post('/users')
      .set('content-type', 'application/json')
      .send({
        orgId,
        email,
        givenName: 'Graph',
        familyName: 'QL',
      });

    // login to get real JWT
    const loginRes = await http.post('/auth/login')
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
    const res = await http.post('/graphql')
      .set('content-type', 'application/json')
      .send({ query: '{ currentUser { id email } }' });

    // GraphQL typically returns 200 with errors array for auth failures
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors).toHaveLength(1);
    const text = JSON.stringify(res.body);
    expect(text.toLowerCase()).toContain('unauthorized');
  });

  it('accepts authenticated GraphQL requests', async () => {
    const res = await http.post('/graphql')
      .set('content-type', 'application/json')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ query: '{ currentUser { id email } }' });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.currentUser).toBeDefined();
    expect(res.body.data.currentUser.id).toBeTruthy();
  });
});