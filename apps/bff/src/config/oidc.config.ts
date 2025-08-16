export const oidcEnv = () => ({
  issuerUrl: process.env.OIDC_ISSUER_URL || 'https://dev-issuer.example.com/.well-known/openid-configuration',
  clientId: process.env.OIDC_CLIENT_ID || 'dev_client_id',
  clientSecret: process.env.OIDC_CLIENT_SECRET || 'dev_client_secret',
  redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:5000/sso/oidc/callback',
  scopes: (process.env.OIDC_SCOPES || 'openid profile email').split(/\s+/),
  webBaseUrl: process.env.WEB_APP_BASE_URL || 'http://localhost:3000',
});