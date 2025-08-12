import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNotNull } from 'drizzle-orm';
import * as schema from '../../../../../services/identity/src/db/schema';
import { orgUnits } from '../../../../../services/identity/src/db/schema/org_units';
import { orgMembership } from '../../../../../services/identity/src/db/schema/org_membership';
import { organizations } from '../../../../../services/identity/src/db/schema/organizations';
import { DRIZZLE_DB } from '../db/db.module';

@Injectable()
export class IdentityRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createOrganization(name: string) {
    const [org] = await this.db
      .insert(schema.organizations)
      .values({ name })
      .returning({ id: schema.organizations.id, name: schema.organizations.name });
    return org;
  }

  async getOrganizations(limit = 20) {
    return this.db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
      })
      .from(schema.organizations)
      .limit(limit);
  }

  async getUsersByOrg(orgId: string, limit = 20) {
    return this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        givenName: schema.users.firstName,
        familyName: schema.users.lastName,
      })
      .from(schema.users)
      .where(eq(schema.users.organizationId, orgId))
      .limit(limit);
  }

  async findUserByEmailOrg(email: string, orgId: string) {
    const res = await this.db.select().from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.organizationId, orgId)))
      .limit(1);
    return res[0] ?? null;
  }

  async listDistinctDepartments(orgId: string): Promise<string[]> {
    // Read org_units where type = 'department' for this org
    const rows = await this.db.select({ name: orgUnits.name })
      .from(orgUnits)
      .where(and(eq(orgUnits.organizationId, orgId), eq(orgUnits.type, 'department')));
    const set = new Set<string>();
    for (const r of rows) {
      const d = (r.name ?? '').trim();
      if (d) set.add(d);
    }
    return Array.from(set.values());
  }

  async createUser(orgId: string, email: string, firstName: string, lastName: string) {
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const [row] = await this.db.insert(schema.users).values({
      organizationId: orgId,
      email,
      firstName,
      lastName,
      displayName,
      isActive: true,
    }).returning();
    return row;
  }

  async updateUserNames(userId: string, firstName: string|null|undefined, lastName: string|null|undefined) {
    const patch: any = {};
    if (firstName != null) patch.firstName = firstName;
    if (lastName != null) patch.lastName = lastName;
    if ('firstName' in patch || 'lastName' in patch) {
      const displayName = [patch.firstName, patch.lastName].filter(Boolean).join(' ').trim();
      if (displayName) patch.displayName = displayName;
    }
    if (Object.keys(patch).length === 0) return null;
    const [row] = await this.db.update(schema.users).set(patch).where(eq(schema.users.id, userId)).returning();
    return row;
  }

  async findOrCreateDepartment(orgId: string, name: string): Promise<{ dept: any; created: boolean }> {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return { dept: null, created: false };
    const existing = await this.db.select().from(orgUnits)
      .where(and(eq(orgUnits.organizationId, orgId), eq(orgUnits.type, 'department'), eq(orgUnits.name, trimmed)))
      .limit(1);
    if (existing[0]) return { dept: existing[0], created: false };
    const [createdRow] = await this.db.insert(orgUnits).values({
      organizationId: orgId,
      type: 'department',
      name: trimmed,
    }).returning();
    return { dept: createdRow, created: true };
  }

  async ensureMembership(userId: string, orgUnitId: string): Promise<{ membership: any; created: boolean }> {
    const existing = await this.db.select().from(orgMembership)
      .where(and(eq(orgMembership.userId, userId), eq(orgMembership.orgUnitId, orgUnitId)))
      .limit(1);
    if (existing[0]) return { membership: existing[0], created: false };
    const [createdRow] = await this.db.insert(orgMembership).values({ userId, orgUnitId }).returning();
    return { membership: createdRow, created: true };
  }
}