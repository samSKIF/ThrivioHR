import { pgTable, uuid, integer, boolean, jsonb, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const importJobSourceEnum = pgEnum('import_job_source', ['csv', 'api']);
export const importJobStatusEnum = pgEnum('import_job_status', ['validated', 'committed', 'rejected']);

export const importJobs = pgTable('import_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  source: importJobSourceEnum('source').notNull(),
  status: importJobStatusEnum('status').notNull(),
  totalRows: integer('total_rows').notNull(),
  validRows: integer('valid_rows').notNull(),
  mismatchRows: integer('mismatch_rows').notNull(),
  duplicateRows: integer('duplicate_rows').notNull(),
  acceptedMismatches: boolean('accepted_mismatches').default(false),
  mismatchDomains: jsonb('mismatch_domains'),
  reportUrl: text('report_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp('committed_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
});