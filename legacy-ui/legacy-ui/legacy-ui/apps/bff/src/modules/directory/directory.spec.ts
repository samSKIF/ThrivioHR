import { createTestApp } from '../../../main';
import request from 'supertest';

describe('Directory Module', () => {
  it('should validate a CSV upload', async () => {
    const app = await createTestApp();
    // login first
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ orgId: '9e2e7679-e33e-4cbe-9edc-195f13e9f909', email: 'csvdemo@example.com' });
    const token = login.body.accessToken;
    const csv = 'email,givenName,familyName\njohn@example.com,John,Doe';

    const res = await request(app.getHttpServer())
      .post('/directory/import/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ csv });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('rows');
    expect(res.body).toHaveProperty('valid');
  });
});