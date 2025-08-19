import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';

describe('Directory module (smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /directory/import/validate without token -> 401', async () => {
    await request(app.getHttpServer())
      .post('/directory/import/validate')
      .set('content-type', 'application/json')
      .send({ csv: 'email,givenName,familyName\nno@token.com,No,Token' })
      .expect(401);
  });
});