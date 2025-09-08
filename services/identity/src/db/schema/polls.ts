import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';
import { posts } from './posts';

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  question: text('question').notNull(),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  allowMultipleChoices: boolean('allow_multiple_choices').notNull().default(false),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable('poll_options', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  pollId: uuid('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  voteCount: integer('vote_count').notNull().default(0),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pollVotes = pgTable('poll_votes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  pollId: uuid('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  optionId: uuid('option_id').notNull().references(() => pollOptions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});