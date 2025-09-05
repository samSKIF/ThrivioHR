import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IdentityRepository } from './identity.repository';
import { CreateOrgDto } from './dtos/create-org.dto';
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class IdentityService {
  constructor(
    @Inject(forwardRef(() => IdentityRepository))
    private readonly repository: IdentityRepository
  ) {}

  async createOrganization(createOrgDto: CreateOrgDto) {
    return this.repository.createOrganization(createOrgDto.name);
  }

  async getOrganizations(limit = 20) {
    return this.repository.getOrganizations(limit);
  }

  async createUser(createUserDto: CreateUserDto) {
    return this.repository.createUser(
      createUserDto.orgId,
      createUserDto.email,
      createUserDto.givenName,
      createUserDto.familyName,
    );
  }

  async getUsersByOrg(orgId: string, limit = 20) {
    return this.repository.getUsersByOrg(orgId, limit);
  }

  /**
   * Flexible wrapper to satisfy current controller call sites.
   * Supports:
   *   - getUsers("orgId", limit)
   *   - getUsers({ orgId: string }, limit)
   *   - getUsers({ email: string }, limit)
   */
  async getUsers(filter: string | { orgId?: string; email?: string; id?: string }, limit = 20) {
    if (typeof filter === 'string') {
      // Called as getUsers("orgId", limit)
      return this.repository.listUsersByOrg(filter, limit);
    }
    
    if (filter.email) {
      // Called as getUsers({ email: "user@example.com" })
      // Use existing method but fetch all users and filter by email
      const allUsers = await this.repository.listUsersByOrg(filter.orgId || '', 100);
      return allUsers.filter(user => user.email?.toLowerCase() === filter.email?.toLowerCase());
    }
    
    if (filter.orgId) {
      // Called as getUsers({ orgId: "uuid" })
      return this.repository.listUsersByOrg(filter.orgId, limit);
    }
    
    if (filter.id) {
      // Called as getUsers({ id: "uuid" })
      // Use existing method but filter by id
      const allUsers = await this.repository.listUsersByOrg('', 100);
      return allUsers.filter(user => user.id === filter.id);
    }
    
    // Default fallback
    return [];
  }

  /**
   * Case-insensitive lookup by email using existing flexible getUsers().
   * Returns first match or null.
   */
  async findUserByEmailCI(email: string) {
    const list = await (this as any).getUsers?.({ email })?.catch?.(() => []) || [];
    return Array.isArray(list) && list.length ? list[0] : null;
  }

  /**
   * Update a user's password hash and optionally clear the reset flag.
   * Tolerant to different repository shapes – tries known update helpers,
   * then falls back to a generic SQL exec if available.
   */
  async setUserPassword(userId: string, newHash: string, clearReset = false) {
    const fields: any = { password_hash: newHash };
    if (clearReset) fields.password_reset_required = false;

    // Try common update helpers if present
    const repo: any = (this as any).repository;
    if (repo?.updateUserFields) return await repo.updateUserFields(userId, fields);
    if (repo?.updateUser)       return await repo.updateUser(userId, fields);

    // Try a generic exec/query if available
    if (repo?.exec) {
      const sets: string[] = [];
      const args: any[] = [];
      for (const [k, v] of Object.entries(fields)) { sets.push(`${k} = $${sets.length+1}`); args.push(v); }
      args.push(userId);
      return await repo.exec(`UPDATE users SET ${sets.join(', ')} WHERE id = $${sets.length+1}`, args);
    }
  }

  /** Best-effort: mark successful login; ignore if columns/helpers absent. */
  async recordLoginSuccess(userId: string) {
    try {
      const repo: any = (this as any).repository;
      if (repo?.exec) {
        await repo.exec(
          `UPDATE users
              SET last_login_at = now(),
                  failed_login_attempts = 0
            WHERE id = $1`,
          [userId]
        );
      }
    } catch { /* noop */ }
  }

  /**
   * Flexible wrapper to satisfy current controller call sites.
   * Supports:
   *   - getOrgs(limit)
   *   - getOrgs({ id: string }, limit)
   */
  async getOrgs(filter: number | { id?: string; name?: string } = 20, limit = 20) {
    if (typeof filter === 'number') {
      // Called as getOrgs(limit)
      return this.repository.getOrganizations(filter);
    }
    
    if (filter.id) {
      // Called as getOrgs({ id: "uuid" })
      // Fetch all orgs and filter by id since we don't have findOrganizationById
      const allOrgs = await this.repository.getOrganizations(100);
      return allOrgs.filter(org => (org as any).id === filter.id);
    }
    
    if (filter.name) {
      // Called as getOrgs({ name: "Org Name" })
      // Fetch all orgs and filter by name since we don't have findOrganizationByName
      const allOrgs = await this.repository.getOrganizations(100);
      return allOrgs.filter(org => (org as any).name === filter.name);
    }
    
    // Default fallback
    return this.repository.getOrganizations(limit);
  }
}