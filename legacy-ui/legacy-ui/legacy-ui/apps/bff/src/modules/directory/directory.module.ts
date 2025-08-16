import { Module, forwardRef } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { IdentityModule } from '../identity/identity.module';
import { DbModule } from '../db/db.module';
import { OrgSqlContext } from '../../db/with-org';

@Module({
  imports: [forwardRef(() => IdentityModule), DbModule],
  controllers: [DirectoryController],
  providers: [DirectoryService, OrgSqlContext],
  exports: [DirectoryService, OrgSqlContext],
})
export class DirectoryModule {}