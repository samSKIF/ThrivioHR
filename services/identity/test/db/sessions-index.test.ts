import { describe, test, expect } from '@jest/globals';
import { db } from '../jest.setup.db';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema';
import { createOrg, createUser } from '../helpers';

describe('Sessions Partial Index', () => {
  test('sessions partial index sanity: insert one with future expires_at and one with past; query count of future (where expires_at > now()) returns 1', async () => {
    const org = await createOrg();
    const user = await createUser(org.id);

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

    // Query for future sessions
    const futureSessions = await db
      .select()
      .from(schema.sessions)
      .where(sql`${schema.sessions.expiresAt} > NOW()`);

    expect(futureSessions).toHaveLength(1);
    expect(futureSessions[0].token).toBe('active-token');
  });
});