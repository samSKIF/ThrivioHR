# OIDC Setup (Okta Dev)
- Create Web App (confidential client), scopes: openid profile email
- Redirect URI: http://localhost:5000/sso/oidc/callback
- Assign a test user
- Capture Issuer, Client ID, Client Secret
- Set apps/bff/.env.local accordingly and run `pnpm dev`
- Acceptance: login via SSO lands back in app and `{ currentUser }` resolves

# Alt: Auth0 quick notes
- Regular Web App
- Domain = Issuer
- Same redirect, scopes, and env vars

# Troubleshooting
- 302 from /sso/oidc/start → Location should be IdP /authorize URL
- Mismatched redirect URI → fix in IdP config or env
- Empty email in claims → map `email` in IdP and consent