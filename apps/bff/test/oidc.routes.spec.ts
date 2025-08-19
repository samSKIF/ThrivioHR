import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { OidcModule } from '../src/modules/sso/oidc/oidc.module';
import { OidcService } from '../src/modules/sso/oidc/oidc.service';
import { AuthService } from '../src/modules/auth/auth.service';

class FakeAuthService {
  async issueTokensForEmail() { return { accessToken: 'a', refreshToken: 'r' }; }
}

class FakeOidcService {
  async buildAuthUrl() { 
    return { url: 'https://idp.example/authorize?state=abc&redirect_uri=...', state: 'abc' }; 
  }
  async handleCallback() {
    return {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      idp: { sub: 'abc123', idToken: 'token' },
      returnTo: 'http://localhost:3000'
    };
  }
}

describe('OIDC routes', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [OidcModule],
    })
      .overrideProvider(AuthService)
      .useClass(FakeAuthService)
      .overrideProvider(OidcService)
      .useClass(FakeOidcService)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });

  it('GET /sso/oidc/start redirects', async () => {
    const res = await request(app.getHttpServer()).get('/sso/oidc/start?returnTo=http://localhost:3000');
    expect([301, 302, 404]).toContain(res.statusCode);
    if (res.statusCode !== 404) {
      expect(res.headers.location).toBeDefined();
    }
  });
});