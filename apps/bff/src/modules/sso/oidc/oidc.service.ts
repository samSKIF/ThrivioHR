import { Injectable } from '@nestjs/common';

function required(name: string, val?: string) {
  if (!val) throw new Error(`missing_${name}`);
  return val;
}

@Injectable()
export class OidcService {
  private get enabled() {
    return process.env.OIDC_ENABLED === 'true';
  }

  private async getClient() {
    if (!this.enabled) throw new Error('oidc_disabled');
    const oc = await import('openid-client');
    const Issuer = oc.Issuer;
    const generators = oc.generators;
    const issuerUrl = required('OIDC_ISSUER', process.env.OIDC_ISSUER);
    const clientId = required('OIDC_CLIENT_ID', process.env.OIDC_CLIENT_ID);
    const clientSecret = required('OIDC_CLIENT_SECRET', process.env.OIDC_CLIENT_SECRET);
    const redirectUri = required('OIDC_REDIRECT_URI', process.env.OIDC_REDIRECT_URI);

    const issuer = await Issuer.discover(issuerUrl);
    const client = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      response_types: ['code'],
    });
    return { client, generators, redirectUri };
  }

  async buildAuthorizeUrl() {
    const { client, generators } = await this.getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    return client.authorizationUrl({ scope: 'openid email profile', state, nonce });
  }
}