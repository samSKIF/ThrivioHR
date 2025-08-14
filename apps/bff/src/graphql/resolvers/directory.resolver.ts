import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { IdentityRepository } from '../../modules/identity/identity.repository';

@Resolver('Employee')
@UseGuards(JwtAuthGuard)
export class DirectoryResolver {
  constructor(private readonly repo: IdentityRepository) {}

  @Query('listEmployees')
  async listEmployees(
    _: unknown,
    args: { orgId: string; limit?: number; cursor?: string },
  ) {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const rows = await this.repo.listUsersByOrg(args.orgId, limit, args.cursor ?? null);
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      displayName: r.displayName ?? null,
    }));
  }

  @Query('getEmployee')
  async getEmployee(_: unknown, args: { id: string }) {
    const u = await this.repo.getUserById(args.id);
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      displayName: u.displayName ?? null,
    };
  }
}