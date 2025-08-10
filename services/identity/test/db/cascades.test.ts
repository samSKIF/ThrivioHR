import { describe, test, expect } from '@jest/globals';
import { db } from '../jest.setup.db';
import * as schema from '../../src/db/schema';

describe('Database Cascades', () => {

  test('deleting user cascades identities', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Org', isActive: true })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      })
      .returning();

    // Create identity
    await db
      .insert(schema.identities)
      .values({
        userId: user.id,
        provider: 'local',
        providerSubject: 'test@example.com',
      });

    // Verify identity exists
    let identities = await db.select().from(schema.identities);
    expect(identities).toHaveLength(1);

    // Delete user
    await db.delete(schema.users).where(schema.users.id === user.id);

    // Verify identity was cascaded
    identities = await db.select().from(schema.identities);
    expect(identities).toHaveLength(0);
  });

  test('deleting user cascades sessions', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Org', isActive: true })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      })
      .returning();

    // Create session
    await db
      .insert(schema.sessions)
      .values({
        userId: user.id,
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });

    // Verify session exists
    let sessions = await db.select().from(schema.sessions);
    expect(sessions).toHaveLength(1);

    // Delete user
    await db.delete(schema.users).where(schema.users.id === user.id);

    // Verify session was cascaded
    sessions = await db.select().from(schema.sessions);
    expect(sessions).toHaveLength(0);
  });

  test('deleting user cascades org membership', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Org', isActive: true })
      .returning();

    const [orgUnit] = await db
      .insert(schema.orgUnits)
      .values({
        organizationId: org.id,
        type: 'company',
        name: 'Test Company',
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      })
      .returning();

    // Create org membership
    await db
      .insert(schema.orgMembership)
      .values({
        userId: user.id,
        orgUnitId: orgUnit.id,
        isPrimary: true,
      });

    // Verify membership exists
    let memberships = await db.select().from(schema.orgMembership);
    expect(memberships).toHaveLength(1);

    // Delete user
    await db.delete(schema.users).where(schema.users.id === user.id);

    // Verify membership was cascaded
    memberships = await db.select().from(schema.orgMembership);
    expect(memberships).toHaveLength(0);
  });

  test('deleting user cascades role bindings', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Org', isActive: true })
      .returning();

    const [role] = await db
      .insert(schema.roles)
      .values({
        organizationId: org.id,
        name: 'Test Role',
      })
      .returning();

    const [user] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      })
      .returning();

    // Create role binding
    await db
      .insert(schema.roleBindings)
      .values({
        userId: user.id,
        roleId: role.id,
        organizationId: org.id,
        financeCapability: false,
      });

    // Verify role binding exists
    let bindings = await db.select().from(schema.roleBindings);
    expect(bindings).toHaveLength(1);

    // Delete user
    await db.delete(schema.users).where(schema.users.id === user.id);

    // Verify role binding was cascaded
    bindings = await db.select().from(schema.roleBindings);
    expect(bindings).toHaveLength(0);
  });
});