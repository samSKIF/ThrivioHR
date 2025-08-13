import type { directory as CDirectory } from '@thrivio/contracts';

export class ImportCommitDto {
  csv!: string;
  dryRun!: boolean;
}

// Type annotations for contracts alignment
export interface CommitResponse {
  overview: CDirectory.CommitOverview;
  records: CDirectory.CommitRecord[];
}