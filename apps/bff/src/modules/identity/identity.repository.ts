import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNotNull } from 'drizzle-orm';
import * as schema from '../../../../../services/identity/src/db/schema';
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

  async createUser(orgId: string, email: string, givenName?: string, familyName?: string) {
    const [user] = await this.db
      .insert(schema.users)
      .values({
        organizationId: orgId,
        email,
        firstName: givenName || '',
        lastName: familyName || '',
      })
      .returning({
        id: schema.users.id,
        orgId: schema.users.organizationId,
        email: schema.users.email,
      });
    return user;
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
    // Fallback: derive departments from users.department values in this org
    // (We'll add a true departments table in a later slice.)
    // For now, return empty array since department field doesn't exist yet
    return [];
  }
}