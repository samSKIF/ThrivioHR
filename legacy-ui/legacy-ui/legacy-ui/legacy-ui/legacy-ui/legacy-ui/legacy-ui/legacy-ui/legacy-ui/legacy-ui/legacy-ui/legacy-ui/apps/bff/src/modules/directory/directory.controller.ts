import { Body, Controller, Post, UseGuards, Inject } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { ImportValidateDto } from './dtos/import-validate.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('directory')
export class DirectoryController {
  constructor(@Inject(DirectoryService) private readonly svc: DirectoryService) {}

  @UseGuards(JwtAuthGuard)
  @Post('import/validate')
  validate(@Body() dto: ImportValidateDto) {
    return this.svc.validate(dto.csv);
  }
}