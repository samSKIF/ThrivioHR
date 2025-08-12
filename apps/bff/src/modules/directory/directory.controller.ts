import { Body, Controller, Post, UseGuards, Req, BadRequestException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DirectoryService } from './directory.service';
import { ImportValidateDto } from './dtos/import-validate.dto';
import { ImportCommitDto } from './dtos/import-commit.dto';

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
  async commit(@Body() dto: ImportCommitDto, @Req() req: any) {
    if (!dto?.dryRun) {
      throw new BadRequestException('Writes not implemented yet; use dryRun=true.');
    }
    const orgId = req.user?.orgId;
    return this.svc.commitPlan(dto.csv, orgId);
  }
}