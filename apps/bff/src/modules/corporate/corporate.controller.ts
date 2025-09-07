import { Controller, Get, Post, Put, Body, Param, UseGuards, Inject } from '@nestjs/common';
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

  @UseGuards(AuthGuard('jwt'))
  @Put('organizations/:id')
  async updateOrganization(@Param('id') id: string, @Body() updateOrgDto: {
    organizationName?: string;
    status?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    adminEmail?: string;
    businessActivity?: string;
    streetAddress?: string;
    country?: string;
    stateRegion?: string;
    city?: string;
    zipPostalCode?: string;
  }) {
    return this.corporateService.updateOrganization(id, updateOrgDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('organizations/:id/reset-admin-password')
  async resetAdminPassword(@Param('id') id: string) {
    return this.corporateService.resetAdminPassword(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('organizations/:id/subscription')
  async createSubscription(@Param('id') id: string, @Body() subscriptionDto: {
    paymentDate: string;
    subscriptionPeriod: string;
    subscribedUsers: number;
    pricePerUser: number;
    totalMonthlyAmount: number;
  }) {
    return this.corporateService.createSubscription(id, subscriptionDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('organizations/:id/wallet/credit')
  async creditWallet(@Param('id') id: string, @Body() walletDto: {
    amount: number;
    description: string;
  }) {
    return this.corporateService.creditWallet(id, walletDto);
  }
}