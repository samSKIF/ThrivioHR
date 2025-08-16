import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}