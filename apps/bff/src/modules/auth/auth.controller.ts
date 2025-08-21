import { Controller, Post, Get, Body, UseGuards, Request, Inject } from '@nestjs/common';
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
          orgName: org?.name || 'Unknown Organization',
          accountStatus: user.isActive ? 'Active' : 'Inactive',
          ...tokenData  // Include original JWT data for compatibility
        };
      }
      
      // Fallback to token data if user not found in database
      return {
        ...tokenData,
        displayName: tokenData.name,
        firstName: 'Not set',
        lastName: 'Not set',
        orgId: 'Not set',
        orgName: 'Not set',
        accountStatus: 'Active'
      };
    } catch (error) {
      // Fallback to token data on any error
      return {
        ...req.user,
        displayName: req.user.name,
        firstName: 'Not set',
        lastName: 'Not set',
        orgId: 'Not set',
        orgName: 'Not set',
        accountStatus: 'Active'
      };
    }
  }
}