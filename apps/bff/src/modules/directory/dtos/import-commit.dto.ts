import type { directory as CDirectory } from '@thrivio/contracts';
import type { CommitPlan, CommitRecord } from '../lib/types';

export class ImportCommitDto {
  csv!: string;
  dryRun!: boolean;
}

// Type annotations for contracts alignment
export interface CommitResponse {
  overview: CDirectory.CommitOverview;
  records: CommitRecord[];
}