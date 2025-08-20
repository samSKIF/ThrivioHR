import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

function required(name: string, val?: string) {
  if (!val) throw new Error(`missing_${name}`);
  return val;
}

@Injectable()
export class OidcService {
  private get enabled() {
    return process.env.OIDC_ENABLED === 'true';
  }

  snapshot() {
    const enabled = process.env.OIDC_ENABLED === 'true';
    const issuer = process.env.OIDC_ISSUER || '';
    const clientIdPresent = Boolean(process.env.OIDC_CLIENT_ID);
    const redirectUri = process.env.OIDC_REDIRECT_URI || '';
    const explicitAuthz = process.env.OIDC_AUTHORIZATION_ENDPOINT || '';
    const defaultAuthz =
      issuer.includes('accounts.google.com')
        ? issuer.replace(/\/$/, '') + '/o/oauth2/v2/auth'
        : issuer ? issuer.replace(/\/$/, '') + '/authorize' : '';
    const authzEndpoint = (explicitAuthz || defaultAuthz || '').replace(/\/$/, '');
    return {
      enabled,
      issuer,
      clientIdPresent,
      redirectUri,
      authzEndpoint,
      explicitAuthzUsed: Boolean(explicitAuthz),
      nodeEnv: process.env.NODE_ENV || '',
    };
  }

  private rnd(n = 12) {
    return randomBytes(n).toString('hex');
  }

  /**
   * Build a front-channel authorize URL without network discovery.
   * If OIDC_AUTHORIZATION_ENDPOINT is provided, use it.
   * Otherwise, derive a reasonable default from OIDC_ISSUER.
   */
  buildAuthorizeUrl(): string {
    if (!this.enabled) throw new Error('oidc_disabled');

    const issuer = required('OIDC_ISSUER', process.env.OIDC_ISSUER);
    const clientId = required('OIDC_CLIENT_ID', process.env.OIDC_CLIENT_ID);
    const redirectUri = required('OIDC_REDIRECT_URI', process.env.OIDC_REDIRECT_URI);

    // Prefer explicit endpoint override
    const explicitAuthz = process.env.OIDC_AUTHORIZATION_ENDPOINT;
    // Conservative default: many providers expose /authorize; Google uses /o/oauth2/v2/auth
    const defaultAuthz =
      issuer.includes('accounts.google.com')
        ? `${issuer.replace(/\/$/, '')}/o/oauth2/v2/auth`
        : `${issuer.replace(/\/$/, '')}/authorize`;

    const authzEndpoint = (explicitAuthz || defaultAuthz).replace(/\/$/, '');
    const state = this.rnd();
    const nonce = this.rnd();

    const url = new URL(authzEndpoint);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);

    return url.toString();
  }
}