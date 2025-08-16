import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { BffGraphqlModule } from './graphql/graphql.module';

@Module({
  imports: [IdentityModule, AuthModule, DirectoryModule, BffGraphqlModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}