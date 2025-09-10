import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IdentityService } from '../identity/identity.service';

@Injectable()
export class PasswordResetGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => IdentityService))
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Handle both HTTP and GraphQL contexts
    const isGraphQL = context.getType<'graphql' | 'http'>() === 'graphql';
    const req = isGraphQL 
      ? GqlExecutionContext.create(context).getContext().req 
      : context.switchToHttp().getRequest();
    
    // Get user ID from verified JWT payload set by JwtAuthGuard
    const user = req.user;
    if (!user || !user.sub) {
      // If no authenticated user, let JwtAuthGuard handle this
      return true;
    }
    
    // For HTTP requests, check if this is an allowed endpoint during password reset
    if (!isGraphQL) {
      const path = req.route?.path;
      const method = req.method;
      
      // Use exact path matching to prevent bypass via query params or path fragments
      const allowedRoutes = [
        { path: '/auth/password/policy', method: 'GET' },
        { path: '/auth/password/first-set', method: 'POST' },
        { path: '/auth/me', method: 'GET' },
        { path: '/auth/diag', method: 'GET' }
      ];
      
      const isAllowed = allowedRoutes.some(route => 
        route.path === path && route.method === method
      );
      
      if (isAllowed) {
        return true;
      }
    }
    
    try {
      // Look up the user to check password reset requirement
      const dbUser = await this.identity.findUserById(user.sub);
      
      // Fail-closed: If user not found despite valid JWT, this is a security issue
      if (!dbUser) {
        throw new UnauthorizedException({
          error: 'user_not_found',
          message: 'User account not found'
        });
      }
      
      // If password reset is required, block access to non-password endpoints
      if (dbUser.password_reset_required) {
        throw new UnauthorizedException({
          error: 'password_reset_required',
          message: 'Password must be changed before accessing other features'
        });
      }
    } catch (error) {
      // If it's our error types, re-throw them
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Fail-closed: For database/service errors, deny access for security
      throw new UnauthorizedException({
        error: 'service_error',
        message: 'Unable to verify user access'
      });
    }
    
    return true;
  }
}