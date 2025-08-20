import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { OrgScopeGuard } from '../../modules/auth/org-scope.guard';
import { DirectoryService } from '../../modules/directory/directory.service';
import { OrgSqlContext } from '../../db/with-org';

@Resolver('Employee')
@UseGuards(JwtAuthGuard, OrgScopeGuard)
export class DirectoryResolver {
  constructor(
    private readonly directoryService: DirectoryService,
    private readonly orgSqlContext: OrgSqlContext
  ) {}

  @Query('listEmployees')
  async listEmployees(
    _: unknown,
    args: { limit?: number; cursor?: string },
    @Context() ctx: { req: { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId: string = ctx.req.orgId; // from OrgScopeGuard
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const rows = await this.directoryService.listUsersByOrg(orgId, limit, args.cursor ?? null);
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      displayName: r.displayName ?? null,
    }));
  }

  @Query('getEmployee')
  async getEmployee(_: unknown, args: { id: string }, @Context() ctx: { req: { orgId: string; user: Record<string, unknown> } }) {
    const orgId: string = ctx.req.orgId; // from OrgScopeGuard
    const u = await this.directoryService.getUserById(args.id);
    if (!u || u.organization_id !== orgId) return null; // enforce org scope
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
    @Context() ctx: { req: { orgId: string; user: Record<string, unknown> } }
  ) {
    const orgId: string = ctx.req.orgId; // from OrgScopeGuard

    // Validate and set defaults for pagination args
    const first = Math.min(Math.max(args?.first ?? 20, 1), 100);
    
    // Enforce upper bound for performance
    if (args?.first && args.first > 100) {
      throw new BadRequestException('first must be between 1..100');
    }
    
    // Decode cursor if provided
    let cursor: { createdAt: string; id: string } | undefined;
    if (args?.after) {
      try {
        const decoded = Buffer.from(args.after, 'base64').toString('utf-8');
        cursor = JSON.parse(decoded);
        
        // Validate cursor structure
        if (!cursor || typeof cursor.createdAt !== 'string' || typeof cursor.id !== 'string') {
          throw new Error('Invalid cursor structure');
        }
      } catch (error) {
        throw new BadRequestException('Invalid cursor');
      }
    }

    // Fetch data with over-fetching to determine hasNextPage using RLS
    const limit = first + 1;
    
    // For now, keep the explicit WHERE filters while RLS is a backstop
    // This maintains performance with the composite index
    const [users, totalCount] = await Promise.all([
      this.directoryService.listUsersByOrgAfter(orgId, cursor, limit),
      this.directoryService.countUsersByOrg(orgId)
    ]);

    // Determine if there are more pages
    const hasNextPage = users.length > first;
    const actualUsers = hasNextPage ? users.slice(0, first) : users;

    // Map user objects with type safety

    // Build edges with cursors
    const edges = actualUsers.map((user: Record<string, unknown>) => ({
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