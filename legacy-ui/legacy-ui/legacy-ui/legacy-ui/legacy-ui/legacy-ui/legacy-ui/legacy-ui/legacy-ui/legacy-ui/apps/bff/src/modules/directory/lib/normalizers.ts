import { NormalizedRow } from './types';

export function normalizeEmail(v: any): string | null {
  const email = (v ?? '').toString().trim();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeGender(v: any): string | null {
  const g = (v ?? '').trim().toLowerCase();
  if (!g) return null;
  if (g === 'm' || g === 'male') return 'male';
  if (g === 'f' || g === 'female') return 'female';
  if (['non-binary', 'nonbinary'].includes(g)) return 'non-binary';
  if (g === 'other') return 'other';
  if (g === 'prefer-not-to-say') return 'prefer-not-to-say';
  return g || null;
}

export function normalizeNationality(v: any): string | null {
  const nat = (v ?? '').toString().trim();
  if (!nat) return null;
  return nat.toUpperCase();
}

export function normalizePhoneE164(v: any): string | null {
  const phone = (v ?? '').toString().trim();
  if (!phone) return null;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return null;
  return phone;
}

export function normalizeDatestr(v: any): string | null {
  const date = (v ?? '').toString().trim();
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export function normalizeRow(input: any): NormalizedRow {
  return {
    email: input.email ?? null,
    givenName: input.givenName ?? null,
    familyName: input.familyName ?? null,
    department: input.department ?? null,
    managerEmail: input.managerEmail ?? null,
    location: input.location ?? null,
    jobTitle: input.jobTitle ?? null,
    employeeId: input.employeeId ?? null,
    startDate: input.startDate ?? null,
    birthDate: input.birthDate ?? null,
    nationality: input.nationality ? input.nationality.toUpperCase() : null,
    gender: normalizeGender(input.gender),
    phone: input.phone ?? null,
  };
}

export function isValidEmail(v: any): boolean {
  const email = (v ?? '').toString().trim();
  return email !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}