# Replit Secrets — ThrivioHR

## Required (Dev)
- `OIDC_ENABLED` = `true`
- `OIDC_ISSUER` = `https://accounts.google.com`
- `OIDC_CLIENT_ID` = `<your-dev-client-id>`
- `OIDC_CLIENT_SECRET` = `<your-dev-client-secret>`
- `OIDC_REDIRECT_URI` = `http://127.0.0.1:5000/oidc/callback`
- `OIDC_AUTHORIZATION_ENDPOINT` = `https://accounts.google.com/o/oauth2/v2/auth`
- `JWT_SECRET` = `dev-secret` (rotate for real envs)

**Do NOT** append anything to `OIDC_AUTHORIZATION_ENDPOINT`. Known-bad example:
`https://accounts.google.com/o/oauth2/v2/authOIDC_OFFLINE_CALLBACK=true`  ← ❌

## Verify
1) Start BFF with `.env` disabled so Secrets are the only source:
   `DOTENV_DISABLE=true npx nx run bff:dev`
2) `curl -sSI http://127.0.0.1:5000/oidc/authorize`  
   The `Location:` must start with:
   `https://accounts.google.com/o/oauth2/v2/auth`

If it contains `OIDC_OFFLINE_CALLBACK=true` or any stray tokens, fix the Secret.