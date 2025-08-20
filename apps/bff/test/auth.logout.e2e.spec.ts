import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../src/main';

describe('Auth logout (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => { if (app) await app.close(); });

  it('clears sid cookie and redirects to /login', async () => {
    app = await createTestApp(); await app.init();
    const server = app.getHttpServer();
    const res = await request(server).get('/auth/logout');
    expect([302,307]).toContain(res.status);
    const set = res.headers['set-cookie']?.[0] || '';
    expect(set).toMatch(/sid=;/);
    expect(res.headers.location).toBe('/login');
  });
});