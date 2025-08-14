import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
// Note: depth/complexity imports will be handled with basic plugins for now
import { IdentityResolver } from './resolvers/identity.resolver';
import { DirectoryResolver } from './resolvers/directory.resolver';
import { IdentityModule } from '../modules/identity/identity.module';
import { DirectoryModule } from '../modules/directory/directory.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['/home/runner/workspace/packages/contracts/src/graphql/schema.graphql'],
      path: '/graphql',
      context: ({ req }) => ({ req }),
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      // Basic depth/complexity protection
      // validationRules: [depthLimit(8)], // Enable when graphql-depth-limit is installed
      // plugins: [costAnalysis({ maximumCost: 1000 })], // Enable when graphql-cost-analysis is installed
    }),
    IdentityModule,
    DirectoryModule,
  ],
  providers: [IdentityResolver, DirectoryResolver],
})
export class BffGraphqlModule {}