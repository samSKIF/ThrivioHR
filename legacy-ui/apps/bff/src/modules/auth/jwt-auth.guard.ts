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
    const gqlReq = (gqlCtx.getContext?.() as any)?.req;
    const req = httpReq ?? gqlReq;
    const authorization = req?.headers?.authorization;

    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }

    const [bearer, token] = authorization.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      req.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}