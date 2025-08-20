// apps/bff/src/modules/sso/oidc/oidc.controller.ts
import { Controller, Get, Res, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { OidcService } from './oidc.service';

@Controller('oidc')
export class OidcController {
  constructor(private readonly svc: OidcService) {}

  @Get('authorize')
  async authorize(@Res() res: Response) {
    try {
      const url = await this.svc.buildAuthorizeUrl();
      return res.redirect(url);
    } catch (e) {
      throw new HttpException(
        (e as Error).message || 'OIDC unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}