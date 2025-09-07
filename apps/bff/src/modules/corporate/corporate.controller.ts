import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorporateService } from './corporate.service';

@Controller('corporate')
export class CorporateController {
  constructor(@Inject(CorporateService) private readonly corporateService: CorporateService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('dashboard')
  async dashboard() {
    return this.corporateService.getDashboardMetrics();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('organizations')
  async organizations() {
    return this.corporateService.listOrganizations();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('organizations')
  async createOrganization(@Body() createOrgDto: {
    organizationName: string;
    industry: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    superuserEmail: string;
    streetAddress: string;
    country: string;
    stateProvince: string;
    city: string;
    zipPostalCode: string;
  }) {
    return this.corporateService.createOrganization(createOrgDto);
  }
}