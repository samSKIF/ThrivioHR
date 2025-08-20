import { Controller, Get, Res, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { OidcService } from './oidc.service';

@Controller('oidc')
export class OidcController {
  constructor(@Inject(OidcService) private readonly svc: OidcService) {}

  @Get('authorize')
  authorize(@Res() res: Response) {
    try {
      const url = this.svc.buildAuthorizeUrl();
      return res.redirect(url);
    } catch (e: any) {
      const msg = String(e?.message || '');
      const nonProd = (process.env.NODE_ENV || '') !== 'production';
      if (msg.includes('oidc_disabled')) return res.status(503).json({ error: 'OIDC disabled' });
      if (msg.startsWith('missing_')) return res.status(503).json({ error: 'OIDC misconfigured', detail: nonProd ? msg : undefined });
      return res.status(500).json({ error: 'authorize_failed', detail: nonProd ? msg : undefined });
    }
  }

  @Get('debug')
  debug(@Res() res: Response) {
    if ((process.env.NODE_ENV || '') === 'production') return res.status(403).json({ error: 'forbidden' });
    return res.status(200).json(this.svc.snapshot());
  }
}