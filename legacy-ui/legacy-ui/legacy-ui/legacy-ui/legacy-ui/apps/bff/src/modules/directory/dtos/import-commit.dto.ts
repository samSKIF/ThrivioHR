import type { CommitRecord, CommitOverview, CommitPlan } from '../lib/types';

export class ImportCommitDto {
  csv!: string;
  dryRun!: boolean;
}

export type CommitResponse = CommitPlan; // used by controller's return type