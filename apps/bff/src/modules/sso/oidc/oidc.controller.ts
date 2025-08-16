import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { OidcService } from './oidc.service';
import type { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';

@Controller('sso/oidc')
export class OidcController {
  constructor(private readonly oidc: OidcService, private readonly auth: AuthService) {}

  @Get('start')
  async start(@Query('returnTo') returnTo: string | undefined, @Res() res: Response) {
    const { url } = await this.oidc.buildAuthUrl(returnTo);
    res.redirect(url.toString());
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const params = req.query as Record<string, string>;
    const profile = await this.oidc.handleCallback(params);

    // Mint first-party JWT (access/refresh) the same way /auth/login does
    const tokens = await this.auth.issueTokensForEmail(profile.email, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
    });

    // Redirect back to web app - web will call /auth/me or GraphQL currentUser 
    // with attached cookies or Authorization header
    res.redirect(profile.returnTo);
  }
}