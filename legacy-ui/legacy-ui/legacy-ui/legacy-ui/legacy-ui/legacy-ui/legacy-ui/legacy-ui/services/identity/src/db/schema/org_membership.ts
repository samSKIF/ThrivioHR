import { pgTable, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { orgUnits } from './org_units';

export const orgMembership = pgTable('org_membership', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orgUnitId: uuid('org_unit_id').notNull().references(() => orgUnits.id),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMembershipRelations = relations(orgMembership, ({ one }) => ({
  user: one(users, {
    fields: [orgMembership.userId],
    references: [users.id],
  }),
  orgUnit: one(orgUnits, {
    fields: [orgMembership.orgUnitId],
    references: [orgUnits.id],
  }),
}));