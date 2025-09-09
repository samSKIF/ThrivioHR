import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').references(() => users.id),
  eventType: text('event_type').notNull(),
  metadataJson: jsonb('metadata_json'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});