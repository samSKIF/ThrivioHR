import { pgTable, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';

export const importSessions = pgTable('import_sessions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar('filename').notNull(),
  fileSize: integer('file_size').notNull(),
  csvSha256: varchar('csv_sha256').notNull(), // for idempotency
  planJson: text('plan_json'), // JSON string of the import plan
  status: varchar('status').notNull().default('pending'), // pending|preview|committed|failed|expired
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ImportSession = typeof importSessions.$inferSelect;
export type NewImportSession = typeof importSessions.$inferInsert;