// apps/bff/src/modules/sso/oidc/oidc.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private get enabled() { return process.env.OIDC_ENABLED === 'true'; }

  // Lazy loader to avoid build-time import issues
  private async loadClient() {
    if (!this.enabled) throw new Error('OIDC disabled');
    // Dynamically import to avoid type/shape issues at build time
    // We only resolve this at runtime when enabled.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const oc = await import('openid-client'); // do not destructure at import
    const Issuer = (oc as any).Issuer;
    const generators = (oc as any).generators;
    if (!Issuer || !generators) {
      throw new Error('openid-client API not available (check version/config)');
    }
    return { Issuer, generators };
  }

  async getAuthUrl(): Promise<string> {
    if (!this.enabled) {
      this.logger.warn('OIDC disabled; returning placeholder auth URL');
      return '/auth/disabled';
    }
    const { Issuer, generators } = await this.loadClient();
    // NOTE: Provider discovery/config should be moved to config service.
    const issuer = await Issuer.discover(process.env.OIDC_ISSUER!);
    const client = new issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID!,
      client_secret: process.env.OIDC_CLIENT_SECRET!,
      redirect_uris: [process.env.OIDC_REDIRECT_URI!],
      response_types: ['code'],
    });
    const state = generators.state();
    const nonce = generators.nonce();
    return client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
    });
  }

  // Add other methods similarly guarded with `this.enabled`.
}