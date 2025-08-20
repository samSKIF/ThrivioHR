import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OidcService } from './oidc.service';

@Controller('oidc')
export class OidcController {
  constructor(private readonly svc: OidcService) {}

  @Get('authorize')
  authorize(@Res() res: Response) {
    try {
      const url = this.svc.buildAuthorizeUrl();
      return res.redirect(url);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('oidc_disabled')) {
        return res.status(503).json({ error: 'OIDC disabled' });
      }
      if (msg.startsWith('missing_')) {
        return res.status(503).json({ error: 'OIDC misconfigured', detail: msg });
      }
      return res.status(500).json({ error: 'authorize_failed' });
    }
  }
}