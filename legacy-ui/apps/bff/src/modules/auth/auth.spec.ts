import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../main';

describe('Auth module (smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/me without token -> 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});