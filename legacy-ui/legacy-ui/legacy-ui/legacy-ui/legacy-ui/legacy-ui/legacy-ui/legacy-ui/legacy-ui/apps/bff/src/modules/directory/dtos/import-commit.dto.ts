import type { CommitPlan, CommitRecord, ImportRow } from '../lib/types';

export class ImportCommitDto {
  csv!: string;
  dryRun!: boolean;
}

import type { CommitOverview } from '../lib/types';

// Type annotations for contracts alignment
export interface CommitResponse {
  overview: CommitOverview;
  records: CommitRecord[];
}