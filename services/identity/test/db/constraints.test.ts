import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/db/schema';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

describe('Database Constraints', () => {
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

  test('duplicate user email per org should fail', async () => {
    // Create organization
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Org', isActive: true })
      .returning();

    // Create first user
    await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'test@example.com',
        firstName: 'First',
        lastName: 'User',
        isActive: true,
      });

    // Attempt to create second user with same email in same org should fail
    await expect(
      db
        .insert(schema.users)
        .values({
          organizationId: org.id,
          email: 'test@example.com',
          firstName: 'Second',
          lastName: 'User',
          isActive: true,
        })
    ).rejects.toThrow();
  });

  test('same email in different orgs should succeed', async () => {
    // Create two organizations
    const [org1] = await db
      .insert(schema.organizations)
      .values({ name: 'Org 1', isActive: true })
      .returning();

    const [org2] = await db
      .insert(schema.organizations)
      .values({ name: 'Org 2', isActive: true })
      .returning();

    // Create users with same email in different orgs
    await db
      .insert(schema.users)
      .values({
        organizationId: org1.id,
        email: 'test@example.com',
        firstName: 'User',
        lastName: 'One',
        isActive: true,
      });

    await db
      .insert(schema.users)
      .values({
        organizationId: org2.id,
        email: 'test@example.com',
        firstName: 'User',
        lastName: 'Two',
        isActive: true,
      });

    // Both should exist
    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(2);
  });

  test('duplicate provider+subject should fail', async () => {
    const [org] = await db
      .insert(schema.organizations)
      .values({ name: 'Test Org', isActive: true })
      .returning();

    const [user1] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        isActive: true,
      })
      .returning();

    const [user2] = await db
      .insert(schema.users)
      .values({
        organizationId: org.id,
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        isActive: true,
      })
      .returning();

    // Create first identity
    await db
      .insert(schema.identities)
      .values({
        userId: user1.id,
        provider: 'oidc',
        providerSubject: 'subject123',
      });

    // Attempt to create second identity with same provider+subject should fail
    await expect(
      db
        .insert(schema.identities)
        .values({
          userId: user2.id,
          provider: 'oidc',
          providerSubject: 'subject123',
        })
    ).rejects.toThrow();
  });

  test('employment events effective_to check constraint', async () => {
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

    // Valid: effectiveTo > effectiveFrom
    await db
      .insert(schema.employmentEvents)
      .values({
        userId: user.id,
        eventType: 'hire',
        effectiveFrom: new Date('2023-01-01'),
        effectiveTo: new Date('2023-12-31'),
      });

    // Valid: effectiveTo is null
    await db
      .insert(schema.employmentEvents)
      .values({
        userId: user.id,
        eventType: 'promotion',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
      });

    // Invalid: effectiveTo <= effectiveFrom should fail
    await expect(
      db
        .insert(schema.employmentEvents)
        .values({
          userId: user.id,
          eventType: 'termination',
          effectiveFrom: new Date('2023-06-01'),
          effectiveTo: new Date('2023-01-01'), // Before effectiveFrom
        })
    ).rejects.toThrow();
  });
});