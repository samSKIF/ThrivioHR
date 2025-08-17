import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OidcService } from './oidc.service';
import { AuthService } from '../../auth/auth.service';
import { oidcEnv } from '../../../config/oidc.config';

@Controller('sso/oidc')
export class OidcController {
  constructor(private readonly oidc: OidcService, private readonly auth: AuthService) {}

  @Get('start')
  async start(@Query('returnTo') returnTo: string | undefined, @Res() res: Response) {
    const cfg = oidcEnv();
    if (!this.oidc.enabled()) {
      // Don't 500 the user; bounce back to login with a hint
      const back = cfg.webBaseUrl || 'http://localhost:3000';
      return res.redirect(`${back}/login?error=sso_disabled`);
    }
    try {
      const url = await this.oidc.buildAuthUrl(returnTo);
      return res.redirect(url);
    } catch {
      const back = cfg.webBaseUrl || 'http://localhost:3000';
      return res.redirect(`${back}/login?error=sso_unavailable`);
    }
  }

  @Get('callback')
  async callback(@Query() params: Record<string, string>, @Res() res: Response) {
    const cfg = oidcEnv();
    if (!this.oidc.enabled()) {
      const back = cfg.webBaseUrl || 'http://localhost:3000';
      return res.redirect(`${back}/login?error=sso_disabled`);
    }
    try {
      const profile = await this.oidc.handleCallback(params);
      // Mint your first-party tokens (same path as /auth/login)
      await this.auth.issueTokensForEmail(profile.email, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
      });
      return res.redirect(profile.returnTo || cfg.webBaseUrl);
    } catch {
      const back = cfg.webBaseUrl || 'http://localhost:3000';
      return res.redirect(`${back}/login?error=sso_callback_failed`);
    }
  }
}