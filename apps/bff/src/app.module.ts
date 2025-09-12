import { DebugRoutesController } from './dev/debug-routes.controller';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LogoutController } from './modules/auth/logout.controller';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { BffGraphqlModule } from './graphql/graphql.module';
import { OidcModule } from './modules/sso/oidc/oidc.module';
import { CorporateModule } from './modules/corporate/corporate.module';
import { ImportModule } from './modules/import/import.module';

@Module({
  imports: [
    HealthModule,
    IdentityModule,
    AuthModule,
    DirectoryModule,
    BffGraphqlModule,
    OidcModule,
    CorporateModule,
    ImportModule
  ],
  controllers: [AppController, LogoutController, DebugRoutesController],
})
export class AppModule {}