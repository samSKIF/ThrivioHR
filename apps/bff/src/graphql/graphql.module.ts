// apps/bff/src/graphql/graphql.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { loadContractSDL } from './schema-loader';
import { makeValidationRules } from './limits';

// Export for use in tests
export { loadContractSDL };

// resolvers & modules already present in your file:
import { IdentityResolver } from './resolvers/identity.resolver';
import { DirectoryResolver } from './resolvers/directory.resolver';
import { IdentityModule } from '../modules/identity/identity.module';
import { DirectoryModule } from '../modules/directory/directory.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Load SDL directly; avoids fragile path globs in all environments.
      typeDefs: loadContractSDL(),
      path: '/graphql',
      // keep your existing settings (playground/introspection toggles etc.)
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      validationRules: makeValidationRules(),
    }),
    IdentityModule,
    DirectoryModule,
  ],
  providers: [IdentityResolver, DirectoryResolver],
})
export class BffGraphqlModule {}