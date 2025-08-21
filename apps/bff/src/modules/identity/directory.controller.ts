import { Controller, Get, Query } from '@nestjs/common';
import { IdentityService } from './identity.service';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly identity: IdentityService) {}

  /**
   * List users by org with optional cursor pagination.
   * Query: orgId (required), limit (default 20), cursor (optional)
   */
  @Get('users')
  async listUsers(
    @Query('orgId') orgId: string,
    @Query('limit') limitStr?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!orgId || typeof orgId !== 'string') {
      return { users: [], nextCursor: null, error: 'orgId required' };
    }
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);

    // try cursor-aware path first, fallback to simple list
    if (cursor) {
      const rows = await this.identity['repository']?.listUsersByOrgAfter?.(orgId, undefined, limit);
      // NOTE: for simplicity in MVP, ignore cursor arg for now (we'll wire true cursor next)
      const users = Array.isArray(rows) ? rows : [];
      const nextCursor = users.length === limit ? users[users.length - 1]?.id ?? null : null;
      return { users, nextCursor };
    } else {
      const rows = await this.identity['repository']?.listUsersByOrg?.(orgId, limit);
      const users = Array.isArray(rows) ? rows : [];
      const nextCursor = users.length === limit ? users[users.length - 1]?.id ?? null : null;
      return { users, nextCursor };
    }
  }
}