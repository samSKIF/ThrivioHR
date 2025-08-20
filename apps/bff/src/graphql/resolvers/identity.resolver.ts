import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { IdentityService } from '../../modules/identity/identity.service';
import { Request } from 'express';

@Resolver('User')
@UseGuards(JwtAuthGuard)
export class IdentityResolver {
  constructor(private readonly identity: IdentityService) {}
  @Query('currentUser')
  async currentUser(_: unknown, __: unknown, ctx: { req: Request }) {
    // JwtAuthGuard already validated; claims are in req.user
    const claims = (ctx.req as { user?: Record<string, unknown> }).user ?? null;
    if (!claims) return null;
    
    // For now, return JWT claims data since identity service doesn't have getUserById method
    // TODO: Add getUserById method to identity service for fresh database lookup
    
    return {
      id: claims.sub,
      email: claims.email ?? '',
      firstName: claims.givenName ?? claims.firstName ?? null,
      lastName: claims.familyName ?? claims.lastName ?? null,
      displayName: claims.displayName ?? null,
    };
  }
}