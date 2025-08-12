import { pgTable, uuid, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { users } from './users';

// Sessions table schema with camelCase properties mapped to snake_case columns.
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  // IMPORTANT: expose camelCase property userId, mapped to user_id column
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});