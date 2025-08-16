import { OidcService } from '../src/modules/sso/oidc/oidc.service';
import * as oidc from 'openid-client';

jest.mock('openid-client', () => {
  const generators = {
    codeVerifier: () => 'cv',
    codeChallenge: () => 'cc',
    nonce: () => 'nonce',
    state: () => 'STATE123',
  };
  
  class MockConfiguration {
    constructor(public config: any) {}
  }
  
  return {
    randomPKCECodeVerifier: () => 'cv',
    calculatePKCECodeChallenge: async () => 'cc',
    randomNonce: () => 'nonce',
    randomState: () => 'STATE123',
    buildAuthorizationUrl: () => 'https://idp.example/authorize?...',
    authorizationCodeGrant: async () => ({
      id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhYmMxMjMiLCJlbWFpbCI6ImphbmUuZG9lQGV4YW1wbGUuY29tIiwiZ2l2ZW5fbmFtZSI6IkphbmUiLCJmYW1pbHlfbmFtZSI6IkRvZSIsIm5hbWUiOiJKYW5lIERvZSJ9.fake_signature'
    }),
    discovery: async () => ({
      authorization_endpoint: 'https://idp.example/authorize',
      token_endpoint: 'https://idp.example/token',
    }),
    Configuration: MockConfiguration,
  };
});

// Mock environment
process.env.OIDC_ISSUER_URL = 'https://idp.example';
process.env.OIDC_CLIENT_ID = 'cid';
process.env.OIDC_CLIENT_SECRET = 'secret';
process.env.OIDC_REDIRECT_URI = 'http://localhost:5000/sso/oidc/callback';
process.env.OIDC_SCOPES = 'openid profile email';
process.env.WEB_APP_BASE_URL = 'http://localhost:3000';

describe('OidcService', () => {
  it('extracts profile from token claims', async () => {
    const svc = new OidcService();
    const auth = await svc.buildAuthUrl('http://localhost:3000');
    expect(auth.url).toContain('https://');

    // simulate callback with mocked state
    const profile = await svc.handleCallback({ state: 'STATE123', code: 'xyz' });
    expect(profile.email).toBe('jane.doe@example.com');
    expect(profile.displayName).toBe('Jane Doe');
    expect(profile.returnTo).toBe('http://localhost:3000');
  });
});