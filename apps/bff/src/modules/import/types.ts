export type NormalizedRow = {
  email?: string;
  givenName?: string; // maps to firstName
  familyName?: string; // maps to lastName
  jobTitle?: string;
  department?: string;
  location?: string;
  hireDate?: string;
  managerEmail?: string;
  employeeId?: string;
  startDate?: string;
  birthDate?: string;
  nationality?: string;
  gender?: string;
  phone?: string;
};

export type ValidationResult = {
  rows: number;
  valid: number;
  invalid: number;
  requiredHeaders: string[];
  missingHeaders: string[];
  inferredHeaders: string[];
  preview: NormalizedRow[];
  sampleErrors: { row: number; message: string }[];
};

export type CommitOverview = {
  creates: number;
  updates: number;
  skips: number;
  duplicates: number;
  invalid: number;
  newDepartments: string[];
  newLocations: string[];
  managerMissing?: number;
  managerCycles?: number;
  managerSelf?: number;
};

export type CommitRecord = {
  action: 'create' | 'update' | 'skip' | 'invalid';
  reason?: string[];
  incoming: NormalizedRow;
  changes?: Array<{ field: string; from: any; to: any }>;
};

export type CommitResponse = {
  overview: CommitOverview;
  records: CommitRecord[];
};

export type ApplyResultRow = {
  email: string | null;
  action: 'created' | 'updated' | 'skipped' | 'error';
  userId?: string;
  department?: string | null;
  departmentCreated?: boolean;
  membershipLinked?: boolean;
  location?: string | null;
  locationCreated?: boolean;
  ignoredFields?: string[];
  message?: string;
};

export type ApplyReport = {
  createdUsers: number;
  updatedUsers: number;
  skipped: number;
  errors: number;
  departmentsCreated: number;
  membershipsLinked: number;
  locationsCreated: number;
  rows: ApplyResultRow[];
};

export type ImportSessionData = {
  id: string;
  orgId: string;
  userId: string;
  filename: string;
  fileSize: number;
  csvSha256: string;
  status: 'pending' | 'preview' | 'committed' | 'failed' | 'expired';
  planJson?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};