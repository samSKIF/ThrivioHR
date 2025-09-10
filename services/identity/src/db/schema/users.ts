import { pgTable, text, boolean, uuid, uniqueIndex, timestamp, index, date } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  email: text('email').$type<string>().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  displayName: text('display_name'),
  jobTitle: text('job_title'),
  department: text('department'),
  location: text('location'),
  hireDate: date('hire_date'),
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