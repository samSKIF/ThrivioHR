import { Controller, Post, Get, Body, UseGuards, Request, Inject, Response } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IdentityService } from '../identity/identity.service';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(IdentityService) private readonly identityService: IdentityService
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Response({ passthrough: true }) res) {
    const result = await this.authService.login(loginDto);
    
    // Set HTTP-only cookies
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return result;
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    try {
      // Get JWT token data
      const tokenData = req.user;
      
      // Try to fetch full user profile from database by email
      const users = await this.identityService.getUsers({ email: tokenData.email });
      if (users.length > 0) {
        const user = users[0];
        
        // Get organization info
        const orgs = await this.identityService.getOrgs({ id: user.organizationId });
        const org = orgs.length > 0 ? orgs[0] : null;
        
        // Return enriched profile
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          orgId: user.organizationId,
          organizationId: user.organizationId,
          orgName: org?.name || 'Unknown Organization',
          accountStatus: 'Active', // Default status since isActive property not available
          ...tokenData  // Include original JWT data for compatibility
        };
      }
      
      // Fallback to token data if user not found in database
      return {
        ...tokenData,
        displayName: tokenData.name,
        firstName: 'Not set',
        lastName: 'Not set',
        orgId: '9e2e7679-e33e-4cbe-9edc-195f13e9f909',
        organizationId: '9e2e7679-e33e-4cbe-9edc-195f13e9f909',
        orgName: 'Demo Org',
        accountStatus: 'Active'
      };
    } catch (error) {
      // Fallback to token data on any error
      return {
        ...req.user,
        displayName: req.user.name,
        firstName: 'Not set',
        lastName: 'Not set',
        orgId: '9e2e7679-e33e-4cbe-9edc-195f13e9f909',
        organizationId: '9e2e7679-e33e-4cbe-9edc-195f13e9f909',
        orgName: 'Demo Org',
        accountStatus: 'Active'
      };
    }
  }
}