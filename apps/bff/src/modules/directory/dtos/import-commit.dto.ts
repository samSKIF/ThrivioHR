import type { CommitPlan, CommitRecord, CommitOverview } from '../lib/types';

export class ImportCommitDto {
  csv!: string;
  dryRun!: boolean;
}

// Type annotations for contracts alignment
export interface CommitResponse {
  overview: CommitOverview;
  records: CommitRecord[];
}