import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const orgUnitTypeEnum = ['company', 'department', 'team'] as const;

export const orgUnits = pgTable('org_units', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  parentId: uuid('parent_id'),
  type: text('type', { enum: orgUnitTypeEnum }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgUnitsRelations = relations(orgUnits, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orgUnits.organizationId],
    references: [organizations.id],
  }),
  parent: one(orgUnits, {
    fields: [orgUnits.parentId],
    references: [orgUnits.id],
    relationName: 'parent_child',
  }),
  children: many(orgUnits, {
    relationName: 'parent_child',
  }),
}));