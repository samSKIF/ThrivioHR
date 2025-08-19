import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { IdentityResolver } from '../src/graphql/resolvers/identity.resolver';
import { IdentityService } from '../src/modules/identity/identity.service';

describe('currentUser (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;

  beforeAll(async () => {
    const mockIdentityService = {
      // Mock methods if needed
    };

    const modRef = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
          context: ({ req }) => ({ req }),
        }),
      ],
      providers: [
        IdentityResolver,
        { provide: IdentityService, useValue: mockIdentityService },
      ],
    }).compile();
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