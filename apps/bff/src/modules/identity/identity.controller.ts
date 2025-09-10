import { Controller, Get, Post, Put, Body, Query, Param, Inject, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { CreateOrgDto } from './dtos/create-org.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class IdentityController {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService
  ) {}

  @Post('orgs')
  async createOrganization(@Body() createOrgDto: CreateOrgDto) {
    return this.identityService.createOrganization(createOrgDto);
  }

  @Get('orgs')
  async getOrganizations(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.identityService.getOrganizations(parsedLimit);
  }

  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.identityService.createUser(createUserDto);
  }

  @Get('users')
  async getUsers(@Query('orgId') orgId: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.identityService.getUsersByOrg(orgId, parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: { user: Record<string, unknown> }) {
    const orgId = req.user?.orgId as string;
    if (!orgId) {
      throw new ForbiddenException('Organization ID is required for this operation');
    }
    return this.identityService.updateUser(id, updateUserDto, orgId);
  }
}