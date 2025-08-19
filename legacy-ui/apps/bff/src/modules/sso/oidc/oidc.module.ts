import { Module } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { OidcController } from './oidc.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({ 
  imports: [AuthModule],
  providers: [OidcService], 
  controllers: [OidcController] 
})
export class OidcModule {}