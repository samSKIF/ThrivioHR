// Extract the CSV parse + header validation (no DB calls here).
import { parse } from 'csv-parse/sync';
import { NormalizedRow } from './types';
import { normalizeRow, isValidEmail, normalizeEmail, normalizeDatestr } from './normalizers';

export type ParsedCsv = {
  headers: string[];
  rawRows: Record<string, unknown>[];
  normalized: NormalizedRow[];
  errors: Array<{ row: number; message: string }>;
};

export function parseAndNormalizeCsv(csv: string): ParsedCsv {
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, unknown>[];
  const headers = Object.keys(records[0] ?? {});
  const errors: Array<{ row: number; message: string }> = [];
  const normalized: NormalizedRow[] = [];

  records.forEach((r, idx) => {
    const n = normalizeRow(r);
    const rowNum = idx + 2; // +2 because headers take row 1 and CSV rows are 1-indexed
    
    // Enhanced email validation
    if (!n.email) {
      errors.push({ row: rowNum, message: 'Missing email address' });
    } else {
      const normalizedEmail = normalizeEmail(n.email);
      if (!normalizedEmail) {
        errors.push({ row: rowNum, message: 'Invalid email format - must be like user@domain.com' });
      }
    }
    
    // Enhanced date validation for hireDate
    if (n.hireDate) {
      const normalizedDate = normalizeDatestr(n.hireDate);
      if (!normalizedDate) {
        errors.push({ row: rowNum, message: 'Invalid hireDate format - must be YYYY-MM-DD (e.g., 2024-01-15)' });
      }
    }
    
    // Enhanced date validation for birthDate if present
    if (n.birthDate) {
      const normalizedBirthDate = normalizeDatestr(n.birthDate);
      if (!normalizedBirthDate) {
        errors.push({ row: rowNum, message: 'Invalid birthDate format - must be YYYY-MM-DD (e.g., 1990-05-20)' });
      }
    }
    
    normalized.push(n);
  });

  return { headers, rawRows: records, normalized, errors };
}