import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  planCode: text('plan_code').notNull(),
  seatsLimit: integer('seats_limit').notNull(),
  subscribedUsers: integer('subscribed_users').notNull(),
  pricePerUserPerMonth: numeric('price_per_user_per_month').notNull(),
  subscriptionPeriod: text('subscription_period').notNull(),
  totalMonthlyAmount: numeric('total_monthly_amount').notNull(),
  status: text('status').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull().defaultNow(),
  expirationDate: timestamp('expiration_date', { withTimezone: true }),
  lastPaymentDate: timestamp('last_payment_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});