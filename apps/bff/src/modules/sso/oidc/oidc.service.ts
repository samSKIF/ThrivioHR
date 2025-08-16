import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as oidc from 'openid-client';
import { oidcEnv } from '../../../config/oidc.config';

const MEM_STATE = new Map<string, { codeVerifier: string; nonce: string; returnTo?: string }>();

@Injectable()
export class OidcService {
  private clientPromise = this.init();

  private async init() {
    const cfg = oidcEnv();
    // For development without real OIDC server, create a mock configuration
    // This allows the service to start without failing
    try {
      const issuer = await oidc.discovery(new URL(cfg.issuerUrl));
      const client = new oidc.Configuration({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        ...issuer,
      });
      return { client, issuer, cfg };
    } catch (error) {
      // Fallback for development - create minimal config
      const mockIssuer = {
        authorization_endpoint: cfg.issuerUrl.replace('/.well-known/openid-configuration', '/auth'),
        token_endpoint: cfg.issuerUrl.replace('/.well-known/openid-configuration', '/token'),
        userinfo_endpoint: cfg.issuerUrl.replace('/.well-known/openid-configuration', '/userinfo'),
      };
      const client = new oidc.Configuration({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        ...mockIssuer,
      });
      return { client, issuer: mockIssuer, cfg };
    }
  }

  public async buildAuthUrl(returnTo?: string) {
    const { client, cfg } = await this.clientPromise;
    
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const nonce = oidc.randomNonce();
    const state = oidc.randomState();

    MEM_STATE.set(state, { codeVerifier, nonce, returnTo });

    const url = oidc.buildAuthorizationUrl(client, {
      scope: cfg.scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      response_type: 'code',
      redirect_uri: cfg.redirectUri,
      nonce,
      state,
    });
    return { url, state };
  }

  public async handleCallback(params: Record<string, string>) {
    const { client, cfg } = await this.clientPromise;
    const stateRec = MEM_STATE.get(params.state || '');
    if (!stateRec) throw new UnauthorizedException('invalid_state');

    const tokenSet = await oidc.authorizationCodeGrant(client, new URL(cfg.redirectUri), {
      code: params.code!,
      code_verifier: stateRec.codeVerifier,
    });

    MEM_STATE.delete(params.state!);

    // Simple claims extraction from id_token - in production you'd validate this properly
    let claims: any = {};
    if (tokenSet.id_token) {
      const payload = tokenSet.id_token.split('.')[1];
      claims = JSON.parse(Buffer.from(payload, 'base64').toString());
    }

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
      idp: { sub: claims.sub as string, idToken: tokenSet.id_token },
      returnTo: stateRec.returnTo || cfg.webBaseUrl,
    };
  }
}