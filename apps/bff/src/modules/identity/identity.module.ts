import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { IdentityRepository } from './identity.repository';

@Module({
  imports: [DbModule],
  controllers: [IdentityController],
  providers: [
    IdentityRepository,
    {
      provide: IdentityService,
      useClass: IdentityService,
    },
  ],
  exports: [IdentityRepository, IdentityService],
})
export class IdentityModule {}