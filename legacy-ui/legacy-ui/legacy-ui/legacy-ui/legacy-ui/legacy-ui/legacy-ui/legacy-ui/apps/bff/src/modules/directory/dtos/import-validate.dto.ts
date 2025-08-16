import type { CommitPlan, CommitRecord, ImportRow } from '../lib/types';

export class ImportValidateDto {
  // CSV content as a raw string in JSON body
  csv!: string;
}

// Type annotation for contracts alignment  
export interface ValidateResponse extends CommitPlan {}