export type {
  ImportRow,
  CommitChange,
} from "./compat";
export type {
  CommitRecordCompat as CommitRecord,
  CommitOverviewCompat as CommitOverview,
  CommitPlanCompat as CommitPlan,
  NormalizedRow,
} from "./compat";

export type ManagerDiag = {
  managerMissing: number;
  managerSelf: number;
  managerCycles: number;
  perRecordIssues: Map<string, string[]>; // key=email
};