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