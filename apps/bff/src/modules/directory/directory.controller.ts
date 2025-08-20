import { Body, Controller, Get, Post, Query, Req, UseGuards, BadRequestException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DirectoryService } from './directory.service';
import { ImportValidateDto } from './dtos/import-validate.dto';
import { ImportCommitDto } from './dtos/import-commit.dto';
import { ImportSessionCreateDto, ImportSessionApproveDto, ImportSessionRejectDto } from './dtos/import-session.dto';

@Controller('directory')
export class DirectoryController {
  constructor(@Inject(DirectoryService) private readonly svc: DirectoryService) {}

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