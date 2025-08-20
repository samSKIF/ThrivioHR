import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../src/main';

describe('/me after OIDC offline callback', () => {
  let app: INestApplication;
  afterEach(async () => {
    if (app) await app.close();
    delete process.env.OIDC_ENABLED;
    delete process.env.OIDC_OFFLINE_CALLBACK;
    delete process.env.JWT_SECRET;
  });

  it('returns me JSON with cookie', async () => {
    process.env.OIDC_ENABLED = 'true';
    process.env.OIDC_OFFLINE_CALLBACK = 'true';
    process.env.JWT_SECRET = 'dev-secret';

    app = await createTestApp();
    // Apply cookie-to-Authorization middleware for dev mode
    app.use((req, _res, next) => {
      if ((process.env.NODE_ENV || '') !== 'production') {
        const cookie = req.headers.cookie || '';
        const m = /(?:^|;)\s*sid=([^;]+)/.exec(cookie);
        if (m && !req.headers.authorization) {
          req.headers.authorization = `Bearer ${m[1]}`;
        }
      }
      next();
    });
    await app.init();
    const server = app.getHttpServer();

    const cb = await request(server).get('/oidc/callback?code=fake');
    const cookie = cb.headers['set-cookie']?.[0];
    expect([302,307]).toContain(cb.status);
    expect(cookie).toMatch(/sid=/);

    const me = await request(server).get('/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.sub).toBe('dev-user-1');
    expect(me.body.email).toBe('dev.user@example.com');
  });
});