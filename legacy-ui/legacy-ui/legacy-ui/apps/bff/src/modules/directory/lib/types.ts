export type {
  ImportRow,
  CommitChange,
  CommitRecord,
  CommitOverview,
  CommitPlan,
} from "@thrivio/contracts";
export type { NormalizedRow } from "./compat";

export type ManagerDiag = {
  managerMissing: number;
  managerSelf: number;
  managerCycles: number;
  perRecordIssues: Map<string, string[]>; // key=email
};