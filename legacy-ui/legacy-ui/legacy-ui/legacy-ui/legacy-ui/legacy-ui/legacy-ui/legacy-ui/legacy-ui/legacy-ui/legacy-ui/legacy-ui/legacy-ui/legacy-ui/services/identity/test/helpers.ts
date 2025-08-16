// Test helpers that use the shared db from jest.setup.db.ts
import { db } from './jest.setup.db';
import * as schema from '../src/db/schema';

export async function createOrg(name = 'Test Org') {
  const [org] = await db
    .insert(schema.organizations)
    .values({ name, isActive: true })
    .returning();
  return org;
}

export async function createUser(organizationId: number, email = 'test@example.com') {
  const [user] = await db
    .insert(schema.users)
    .values({
      organizationId,
      email,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    })
    .returning();
  return user;
}

export async function createIdentity(userId: string, provider = 'oidc', providerSubject = 'subject123') {
  const [identity] = await db
    .insert(schema.identities)
    .values({
      userId,
      provider,
      providerSubject,
    })
    .returning();
  return identity;
}

export async function createOrgUnit(organizationId: number, name = 'Test Unit') {
  const [unit] = await db
    .insert(schema.orgUnits)
    .values({
      organization_id: organizationId,
      name,
      type: 'department' as const,
    })
    .returning();
  return unit;
}

export async function createMembership(userId: string, organizationId: number) {
  const orgUnit = await createOrgUnit(organizationId);
  const [membership] = await db
    .insert(schema.orgMembership)
    .values({
      user_id: userId,
      org_unit_id: orgUnit.id,
      is_primary: true,
    })
    .returning();
  return membership;
}

export async function createSession(userId: string, token = 'test-token') {
  const [session] = await db
    .insert(schema.sessions)
    .values({
      user_id: userId,
      token,
      expires_at: new Date(Date.now() + 86400000), // 24 hours
    })
    .returning();
  return session;
}

export async function createEmploymentEvent(
  userId: string,
  organizationId: number,
  effectiveFrom: Date,
  effectiveTo?: Date
) {
  const [event] = await db
    .insert(schema.employmentEvents)
    .values({
      user_id: userId,
      organization_id: organizationId,
      event_type: 'hire' as const,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    })
    .returning();
  return event;
}