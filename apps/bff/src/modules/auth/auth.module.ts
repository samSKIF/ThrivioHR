import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DbModule } from '../db/db.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [DbModule, IdentityModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}