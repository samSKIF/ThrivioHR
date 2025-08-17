export const oidcEnv = () => ({
  enabled: (process.env.OIDC_ENABLED || '').toLowerCase() === 'true',
  issuerUrl: process.env.OIDC_ISSUER_URL || '',
  clientId: process.env.OIDC_CLIENT_ID || '',
  clientSecret: process.env.OIDC_CLIENT_SECRET || '',
  redirectUri: process.env.OIDC_REDIRECT_URI || '',
  scopes: (process.env.OIDC_SCOPES || 'openid profile email').split(/\s+/).filter(Boolean),
  webBaseUrl: process.env.WEB_APP_BASE_URL || 'http://localhost:3000',
});