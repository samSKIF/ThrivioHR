import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';
import { DirectoryModule } from './modules/directory/directory.module';
import { BffGraphqlModule } from './graphql/graphql.module';
import { OidcModule } from './modules/sso/oidc/oidc.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CurrentUserResolver } from './graphql/current-user.resolver';

@Module({
  imports: [
    HealthModule, 
    IdentityModule, 
    AuthModule, 
    DirectoryModule, 
    BffGraphqlModule, 
    OidcModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
    })
  ],
  controllers: [AppController],
  providers: [CurrentUserResolver],
})
export class AppModule {}