import { pgTable, uuid, integer, text, timestamp, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';

export const userPoints = pgTable('user_points', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  availablePoints: integer('available_points').notNull().default(0),
  pendingPoints: integer('pending_points').notNull().default(0),
  totalEarned: integer('total_earned').notNull().default(0),
  totalSpent: integer('total_spent').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: uuid('from_user_id').references(() => users.id),
  toUserId: uuid('to_user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  amount: integer('amount').notNull(),
  type: text('type').notNull(), // 'earned', 'sent', 'spent', 'reward'
  reason: text('reason'),
  description: text('description'),
  relatedPostId: uuid('related_post_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});