import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const locationTypeEnum = ['country', 'city', 'site'] as const;

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  parentId: uuid('parent_id'),
  type: text('type', { enum: locationTypeEnum }).notNull(),
  name: text('name').notNull(),
  code: text('code'), // ISO country code, city code, site code
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const locationsRelations = relations(locations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [locations.organizationId],
    references: [organizations.id],
  }),
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: 'parent_child',
  }),
  children: many(locations, {
    relationName: 'parent_child',
  }),
}));