// apps/bff/src/graphql/graphql.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { loadContractSDL } from './schema-loader';
import { makeValidationRules } from './limits';
import { formatGraphQLError } from './error-format';

// Export for use in tests
export { loadContractSDL };

// resolvers & modules already present in your file:
import { IdentityResolver } from './resolvers/identity.resolver';
import { DirectoryResolver } from './resolvers/directory.resolver';
import { CurrentUserResolver } from './current-user.resolver';
import { IdentityModule } from '../modules/identity/identity.module';
import { DirectoryModule } from '../modules/directory/directory.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Combine contract SDL with a tiny dev-only extension for currentUser
      typeDefs: (() => {
        const sdl = loadContractSDL() as any;
        const devSDL = /* GraphQL */ `
          type CurrentUser {
            id: ID!
            email: String!
            displayName: String!
          }
          extend type Query {
            currentUser: CurrentUser!
          }
        `;
        return ([] as any[]).concat(sdl, devSDL);
      })(),
      path: '/graphql',
      context: ({ req, res }) => ({ req, res }),
      formatError: (err) => formatGraphQLError(err, process.env.NODE_ENV),
      // keep your existing settings (playground/introspection toggles etc.)
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      validationRules: makeValidationRules(),
    }),
    IdentityModule,
    DirectoryModule,
  ],
  providers: [IdentityResolver, DirectoryResolver, CurrentUserResolver],
})
export class BffGraphqlModule {}