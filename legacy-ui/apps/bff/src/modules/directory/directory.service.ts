import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

type ValidationResult = {
  rows: number;
  valid: number;
  invalid: number;
  requiredHeaders: string[];
  missingHeaders: string[];
  inferredHeaders: string[];
  preview: any[]; // first 3 normalized rows
  sampleErrors: { row: number; message: string }[];
};

const REQUIRED = ['email', 'givenName', 'familyName'];
const OPTIONAL = ['jobTitle', 'department', 'managerEmail', 'location', 'employeeId', 'startDate'];

@Injectable()
export class DirectoryService {
  validate(csv: string): ValidationResult {
    if (!csv?.trim()) {
      return {
        rows: 0, valid: 0, invalid: 0,
        requiredHeaders: REQUIRED, missingHeaders: REQUIRED,
        inferredHeaders: [], preview: [], sampleErrors: [{ row: 0, message: 'CSV body is empty' }]
      };
    }

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const missingHeaders = REQUIRED.filter(h => !headers.includes(h));

    const errors: { row: number; message: string }[] = [];
    let valid = 0;

    records.forEach((r, idx) => {
      const rowNum = idx + 2; // header is line 1
      const rowErrors: string[] = [];

      // Required fields
      REQUIRED.forEach(h => {
        const val = (r[h] ?? '').toString().trim();
        if (!val) rowErrors.push(`Missing required field: ${h}`);
      });

      // Basic email check
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
        rowErrors.push('Invalid email format');
      }

      if (rowErrors.length) {
        errors.push({ row: rowNum, message: rowErrors.join('; ') });
      } else {
        valid += 1;
      }
    });

    const preview = records.slice(0, 3).map(r => {
      // normalize a few common fields
      return {
        email: r.email ?? null,
        givenName: r.givenName ?? null,
        familyName: r.familyName ?? null,
        department: r.department ?? null,
        managerEmail: r.managerEmail ?? null,
        location: r.location ?? null,
        jobTitle: r.jobTitle ?? null,
        employeeId: r.employeeId ?? null,
        startDate: r.startDate ?? null
      };
    });

    return {
      rows: records.length,
      valid,
      invalid: errors.length,
      requiredHeaders: REQUIRED,
      missingHeaders,
      inferredHeaders: headers,
      preview,
      sampleErrors: errors.slice(0, 5)
    };
  }
}