import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { IdentityAdapter } from './adapters/identity.adapter';
import { IdentityModule } from '../identity/identity.module';
import { IDENTITY_PORT } from './ports/identity.port';

@Module({
  imports: [IdentityModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    IdentityAdapter,
    {
      provide: IDENTITY_PORT,
      useExisting: IdentityAdapter,
    },
  ],
  exports: [ImportService],
})
export class ImportModule {}