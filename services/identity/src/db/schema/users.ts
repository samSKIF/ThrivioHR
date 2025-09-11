import { pgTable, text, boolean, uuid, uniqueIndex, timestamp, index, date, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  email: text('email').$type<string>().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  displayName: text('display_name'),
  jobTitle: text('job_title').notNull(),
  department: text('department').notNull(),
  location: text('location').notNull(),
  hireDate: date('hire_date').notNull(),
  passwordHash: text('password_hash'),
  passwordResetRequired: boolean('password_reset_required').notNull().default(false),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueEmailPerOrg: uniqueIndex('users_org_email_unique').on(table.organizationId, table.email),
  // Composite index for efficient keyset pagination O(log n)
  orgCreatedIdIdx: index('idx_users_org_created_id').on(table.organizationId, table.createdAt, table.id),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));