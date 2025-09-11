import { NormalizedRow } from './types';

export function normalizeEmail(v: unknown): string | null {
  const email = (v ?? '').toString().trim();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeGender(v: unknown): string | null {
  const g = (v ?? '').toString().trim().toLowerCase();
  if (!g) return null;
  if (g === 'm' || g === 'male') return 'male';
  if (g === 'f' || g === 'female') return 'female';
  if (['non-binary', 'nonbinary'].includes(g)) return 'non-binary';
  if (g === 'other') return 'other';
  if (g === 'prefer-not-to-say') return 'prefer-not-to-say';
  return g || null;
}

export function normalizeNationality(v: unknown): string | null {
  const nat = (v ?? '').toString().trim();
  if (!nat) return null;
  return nat.toUpperCase();
}

export function normalizePhoneE164(v: unknown): string | null {
  const phone = (v ?? '').toString().trim();
  if (!phone) return null;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return null;
  return phone;
}

export function normalizeDatestr(v: unknown): string | null {
  const date = (v ?? '').toString().trim();
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export function normalizeRow(input: Record<string, unknown>): NormalizedRow {
  return {
    email: input.email as string ?? null,
    // Map CSV template fields to expected fields
    givenName: (input.givenName || input.name) as string ?? null,
    familyName: (input.familyName || input.surname) as string ?? null,
    department: input.department as string ?? null,
    managerEmail: (input.managerEmail || input.manager_email) as string ?? null,
    location: input.location as string ?? null,
    jobTitle: (input.jobTitle || input.job_title) as string ?? null,
    employeeId: (input.employeeId || input.employee_id) as string ?? null,
    hireDate: (input.hireDate || input.hire_date) as string ?? null,
    birthDate: (input.birthDate || input.birth_date) as string ?? null,
    nationality: input.nationality ? (input.nationality as string).toUpperCase() : null,
    gender: normalizeGender(input.gender || input.sex),
    phone: (input.phone || input.phone_number) as string ?? null,
  };
}

export function isValidEmail(v: unknown): boolean {
  const email = (v ?? '').toString().trim();
  return email !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}