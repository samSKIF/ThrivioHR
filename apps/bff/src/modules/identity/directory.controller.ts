import { Controller, Get, Query } from '@nestjs/common';
import { IdentityService } from './identity.service';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly identity: IdentityService) {}

  /**
   * List users by organization.
   * Query: orgId (required), limit (default 20), cursor (optional — placeholder for future)
   */
  @Get('users')
  async listUsers(
    @Query('orgId') orgId: string,
    @Query('limit') limitStr?: string,
    @Query('cursor') _cursor?: string, // reserved for future true cursor impl
  ) {
    if (!orgId || typeof orgId !== 'string') {
      return { users: [], nextCursor: null, error: 'orgId required' };
    }
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);

    // Use IdentityService's flexible getUsers wrapper
    const result = await this.identity.getUsers({ orgId }, limit);

    const users = Array.isArray(result) ? result : (result ? [result] : []);
    const nextCursor = users.length === limit ? users[users.length - 1]?.id ?? null : null;

    return { users, nextCursor };
  }
}