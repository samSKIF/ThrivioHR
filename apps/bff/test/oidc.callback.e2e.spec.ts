import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../src/main';

describe('OIDC /oidc/callback (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
    delete process.env.OIDC_ENABLED;
    delete process.env.OIDC_OFFLINE_CALLBACK;
    delete process.env.JWT_SECRET;
  });

  it('503 when disabled', async () => {
    process.env.OIDC_ENABLED = 'false';
    app = await createTestApp(); await app.init();
    const res = await request(app.getHttpServer()).get('/oidc/callback?code=fake');
    expect(res.status).toBe(503);
  });

  it('302 and cookie when offline mode enabled', async () => {
    process.env.OIDC_ENABLED = 'true';
    process.env.OIDC_OFFLINE_CALLBACK = 'true';
    process.env.JWT_SECRET = 'dev-secret';
    app = await createTestApp(); await app.init();
    const res = await request(app.getHttpServer()).get('/oidc/callback?code=fake');
    expect([302,307]).toContain(res.status);
    expect(res.headers['set-cookie']?.[0]).toMatch(/sid=/);
    expect(res.headers.location).toBe('/me');
  });
});