import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('auth')
export class LogoutController {
  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res.redirect('/login');
  }
}