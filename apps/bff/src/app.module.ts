import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [IdentityModule, AuthModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}