import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { BffGraphqlModule } from './graphql/graphql.module';
import { OidcModule } from './modules/sso/oidc/oidc.module';

@Module({
  imports: [IdentityModule, AuthModule, DirectoryModule, BffGraphqlModule, OidcModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}