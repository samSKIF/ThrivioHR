import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../src/main';

describe('OIDC /oidc/authorize (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
    // cleanup env
    delete process.env.OIDC_ENABLED;
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_CLIENT_ID;
    delete process.env.OIDC_CLIENT_SECRET;
    delete process.env.OIDC_REDIRECT_URI;
    delete process.env.OIDC_AUTHORIZATION_ENDPOINT;
  });

  it('returns 503 when OIDC is disabled', async () => {
    process.env.OIDC_ENABLED = 'false';
    app = await createTestApp();
    await app.init();

    const res = await request(app.getHttpServer()).get('/oidc/authorize');
    expect(res.status).toBe(503);
    expect(res.body?.error).toBe('OIDC disabled');
  });

  it('returns 302/307 redirect when OIDC is enabled', async () => {
    process.env.OIDC_ENABLED = 'true';
    process.env.OIDC_ISSUER = 'https://accounts.google.com';
    process.env.OIDC_CLIENT_ID = 'dev-dummy';
    process.env.OIDC_REDIRECT_URI = 'http://127.0.0.1:5000/oidc/callback';
    process.env.OIDC_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

    app = await createTestApp();
    await app.init();

    const res = await request(app.getHttpServer()).get('/oidc/authorize');
    expect([302, 307]).toContain(res.status);
    expect(res.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(res.headers.location).toContain('client_id=dev-dummy');
    expect(res.headers.location).toContain('redirect_uri=');
    expect(res.headers.location).toContain('response_type=code');
    expect(res.headers.location).toContain('scope=');
    expect(res.headers.location).toContain('state=');
    expect(res.headers.location).toContain('nonce=');
  });
});