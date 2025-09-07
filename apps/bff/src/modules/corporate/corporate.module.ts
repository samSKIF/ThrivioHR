import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CorporateController } from './corporate.controller';
import { CorporateService } from './corporate.service';

@Module({
  imports: [
    // Only use JWT_SECRET from environment; no fallback
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController, CorporateController],
  providers: [AuthService, CorporateService],
})
export class CorporateModule {}