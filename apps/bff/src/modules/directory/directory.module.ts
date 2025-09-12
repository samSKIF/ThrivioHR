import { Module, forwardRef } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { IdentityModule } from '../identity/identity.module';
import { IdentityRepository } from '../identity/identity.repository';
import { DbModule } from '../db/db.module';
import { OrgSqlContext } from '../../db/with-org';

@Module({
  imports: [forwardRef(() => IdentityModule), DbModule],
  controllers: [DirectoryController],
  providers: [
    {
      provide: DirectoryService,
      useFactory: (identityRepo: IdentityRepository) => {
        return new DirectoryService(identityRepo);
      },
      inject: [IdentityRepository],
    },
    OrgSqlContext
  ],
  exports: [DirectoryService, OrgSqlContext],
})
export class DirectoryModule {}