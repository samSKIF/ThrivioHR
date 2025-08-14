import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type { UserPublic } from '@thrivio/contracts';
import { DRIZZLE_DB } from '../db/db.module';

// helper: display name
function makeDisplayName(firstName: string|null, lastName: string|null): string|null {
  const fn = (firstName ?? '').trim(); 
  const ln = (lastName ?? '').trim();
  const d = [fn, ln].filter(Boolean).join(' ');
  return d || null;
}

@Injectable()
export class IdentityRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase<any>,
  ) {}

  async createOrganization(name: string) {
    const res = await this.db.execute(sql`INSERT INTO organizations (id, name) VALUES (gen_random_uuid(), ${name}) RETURNING id, name`);
    return (res as any).rows?.[0];
  }

  async getOrganizations(limit = 20) {
    const res = await this.db.execute(sql`SELECT id, name FROM organizations LIMIT ${limit}`);
    return (res as any).rows ?? [];
  }

  async getUsersByOrg(orgId: string, limit = 20) {
    const res = await this.db.execute(sql`SELECT id, email, first_name AS "givenName", last_name AS "familyName" FROM users WHERE organization_id = ${orgId} LIMIT ${limit}`);
    return (res as any).rows ?? [];
  }

  async findUserByEmailOrg(email: string, orgId: string): Promise<UserPublic | null> {
    const res = await this.db.execute(sql`SELECT id, organization_id AS "organizationId", email, first_name AS "firstName", last_name AS "lastName", display_name AS "displayName" FROM users WHERE organization_id = ${orgId} AND LOWER(email) = LOWER(${email}) LIMIT 1`);
    const row = (res as any).rows?.[0];
    return row ?? null;
  }

  async listDistinctDepartments(orgId: string): Promise<string[]> {
    const res = await this.db.execute(sql`SELECT LOWER(name) AS name FROM org_units WHERE organization_id = ${orgId} AND type = 'department'`);
    const set = new Set<string>();
    for (const r of (res as any).rows ?? []) {
      const n = (r.name ?? '').trim();
      if (n) set.add(n);
    }
    return Array.from(set.values());
  }

  async listDistinctLocations(orgId: string): Promise<string[]> {
    const res = await this.db.execute(sql`SELECT LOWER(name) AS name FROM locations WHERE organization_id = ${orgId}`);
    const set = new Set<string>();
    for (const r of (res as any).rows ?? []) {
      const n = (r.name ?? '').trim();
      if (n) set.add(n);
    }
    return Array.from(set.values());
  }

  async findOrCreateDepartment(orgId: string, name: string): Promise<{ dept: any; created: boolean }> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return { dept: null, created: false };
    // try existing
    const sel = await this.db.execute(sql`SELECT id, organization_id AS "organizationId", type, name, parent_id AS "parentId" FROM org_units WHERE organization_id = ${orgId} AND type = 'department' AND name = ${trimmed} LIMIT 1`);
    const existing = (sel as any).rows?.[0];
    if (existing) return { dept: existing, created: false };
    // create
    const ins = await this.db.execute(sql`INSERT INTO org_units (id, organization_id, type, name) VALUES (gen_random_uuid(), ${orgId}, 'department', ${trimmed}) RETURNING id, organization_id AS "organizationId", type, name, parent_id AS "parentId"`);
    return { dept: (ins as any).rows?.[0] ?? null, created: true };
  }

  async ensureMembership(userId: string, orgUnitId: string): Promise<{ membership: any; created: boolean }> {
    const sel = await this.db.execute(sql`SELECT id, user_id AS "userId", org_unit_id AS "orgUnitId", is_primary AS "isPrimary" FROM org_membership WHERE user_id = ${userId} AND org_unit_id = ${orgUnitId} LIMIT 1`);
    const existing = (sel as any).rows?.[0];
    if (existing) return { membership: existing, created: false };
    const ins = await this.db.execute(sql`INSERT INTO org_membership (id, user_id, org_unit_id, is_primary) VALUES (gen_random_uuid(), ${userId}, ${orgUnitId}, false) RETURNING id, user_id AS "userId", org_unit_id AS "orgUnitId", is_primary AS "isPrimary"`);
    return { membership: (ins as any).rows?.[0] ?? null, created: true };
  }

  async findOrCreateLocation(orgId: string, name: string): Promise<{ loc: any; created: boolean }> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return { loc: null, created: false };
    const sel = await this.db.execute(sql`SELECT id, organization_id AS "organizationId", name, type FROM locations WHERE organization_id = ${orgId} AND name = ${trimmed} LIMIT 1`);
    const existing = (sel as any).rows?.[0];
    if (existing) return { loc: existing, created: false };
    const ins = await this.db.execute(sql`INSERT INTO locations (id, organization_id, name) VALUES (gen_random_uuid(), ${orgId}, ${trimmed}) RETURNING id, organization_id AS "organizationId", name, type`);
    return { loc: (ins as any).rows?.[0] ?? null, created: true };
  }

  async createUser(orgId: string, email: string, firstName: string|null, lastName: string|null): Promise<UserPublic> {
    const displayName = makeDisplayName(firstName, lastName);
    const ins = await this.db.execute(sql`INSERT INTO users (id, organization_id, email, first_name, last_name, display_name) VALUES (gen_random_uuid(), ${orgId}, ${email}, ${firstName}, ${lastName}, ${displayName}) RETURNING id, organization_id AS "organizationId", email, first_name AS "firstName", last_name AS "lastName", display_name AS "displayName"`);
    return (ins as any).rows?.[0];
  }

  async updateUserNames(userId: string, firstName: string|null, lastName: string|null): Promise<UserPublic> {
    const displayName = makeDisplayName(firstName, lastName);
    const upd = await this.db.execute(sql`UPDATE users SET first_name = ${firstName}, last_name = ${lastName}, display_name = ${displayName}, updated_at = NOW() WHERE id = ${userId} RETURNING id, organization_id AS "organizationId", email, first_name AS "firstName", last_name AS "lastName", display_name AS "displayName"`);
    return (upd as any).rows?.[0];
  }

  async listUsersByOrg(orgId: string, limit = 20, cursor: string | null = null) {
    // raw SQL to avoid schema coupling; pagination by id (lexicographic)
    if (cursor) {
      const rows = await this.db.execute(sql`SELECT id, email, first_name as "firstName", last_name as "lastName", display_name as "displayName" FROM users WHERE organization_id = ${orgId} AND id > ${cursor} ORDER BY id ASC LIMIT ${limit}`);
      return ((rows as any).rows ?? []).map((r: any) => ({
        id: r.id, email: r.email, firstName: r.firstName, lastName: r.lastName, displayName: r.displayName,
      }));
    } else {
      const rows = await this.db.execute(sql`SELECT id, email, first_name as "firstName", last_name as "lastName", display_name as "displayName" FROM users WHERE organization_id = ${orgId} ORDER BY id ASC LIMIT ${limit}`);
      return ((rows as any).rows ?? []).map((r: any) => ({
        id: r.id, email: r.email, firstName: r.firstName, lastName: r.lastName, displayName: r.displayName,
      }));
    }
  }

  async getUserById(id: string) {
    const rows = await this.db.execute(sql`SELECT id, email, first_name as "firstName", last_name as "lastName", display_name as "displayName" FROM users WHERE id = ${id} LIMIT 1`);
    const r = ((rows as any).rows ?? [])[0];
    if (!r) return null;
    return { id: r.id, email: r.email, firstName: r.firstName, lastName: r.lastName, displayName: r.displayName };
  }
}