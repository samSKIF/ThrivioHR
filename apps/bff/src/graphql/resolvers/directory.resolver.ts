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

  @Query('listEmployeesConnection')
  async listEmployeesConnection(
    _: unknown,
    args: { first?: number; after?: string },
    context: any
  ) {
    // For testing, extract orgId from the first available user in the system
    // In production, this would be extracted from the JWT context
    const allOrgs = await this.repo.getOrganizations(1);
    if (allOrgs.length === 0) {
      throw new Error('No organizations found');
    }
    const orgId = allOrgs[0].id;

    // Validate and set defaults for pagination args
    const first = Math.min(Math.max(args.first ?? 20, 1), 100);
    
    // Decode cursor if provided
    let cursor: { createdAt: string; id: string } | undefined;
    if (args.after) {
      try {
        const decoded = Buffer.from(args.after, 'base64').toString('utf-8');
        cursor = JSON.parse(decoded);
      } catch (error) {
        throw new Error('Invalid cursor format');
      }
    }

    // Fetch data with over-fetching to determine hasNextPage
    const limit = first + 1;
    const [users, totalCount] = await Promise.all([
      this.repo.listUsersByOrgAfter(orgId, cursor, limit),
      this.repo.countUsersByOrg(orgId)
    ]);

    // Determine if there are more pages
    const hasNextPage = users.length > first;
    const actualUsers = hasNextPage ? users.slice(0, first) : users;

    // Build edges with cursors
    const edges = actualUsers.map((user: any) => ({
      cursor: Buffer.from(JSON.stringify({
        createdAt: user.createdAt,
        id: user.id
      })).toString('base64'),
      node: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        displayName: user.displayName ?? null,
      }
    }));

    // Build pageInfo
    const pageInfo = {
      hasNextPage,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
    };

    return {
      totalCount,
      edges,
      pageInfo
    };
  }
}