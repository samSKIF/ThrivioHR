import { pgTable, text, uuid, timestamp, jsonb, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const employmentEventTypeEnum = ['hire', 'promotion', 'transfer', 'salary_change', 'termination', 'leave', 'return'] as const;

export const employmentEvents = pgTable('employment_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type', { enum: employmentEventTypeEnum }).notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  payload: jsonb('payload'), // Event-specific data
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  effectiveDateCheck: check('effective_to_after_from', sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`),
}));

export const employmentEventsRelations = relations(employmentEvents, ({ one }) => ({
  user: one(users, {
    fields: [employmentEvents.userId],
    references: [users.id],
  }),
}));