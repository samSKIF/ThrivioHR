import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('currentUser (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modRef.createNestApplication();
    await app.init();

    // Build a real HS256 token with the same secret used in tests
    jwt = new JwtService({ secret: process.env.JWT_SECRET || 'dev-secret' });
    token = await jwt.signAsync(
      { sub: 'dev-user-1', email: 'dev.user@example.com' },
      { algorithm: 'HS256', expiresIn: '5m' }
    );
  });

  afterAll(async () => { await app.close(); });

  it('returns currentUser when Authorization token is present', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: '{ currentUser { id email displayName } }' });

    expect(res.status).toBe(200);
    expect(res.body?.data?.currentUser?.email).toBe('dev.user@example.com');
    expect(res.body?.errors).toBeUndefined();
  });
});