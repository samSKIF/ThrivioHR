import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialResolver } from './social.resolver';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  providers: [SocialService, SocialResolver],
  exports: [SocialService],
})
export class SocialModule {}