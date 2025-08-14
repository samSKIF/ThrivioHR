import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { IdentityResolver } from './resolvers/identity.resolver';
import { DirectoryResolver } from './resolvers/directory.resolver';
import { IdentityModule } from '../modules/identity/identity.module';
import { DirectoryModule } from '../modules/directory/directory.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(__dirname, '*.graphql')],
      path: '/graphql',
      context: ({ req }) => ({ req }),
    }),
    IdentityModule,
    DirectoryModule,
  ],
  providers: [IdentityResolver, DirectoryResolver],
})
export class BffGraphqlModule {}