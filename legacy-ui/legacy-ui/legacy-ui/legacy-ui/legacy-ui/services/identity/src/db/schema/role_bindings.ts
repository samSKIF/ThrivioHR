import { pgTable, uuid, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { roles } from './roles';
import { organizations } from './organizations';

export const roleBindings = pgTable('role_bindings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  scope: text('scope'), // e.g., 'org', 'company', 'department', 'team'
  scopeId: uuid('scope_id'), // references the specific scope entity
  financeCapability: boolean('finance_capability').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roleBindingsRelations = relations(roleBindings, ({ one }) => ({
  user: one(users, {
    fields: [roleBindings.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [roleBindings.roleId],
    references: [roles.id],
  }),
  organization: one(organizations, {
    fields: [roleBindings.organizationId],
    references: [organizations.id],
  }),
}));