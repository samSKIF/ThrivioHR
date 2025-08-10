import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

describe('Sessions Partial Index', () => {
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
    // Clean up tables before each test in correct order
    await db.delete(schema.sessions);
    await db.delete(schema.users);
    await db.delete(schema.organizations);
  });

  test('sessions index exists and can query active sessions', async () => {
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

    const now = new Date();
    const futureDate = new Date(now.getTime() + 3600000); // 1 hour from now
    const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago

    // Insert sessions with future and past expiration dates
    await db.insert(schema.sessions).values([
      {
        userId: user.id,
        token: 'active-token',
        expiresAt: futureDate,
      },
      {
        userId: user.id,
        token: 'expired-token',
        expiresAt: pastDate,
      },
    ]);

    // Query for active sessions (expires_at > NOW())
    const activeSessions = await db
      .select()
      .from(schema.sessions)
      .where(sql`${schema.sessions.expiresAt} > NOW()`);

    expect(activeSessions).toHaveLength(1);
    expect(activeSessions[0].token).toBe('active-token');

    // Query all sessions to ensure both were inserted
    const allSessions = await db.select().from(schema.sessions);
    expect(allSessions).toHaveLength(2);
  });

  test('index helps with session cleanup queries', async () => {
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

    const now = new Date();
    const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago

    // Insert expired session
    await db.insert(schema.sessions).values({
      userId: user.id,
      token: 'expired-token',
      expiresAt: pastDate,
    });

    // Query for expired sessions (should use index efficiently)
    const expiredSessions = await db
      .select()
      .from(schema.sessions)
      .where(sql`${schema.sessions.expiresAt} <= NOW()`);

    expect(expiredSessions).toHaveLength(1);
    expect(expiredSessions[0].token).toBe('expired-token');
  });
});