import type { directory as CDirectory } from '@thrivio/contracts';

type Extras = Record<string, unknown>;

// Base contract aliases (for clarity)
export type ImportRow = CDirectory.ImportRow;
export type CommitChange = CDirectory.CommitChange;
export type CommitRecordBase = CDirectory.CommitRecord;
export type CommitOverviewBase = CDirectory.CommitOverview;
export type CommitPlanBase = CDirectory.CommitPlan;

// Current implementation sometimes accesses record.email directly and flags like managerResolved;
// and may stash extra counters/keys on overview/plan. Keep those optional to avoid behavior changes.
export type CommitRecordCompat = CommitRecordBase & {
  email?: string;
  managerResolved?: boolean;
} & Extras;

export type CommitOverviewCompat = CommitOverviewBase & Extras;
export type CommitPlanCompat = CommitPlanBase & Extras;

// KEEP internal NormalizedRow shape used by normalizers (assignable from ImportRow)
export type NormalizedRow = {
  email: string|null;
  givenName: string|null;
  familyName: string|null;
  department?: string|null;
  location?: string|null;
  managerEmail?: string|null;
  jobTitle?: string|null;
  employeeId?: string|null;
  startDate?: string|null;
  birthDate?: string|null;
  nationality?: string|null;
  gender?: string|null;
  phone?: string|null;
};