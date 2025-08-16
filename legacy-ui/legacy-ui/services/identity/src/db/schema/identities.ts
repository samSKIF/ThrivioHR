import { pgTable, text, uuid, uniqueIndex, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const identityProviderEnum = ['oidc', 'saml', 'local', 'csv'] as const;

export const identities = pgTable('identities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: identityProviderEnum }).notNull(),
  providerSubject: text('provider_subject').notNull(),
  providerData: text('provider_data'), // JSON string for provider-specific data
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueProviderSubject: uniqueIndex('identities_provider_subject_unique').on(table.provider, table.providerSubject),
}));

export const identitiesRelations = relations(identities, ({ one }) => ({
  user: one(users, {
    fields: [identities.userId],
    references: [users.id],
  }),
}));