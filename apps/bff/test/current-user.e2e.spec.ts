import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('currentUser (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const modRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modRef.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('returns dev user (schema-first, no auth)', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ currentUser { id email displayName } }' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.currentUser?.email).toContain('@');
  });
});