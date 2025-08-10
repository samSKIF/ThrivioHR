import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/db/schema';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

describe('Database Cascades', () => {
  let client: Client;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    client = new Client({
      connectionString: TEST_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    db = drizzle(client, { schema });
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    // Clean up all tables before each test in correct order to respect FK constraints
    await db.delete(schema.employmentEvents);
    await db.delete(schema.orgMembership);
    await db.delete(schema.roleBindings);
    await db.delete(schema.sessions);
    await db.delete(schema.identities);
    await db.delete(schema.users);
    await db.delete(schema.roles);
    await db.delete(schema.locations);
    await db.delete(schema.orgUnits);
    await db.delete(schema.organizations);
  });

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