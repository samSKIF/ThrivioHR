import request from 'supertest';
import app from '../../../main'; // adjust import if needed

describe('Auth Module', () => {
  it('should login a user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ orgId: '9e2e7679-e33e-4cbe-9edc-195f13e9f909', email: 'csvdemo@example.com' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body).toHaveProperty('user');
  });
});