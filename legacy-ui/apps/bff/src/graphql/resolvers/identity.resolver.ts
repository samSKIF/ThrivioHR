import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Request } from 'express';

@Resolver('User')
@UseGuards(JwtAuthGuard)
export class IdentityResolver {
  @Query('currentUser')
  async currentUser(_: unknown, __: unknown, ctx: { req: Request }) {
    // JwtAuthGuard already validated; claims are in req.user
    const claims: any = (ctx.req as any).user ?? null;
    if (!claims) return null;
    // Minimal shape matching schema.graphql
    return {
      id: claims.sub,
      email: claims.email ?? '',
      firstName: claims.givenName ?? claims.firstName ?? null,
      lastName: claims.familyName ?? claims.lastName ?? null,
      displayName: claims.displayName ?? null,
    };
  }
}