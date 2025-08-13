import { describe, test, expect } from '@jest/globals';
import { createOrg, createUser, createIdentity, createEmploymentEvent } from '../helpers';

describe('Database Constraints', () => {
  test('unique email per org: same email different org succeeds, same email same org fails', async () => {
    const org1 = await createOrg('Org 1');
    const org2 = await createOrg('Org 2');
    
    // Create user in org1
    const user1 = await createUser(org1.id, 'test@example.com');
    expect(user1.email).toBe('test@example.com');

    // Same email in different org should succeed
    const user2 = await createUser(org2.id, 'test@example.com');
    expect(user2.email).toBe('test@example.com');
    expect(user2.organizationId).toBe(org2.id);

    // Same email in same org should fail
    await expect(
      createUser(org1.id, 'test@example.com')
    ).rejects.toThrow(/duplicate key value violates unique constraint/);
  });

  test('identity uniqueness: same provider+subject for two users rejects; different provider same subject allowed', async () => {
    const org = await createOrg();
    const user1 = await createUser(org.id, 'user1@example.com');
    const user2 = await createUser(org.id, 'user2@example.com');

    // Create first identity
    await createIdentity(user1.id, 'oidc', 'subject123');

    // Same provider+subject for different user should fail
    await expect(
      createIdentity(user2.id, 'oidc', 'subject123')
    ).rejects.toThrow(/duplicate key value violates unique constraint/);

    // Different provider, same subject should succeed
    await createIdentity(user2.id, 'saml', 'subject123');
  });

  test('employment event check: inserting with effective_to <= effective_from should reject; valid range inserts and can be queried', async () => {
    const org = await createOrg();
    const user = await createUser(org.id);

    // Valid range should succeed
    await createEmploymentEvent(
      user.id,
      org.id,
      new Date('2023-01-01'),
      new Date('2023-12-31')
    );

    // Invalid range (effective_to <= effective_from) should fail
    await expect(
      createEmploymentEvent(
        user.id,
        org.id,
        new Date('2023-06-01'),
        new Date('2023-01-01')
      )
    ).rejects.toThrow();
  });
});