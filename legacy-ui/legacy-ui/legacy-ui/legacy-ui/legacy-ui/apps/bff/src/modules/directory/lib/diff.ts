// Extract compare/mapping logic for action & changes (no DB; pure).
import { NormalizedRow } from './types';

export type DiffResult = {
  action: 'create' | 'update' | 'skip' | 'invalid';
  changes: Array<{ field: string; from: any; to: any }>;
};

export function computeDiff(existing: any | null, row: NormalizedRow): DiffResult {
  if (!existing) return { action: 'create', changes: [] };

  const changes: Array<{ field: string; from: any; to: any }> = [];
  // map: givenName -> firstName, familyName -> lastName, plus safe fields we already support
  const pairs: Array<[keyof NormalizedRow, string]> = [
    ['givenName', 'firstName'],
    ['familyName', 'lastName'],
    ['jobTitle', 'jobTitle'],
    ['employeeId', 'employeeId'],
    ['startDate', 'startDate'],
    ['birthDate', 'birthDate'],
    ['nationality', 'nationality'],
    ['gender', 'gender'],
    ['phone', 'phone'],
  ];

  for (const [incomingKey, existingKey] of pairs) {
    const nextVal = (row[incomingKey] ?? null);
    const prevVal = (existing as any)[existingKey] ?? null;
    if (nextVal !== null && nextVal !== prevVal) {
      changes.push({ field: String(existingKey), from: prevVal, to: nextVal });
    }
  }

  return { action: changes.length ? 'update' : 'skip', changes };
}