import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * CorporateModule sets up corporate admin APIs under /corporate.
 * It will be extended with additional services and controllers (orgs, subscriptions, wallet) in future iterations.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class CorporateModule {}