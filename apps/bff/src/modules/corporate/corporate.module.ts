import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CorporateController } from './corporate.controller';
import { CorporateService } from './corporate.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
    PassportModule,
  ],
  controllers: [AuthController, CorporateController],
  providers: [AuthService, CorporateService, JwtStrategy],
})
export class CorporateModule {}