import { describe, test, expect } from '@jest/globals';
import { db } from '../jest.setup.db';
import * as schema from '../../src/db/schema';
import { createOrg, createUser, createIdentity, createSession, createMembership } from '../helpers';

describe('Database Cascades', () => {
  test('cascade delete: insert user + session + identity + membership; delete user; counts for those child tables become 0', async () => {
    const org = await createOrg();
    const user = await createUser(org.id);

    // Create related records
    await createIdentity(user.id);
    await createSession(user.id);
    await createMembership(user.id, org.id);

    // Verify all records exist
    let identities = await db.select().from(schema.identities);
    let sessions = await db.select().from(schema.sessions);
    let memberships = await db.select().from(schema.orgMembership);
    
    expect(identities).toHaveLength(1);
    expect(sessions).toHaveLength(1);
    expect(memberships).toHaveLength(1);

    // Delete user
    await db.delete(schema.users).where(schema.users.id === user.id);

    // Verify cascaded deletes
    identities = await db.select().from(schema.identities);
    sessions = await db.select().from(schema.sessions);
    memberships = await db.select().from(schema.orgMembership);
    
    expect(identities).toHaveLength(0);
    expect(sessions).toHaveLength(0);
    expect(memberships).toHaveLength(0);
  });
});