import { NormalizedRow } from './types';

export function collectNewDepartments(rows: NormalizedRow[], existingLower: Set<string>): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const n = (r.department ?? '').trim().toLowerCase();
    if (n) set.add(n);
  }
  return Array.from(set).filter(n => !existingLower.has(n));
}

export function collectNewLocations(rows: NormalizedRow[], existingLower: Set<string>): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const n = (r.location ?? '').trim().toLowerCase();
    if (n) set.add(n);
  }
  return Array.from(set).filter(n => !existingLower.has(n));
}