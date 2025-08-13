import { z } from 'zod';
import { Email, ISODate } from './primitives';

export const ImportRow = z.object({
  email: Email,
  givenName: z.string().nullable().optional(),
  familyName: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  managerEmail: z.string().email().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  startDate: ISODate.nullable().optional(),
  birthDate: ISODate.nullable().optional(),
  nationality: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});
export type ImportRow = z.infer<typeof ImportRow>;

export const CommitChange = z.object({ field: z.string(), from: z.any(), to: z.any() });
export const CommitRecord = z.object({
  incoming: ImportRow,
  action: z.enum(['create','update','skip','invalid']),
  reason: z.array(z.string()).optional(),
  changes: z.array(CommitChange).optional(),
});
export type CommitRecord = z.infer<typeof CommitRecord>;

export const CommitOverview = z.object({
  creates: z.number(),
  updates: z.number(),
  skips: z.number(),
  duplicates: z.number(),
  invalid: z.number(),
  newDepartments: z.array(z.string()).optional(),
  newLocations: z.array(z.string()).optional(),
  managerMissing: z.number().optional(),
  managerSelf: z.number().optional(),
  managerCycles: z.number().optional(),
});
export type CommitOverview = z.infer<typeof CommitOverview>;

export const CommitPlan = z.object({
  overview: CommitOverview,
  records: z.array(CommitRecord),
});
export type CommitPlan = z.infer<typeof CommitPlan>;

export const ImportSessionToken = z.object({
  orgId: z.string(),
  csvSha256: z.string(),
  createdAt: z.number(),
  exp: z.number().optional()
});
export type ImportSessionToken = z.infer<typeof ImportSessionToken>;