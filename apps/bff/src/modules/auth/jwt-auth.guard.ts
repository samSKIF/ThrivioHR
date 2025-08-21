import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../env';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = getJwtSecret();
  }

  canActivate(context: ExecutionContext): boolean {
    const gqlCtx = GqlExecutionContext.create(context);
    const httpReq = context.switchToHttp().getRequest();
    const gqlReq = (gqlCtx.getContext?.() as { req?: unknown })?.req;
    const req = httpReq ?? gqlReq;
    
    // Try Authorization header first
    const authorization = req?.headers?.authorization;
    let token: string | undefined;
    
    if (authorization) {
      const [bearer, headerToken] = authorization.split(' ');
      if (bearer === 'Bearer' && headerToken) {
        token = headerToken;
      }
    }
    
    // Fallback to cookie
    if (!token && req?.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('No authorization header or cookie');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      req.user = decoded;
      return true;
    } catch (_error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}