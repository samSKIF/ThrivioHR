import { Controller, Post, Body, Get, Req, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('corporate/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    console.log('AuthController constructor - authService:', this.authService);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    console.log('Login method called, authService:', this.authService);
    if (!this.authService) {
      return { error: 'AuthService is undefined' };
    }
    return this.authService.login(email, password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.getCurrentAdmin(req);
  }
}