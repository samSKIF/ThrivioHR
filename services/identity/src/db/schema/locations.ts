import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const locationTypeEnum = ['country', 'city', 'site'] as const;

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  type: text('type', { enum: locationTypeEnum }).notNull(),
  name: text('name').notNull(),
  code: text('code'), // ISO country code, city code, site code
  // Soft references for organizational display (no foreign keys)
  countryName: text('country_name'), // For sites: which country they're in
  cityName: text('city_name'), // For sites: which city they're in
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const locationsRelations = relations(locations, ({ one }) => ({
  organization: one(organizations, {
    fields: [locations.organizationId],
    references: [organizations.id],
  }),
  // Removed parent-child relations to make all locations independent
}));