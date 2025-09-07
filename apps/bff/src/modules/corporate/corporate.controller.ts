import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorporateService } from './corporate.service';

@Controller('corporate')
export class CorporateController {
  constructor(private readonly corporateService: CorporateService) {}

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
}