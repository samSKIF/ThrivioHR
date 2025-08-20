import { Controller, Get, Query, Res, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { OidcService } from './oidc.service';
import { signUserJwt } from '../../auth/jwt.util';

@Controller('oidc')
export class OidcController {
  constructor(@Inject(OidcService) private readonly svc: OidcService) {}

  @Get('authorize')
  authorize(@Res() res: Response) {
    try { return res.redirect(this.svc.buildAuthorizeUrl()); }
    catch (e: any) {
      const msg = String(e?.message || '');
      const nonProd = (process.env.NODE_ENV || '') !== 'production';
      if (msg.includes('oidc_disabled')) return res.status(503).json({ error: 'OIDC disabled' });
      if (msg.startsWith('missing_')) return res.status(503).json({ error: 'OIDC misconfigured', detail: nonProd ? msg : undefined });
      return res.status(500).json({ error: 'authorize_failed', detail: nonProd ? msg : undefined });
    }
  }

  @Get('callback')
  async callback(@Query() q: any, @Res() res: Response) {
    try {
      // Offline/dev path
      if (process.env.OIDC_OFFLINE_CALLBACK === 'true') {
        const claims = this.svc.offlineCallback(q);
        const jwt = signUserJwt({ sub: claims.sub, email: claims.email, name: claims.name });
        res.cookie('sid', jwt, { httpOnly: true, sameSite: 'lax' });
        return res.redirect('/me');
      }
      // Future: real token exchange path goes here (networked)
      return res.status(503).json({ error: 'OIDC callback not configured' });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const nonProd = (process.env.NODE_ENV || '') !== 'production';
      if (msg.includes('oidc_disabled')) return res.status(503).json({ error: 'OIDC disabled' });
      if (msg === 'missing_code') return res.status(400).json({ error: 'missing_code' });
      return res.status(500).json({ error: 'callback_failed', detail: nonProd ? msg : undefined });
    }
  }

  @Get('debug')
  debug(@Res() res: Response) {
    if ((process.env.NODE_ENV || '') === 'production') return res.status(403).json({ error: 'forbidden' });
    return res.status(200).json(this.svc.snapshot());
  }
}