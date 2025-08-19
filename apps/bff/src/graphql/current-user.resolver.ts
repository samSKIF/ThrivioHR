import { Query, Resolver } from '@nestjs/graphql';
import { User } from './user.type';

@Resolver(() => User)
export class CurrentUserResolver {
  // Dev stub: returns a deterministic user (replace with real auth later)
  @Query(returns => User)
  currentUser(): User {
    return {
      id: 'dev-user-1',
      email: 'dev.user@example.com',
      displayName: 'Dev User',
    };
  }
}