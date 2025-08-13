import type { directory as CDirectory } from '@thrivio/contracts';

export type ImportRow = CDirectory.ImportRow;
export type CommitChange = CDirectory.CommitChange;
export type CommitRecord = CDirectory.CommitRecord;
export type CommitOverview = CDirectory.CommitOverview;
export type CommitPlan = CDirectory.CommitPlan;

// Keep NormalizedRow for internal normalization processing
export type NormalizedRow = {
  email: string | null;
  givenName: string | null;
  familyName: string | null;
  department?: string | null;
  location?: string | null;
  managerEmail?: string | null;
  jobTitle?: string | null;
  employeeId?: string | null;
  startDate?: string | null;
  birthDate?: string | null;
  nationality?: string | null;
  gender?: string | null;
  phone?: string | null;
};

export type ManagerDiag = {
  managerMissing: number;
  managerSelf: number;
  managerCycles: number;
  perRecordIssues: Map<string, string[]>; // key=email
};