import { Controller, Get, Query, Res, Inject, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { OidcService } from './oidc.service';
import { signUserJwt } from '../../auth/jwt.util';

@Controller('oidc')
export class OidcController {
  constructor(@Inject(OidcService) private readonly svc: OidcService) {}

  @Get('authorize')
  authorize(@Res() res: Response, @Query('origin') origin?: string) {
    try { 
      // In offline mode, determine the correct callback URL based on request origin
      if (process.env.OIDC_OFFLINE_CALLBACK === 'true') {
        // Use provided origin or default to Next.js proxy
        const baseUrl = origin || 'http://localhost:3000';
        const callbackUrl = `${baseUrl}/api/bff/oidc/callback`;
        return res.redirect(this.svc.buildAuthorizeUrl(callbackUrl, origin));
      }
      return res.redirect(this.svc.buildAuthorizeUrl());
    }
    catch (e: any) {
      const msg = String(e?.message || '');
      const nonProd = (process.env.NODE_ENV || '') !== 'production';
      if (msg.includes('oidc_disabled')) return res.status(503).json({ error: 'OIDC disabled' });
      if (msg.startsWith('missing_')) return res.status(503).json({ error: 'OIDC misconfigured', detail: nonProd ? msg : undefined });
      return res.status(500).json({ error: 'authorize_failed', detail: nonProd ? msg : undefined });
    }
  }

  @Get('callback')
  async callback(@Query() q: any, @Res() res: Response, @Headers('referer') referer?: string) {
    try {
      // Offline/dev path
      if (process.env.OIDC_OFFLINE_CALLBACK === 'true') {
        const claims = this.svc.offlineCallback(q);
        const jwt = signUserJwt({ sub: claims.sub, email: claims.email, name: claims.name });
        res.cookie('sid', jwt, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
        
        // Use origin from query params (passed through the flow)
        let redirectUrl = 'http://localhost:3000/me';
        if (q.origin) {
          redirectUrl = `${q.origin}/me`;
        } else if (referer) {
          const refererUrl = new URL(referer);
          redirectUrl = `${refererUrl.origin}/me`;
        } else if (process.env.WEB_PUBLIC_URL) {
          redirectUrl = `${process.env.WEB_PUBLIC_URL.replace(/\/+$/, "")}/me`;
        }
        
        return res.redirect(redirectUrl);
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
    if ((process.env.NODE_ENV || '') === 'production' || process.env.OIDC_DEBUG !== 'true') return res.status(403).json({ error: 'forbidden' });
    return res.status(200).json(this.svc.snapshot());
  }
}