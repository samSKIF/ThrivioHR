// Extract the CSV parse + header validation (no DB calls here).
import { parse } from 'csv-parse/sync';
import { NormalizedRow } from './types';
import { normalizeRow, isValidEmail } from './normalizers';

export type ParsedCsv = {
  headers: string[];
  rawRows: any[];
  normalized: NormalizedRow[];
  errors: Array<{ row: number; message: string }>;
};

export function parseAndNormalizeCsv(csv: string): ParsedCsv {
  const records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  const headers = Object.keys(records[0] ?? {});
  const errors: Array<{ row: number; message: string }> = [];
  const normalized: NormalizedRow[] = [];

  records.forEach((r: any, idx: number) => {
    const n = normalizeRow(r);
    if (!n.email || !isValidEmail(n.email)) {
      errors.push({ row: idx + 2, message: 'Invalid or missing email' });
    }
    normalized.push(n);
  });

  return { headers, rawRows: records, normalized, errors };
}