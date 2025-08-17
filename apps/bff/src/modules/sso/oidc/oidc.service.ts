import { Injectable } from '@nestjs/common';
import { generators, Issuer, Client } from 'openid-client';
import { oidcEnv } from '../../../config/oidc.config';

type StateRec = { codeVerifier: string; nonce: string; returnTo?: string };

@Injectable()
export class OidcService {
  private client: Client | null = null;
  private readonly MEM_STATE = new Map<string, StateRec>();

  private isConfigured() {
    const cfg = oidcEnv();
    return cfg.enabled && cfg.issuerUrl && cfg.clientId && cfg.clientSecret && cfg.redirectUri;
  }

  public enabled() {
    return this.isConfigured();
  }

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    const cfg = oidcEnv();
    if (!this.isConfigured()) {
      throw new Error('OIDC_NOT_CONFIGURED');
    }
    const issuer = await Issuer.discover(cfg.issuerUrl);
    this.client = new issuer.Client({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uris: [cfg.redirectUri],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    return this.client;
  }

  public async buildAuthUrl(returnTo?: string) {
    const cfg = oidcEnv();
    const client = await this.getClient();

    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const nonce = generators.nonce();
    const state = generators.state();

    this.MEM_STATE.set(state, { codeVerifier, nonce, returnTo });

    return client.authorizationUrl({
      scope: cfg.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_type: 'code',
      redirect_uri: cfg.redirectUri,
      nonce,
      state,
    });
  }

  public async handleCallback(params: Record<string, string>) {
    const cfg = oidcEnv();
    const client = await this.getClient();
    const rec = this.MEM_STATE.get(params.state || '');
    if (!rec) throw new Error('INVALID_STATE');

    const tokenSet = await client.callback(cfg.redirectUri, params, {
      nonce: rec.nonce,
      state: params.state,
    });

    this.MEM_STATE.delete(params.state!);

    const claims = tokenSet.claims();
    const email = (claims.email as string) || '';
    const firstName = (claims.given_name as string) || '';
    const lastName = (claims.family_name as string) || '';
    const displayName =
      (claims.name as string) || [firstName, lastName].filter(Boolean).join(' ') || email;

    return {
      email,
      firstName,
      lastName,
      displayName,
      idp: { sub: String(claims.sub || ''), idToken: tokenSet.id_token },
      returnTo: rec.returnTo || cfg.webBaseUrl,
    };
  }
}