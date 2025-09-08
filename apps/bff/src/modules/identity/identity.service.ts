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

  /** internal helper: run a one-off pg function using DATABASE_URL */
  private async withPg<T>(fn: (c: any) => Promise<T>): Promise<T> {
    const { Client } = require('pg');
    const c = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await c.connect();
    try { return await fn(c); }
    finally { await c.end(); }
  }

  /** Case-insensitive lookup by email; returns first match or null. */
  async findUserByEmailCI(email: string) {
    // Prefer any existing flexible method if present
    try {
      const list = await (this as any).getUsers?.({ email }) ;
      if (Array.isArray(list) && list.length) return list[0];
    } catch { /* fall through */ }
    // Fallback: direct SQL via pg
    return await this.withPg(async (c) => {
      const q = `
        SELECT id, email, password_hash, password_reset_required,
               first_name, last_name, display_name, organization_id
        FROM users
        WHERE lower(email)=lower($1)
        ORDER BY created_at ASC
        LIMIT 1`;
      const r = await c.query(q, [email]);
      return r.rows[0] || null;
    });
  }

  /** Lookup user by ID; returns user or null. */
  async findUserById(userId: string) {
    // Try the flexible getUsers method first if it exists
    try {
      const list = await (this as any).getUsers?.({ id: userId });
      if (Array.isArray(list) && list.length) return list[0];
    } catch { /* fall through */ }
    
    // Fallback: direct SQL via pg
    return await this.withPg(async (c) => {
      const q = `
        SELECT id, email, password_hash, password_reset_required,
               first_name, last_name, display_name, organization_id
        FROM users
        WHERE id = $1
        LIMIT 1`;
      const r = await c.query(q, [userId]);
      return r.rows[0] || null;
    });
  }

  /** Update password_hash and optionally clear password_reset_required (best-effort). */
  async setUserPassword(userId: string, newHash: string, clearReset = false) {
    // Try repo helpers if they exist
    const repo: any = (this as any).repository;
    if (repo?.updateUserFields) return await repo.updateUserFields(userId, { password_hash: newHash, ...(clearReset ? { password_reset_required: false } : {}) });
    if (repo?.updateUser)       return await repo.updateUser(userId,       { password_hash: newHash, ...(clearReset ? { password_reset_required: false } : {}) });
    // Fallback: direct SQL
    return await this.withPg(async (c) => {
      const sets: string[] = ['password_hash = $1'];
      const args: any[] = [newHash];
      if (clearReset) { sets.push('password_reset_required = false'); }
      sets.push('updated_at = now()');
      args.push(userId);
      await c.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $2`, args);
    });
  }

  /** Best-effort login bookkeeping (ignore if columns absent). */
  async recordLoginSuccess(userId: string) {
    try {
      const repo: any = (this as any).repository;
      if (repo?.exec) {
        await repo.exec(`UPDATE users SET last_login_at = now(), failed_login_attempts = 0 WHERE id = $1`, [userId]);
        return;
      }
    } catch { /* ignore and try pg */ }
    await this.withPg(async (c) => {
      try { await c.query(`UPDATE users SET last_login_at = now(), failed_login_attempts = 0 WHERE id = $1`, [userId]); } catch {}
    });
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