import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

/**
 * Handles corporate admin authentication endpoints.
 * TODO: add guards and JWT token extraction when implementing.
 */
@Controller('corporate/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.getCurrentAdmin(req);
  }
}