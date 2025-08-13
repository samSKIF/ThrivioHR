import type {
  ImportRow as TImportRow,
  CommitChange as TCommitChange,
  CommitRecord as TCommitRecord,
  CommitOverview as TCommitOverview,
  CommitPlan as TCommitPlan,
} from "@thrivio/contracts";

type Extras = Record<string, unknown>;

export type ImportRow = TImportRow;
export type CommitChange = TCommitChange;

// Allow extra fields (e.g., email, managerResolved) and tolerate missing strict ones for now
export type CommitRecordCompat = Partial<TCommitRecord> & {
  email?: string;
  managerResolved?: boolean;
} & Extras;

export type CommitOverviewCompat = Partial<TCommitOverview> & Extras;

export type CommitPlanCompat = {
  overview: CommitOverviewCompat;
  records: CommitRecordCompat[];
} & Extras;

// Keep internal NormalizedRow (assignable from ImportRow)
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