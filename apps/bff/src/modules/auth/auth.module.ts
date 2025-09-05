import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IdentityModule } from '../identity/identity.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [forwardRef(() => IdentityModule), DbModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
