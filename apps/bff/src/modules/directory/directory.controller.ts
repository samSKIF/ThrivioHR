import { Body, Controller, Get, Post, Put, Delete, Query, Req, UseGuards, BadRequestException, Inject, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DirectoryService } from './directory.service';
import { IdentityService } from '../identity/identity.service';
import { ImportValidateDto } from './dtos/import-validate.dto';
import { ImportCommitDto } from './dtos/import-commit.dto';
import { ImportSessionCreateDto, ImportSessionApproveDto, ImportSessionRejectDto } from './dtos/import-session.dto';

@Controller('directory')
export class DirectoryController {
  constructor(
    @Inject(DirectoryService) private readonly svc: DirectoryService,
    @Inject(IdentityService) private readonly identity: IdentityService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getUsers(@Query('orgId') orgId: string, @Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    if (!orgId) throw new BadRequestException('orgId is required');
    
    const users = await this.identity.getUsersByOrg(orgId, parsedLimit);
    return { users, nextCursor: null }; // Simple response for now
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  async getSubscription(@Query('orgId') orgId: string) {
    if (!orgId) throw new BadRequestException('orgId is required');
    
    return this.svc.getOrganizationSubscription(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('departments')
  async getDepartments(@Query('orgId') orgId: string) {
    if (!orgId) throw new BadRequestException('orgId is required');
    
    return this.svc.getOrganizationDepartments(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('departments')
  async createDepartment(@Body() dto: { name: string; color: string }, @Req() req: { user: Record<string, unknown> }) {
    const orgId = req.user?.orgId as string;
    if (!dto.name || !dto.color) throw new BadRequestException('name and color are required');
    
    return this.svc.createDepartment(orgId, dto.name, dto.color);
  }

  @UseGuards(JwtAuthGuard)
  @Put('departments/:id')
  async updateDepartment(@Param('id') id: string, @Body() dto: { name: string; color: string }, @Req() req: { user: Record<string, unknown> }) {
    const orgId = req.user?.orgId as string;
    if (!dto.name || !dto.color) throw new BadRequestException('name and color are required');
    
    return this.svc.updateDepartment(id, orgId, dto.name, dto.color);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('departments/:id')
  async deleteDepartment(@Param('id') id: string, @Req() req: { user: Record<string, unknown> }) {
    const orgId = req.user?.orgId as string;
    
    return this.svc.deleteDepartment(id, orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/validate')
  validate(@Body() dto: ImportValidateDto) {
    return this.svc.validate(dto.csv);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/plan')
  plan(@Body() dto: ImportValidateDto) {
    return this.svc.plan(dto.csv);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/commit')
  async commit(@Body() dto: ImportCommitDto, @Req() req: { user: Record<string, unknown> }) {
    if (!dto?.dryRun) {
      throw new BadRequestException('Writes not implemented yet; use dryRun=true.');
    }
    const orgId = req.user?.orgId as string;
    return this.svc.commitPlan(dto.csv, orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/session')
  async createSession(@Body() dto: ImportSessionCreateDto, @Req() req: { user: Record<string, unknown> }) {
    const orgId = req.user?.orgId as string; 
    const userId = req.user?.sub as string;
    if (!dto?.csv) throw new BadRequestException('csv is required');
    return this.svc.createImportSession(dto.csv, orgId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('import/session/preview')
  preview(@Query('token') token: string) {
    if (!token) throw new BadRequestException('token is required');
    return this.svc.previewImportSession(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/session/approve')
  async approve(@Body() dto: ImportSessionApproveDto, @Req() req: { user: Record<string, unknown> }) {
    if (!dto?.token) throw new BadRequestException('token is required');
    const orgId = req.user?.orgId as string;
    return this.svc.applyImportSession(dto.token, orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/session/reject')
  reject(@Body() dto: ImportSessionRejectDto) {
    if (!dto?.token) throw new BadRequestException('token is required');
    return { status: 'rejected' };
  }
}