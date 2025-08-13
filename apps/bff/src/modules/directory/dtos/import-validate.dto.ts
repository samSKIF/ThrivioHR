import type { directory as CDirectory } from '@thrivio/contracts';

export class ImportValidateDto {
  // CSV content as a raw string in JSON body
  csv!: string;
}

// Type annotation for contracts alignment  
export interface ValidateResponse extends CDirectory.CommitPlan {}