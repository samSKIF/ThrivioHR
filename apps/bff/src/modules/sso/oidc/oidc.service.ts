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
   * If OIDC_OFFLINE_CALLBACK=true, create a local callback URL for development.
   * Otherwise, use the real OIDC provider endpoint.
   */
  buildAuthorizeUrl(overrideRedirectUri?: string, origin?: string): string {
    if (!this.enabled) throw new Error('oidc_disabled');

    const redirectUri = overrideRedirectUri || required('OIDC_REDIRECT_URI', process.env.OIDC_REDIRECT_URI);

    // In offline mode, redirect directly to callback with a fake code
    if (process.env.OIDC_OFFLINE_CALLBACK === 'true') {
      const fakeCode = this.rnd();
      const fakeState = this.rnd();
      const url = new URL(redirectUri);
      url.searchParams.set('code', fakeCode);
      url.searchParams.set('state', fakeState);
      // Pass origin in state for proper redirect
      if (origin) {
        url.searchParams.set('origin', origin);
      }
      return url.toString();
    }

    // Real OIDC flow for production
    const issuer = required('OIDC_ISSUER', process.env.OIDC_ISSUER);
    const clientId = required('OIDC_CLIENT_ID', process.env.OIDC_CLIENT_ID);

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

  // add at bottom of class
  offlineCallback(params: Record<string, any>) {
    if (process.env.OIDC_ENABLED !== 'true') throw new Error('oidc_disabled');
    if (process.env.OIDC_OFFLINE_CALLBACK !== 'true') throw new Error('offline_disabled');
    // accept any non-empty code; fabricate identity
    const code = String(params.code || '');
    if (!code) throw new Error('missing_code');
    const email = process.env.OIDC_FAKE_EMAIL || 'dev.user@example.com';
    const sub = process.env.OIDC_FAKE_SUB || 'dev-user-1';
    const name = process.env.OIDC_FAKE_NAME || 'Dev User';
    return { sub, email, name };
  }

  /**
   * Legacy compat for older unit tests. When OIDC is disabled, return a disabled URL/state.
   * When enabled, delegate to buildAuthorizeUrl().
   */
  async buildAuthUrl(_returnTo?: string): Promise<{ url: string; state: string }> {
    if (process.env.OIDC_ENABLED !== 'true') {
      return { url: '/auth/disabled', state: 'disabled' };
    }
    // Delegate to the new builder (state is not tracked here in the offline path)
    const url = this.buildAuthorizeUrl();
    return { url, state: 'n/a' };
  }

  /**
   * Legacy compat for older unit tests. When OIDC is disabled, throw disabled error.
   */
  async handleCallback(_params: Record<string, any>): Promise<any> {
    if (process.env.OIDC_ENABLED !== 'true') {
      throw new Error('OIDC disabled');
    }
    // In the current implementation, we use offlineCallback for development
    // This method exists for test compatibility only
    throw new Error('handleCallback not implemented - use offlineCallback for development');
  }
}