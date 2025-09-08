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
    // Redirect to the frontend login page
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:5000';
    return res.redirect(`${frontendUrl}/login`);
  }
}