import { Resolver, Query } from '@nestjs/graphql';

@Resolver('CurrentUser')
export class CurrentUserResolver {
  @Query('currentUser')
  currentUser() {
    return {
      id: 'dev-user-1',
      email: 'dev.user@example.com',
      displayName: 'Dev User',
    };
  }
}