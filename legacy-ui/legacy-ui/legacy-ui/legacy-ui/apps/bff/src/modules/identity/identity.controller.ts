import { Controller, Get, Post, Body, Query, Inject } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { CreateOrgDto } from './dtos/create-org.dto';
import { CreateUserDto } from './dtos/create-user.dto';

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
}