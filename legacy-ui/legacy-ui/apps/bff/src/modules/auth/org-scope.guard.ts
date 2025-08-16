import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class OrgScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const isGraphQL = ctx.getType<'graphql' | 'http'>() === 'graphql';
    const req = isGraphQL ? GqlExecutionContext.create(ctx).getContext().req : ctx.switchToHttp().getRequest();
    const orgId = req?.user?.orgId;
    if (!orgId) throw new ForbiddenException('Organization scope required');
    // normalize: attach for resolvers/services
    req.orgId = orgId;
    return true;
  }
}