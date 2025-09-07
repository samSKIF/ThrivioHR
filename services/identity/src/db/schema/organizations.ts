import { pgTable, text, boolean, uuid, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  domain: text('domain'),
  isActive: boolean('is_active').notNull().default(true),
  settings: text('settings'), // JSON string for org-specific settings
  slug: text('slug'),
  status: text('status').notNull().default('active'),
  timezone: text('timezone'),
  primaryCurrency: text('primary_currency'),
  websiteUrl: text('website_url'),
  instagramUrl: text('instagram_url'),
  xUrl: text('x_url'),
  linkedinUrl: text('linkedin_url'),
  industry: text('industry'),
  maxUsers: integer('max_users'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhoneE164: text('contact_phone_e164'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});