import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FileProcessorService } from './services/file-processor.service';
import { ValidationService } from './services/validation.service';
import { PlanningService } from './services/planning.service';
import { IdentityAdapter } from './adapters/identity.adapter';
import { IdentityModule } from '../identity/identity.module';
import { DbModule } from '../db/db.module';
import { IDENTITY_PORT } from './ports/identity.port';

@Module({
  imports: [IdentityModule, DbModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    FileProcessorService,
    ValidationService,
    PlanningService,
    IdentityAdapter,
    {
      provide: IDENTITY_PORT,
      useExisting: IdentityAdapter,
    },
  ],
  exports: [ImportService, FileProcessorService, ValidationService, PlanningService],
})
export class ImportModule {}