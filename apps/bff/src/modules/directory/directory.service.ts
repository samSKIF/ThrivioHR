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
const OPTIONAL = [
  'jobTitle','department','managerEmail','location','employeeId','startDate',
  'birthDate','nationality','gender','phone'
];

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

      // managerEmail: if present, validate like email
      if (r.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.managerEmail)) {
        rowErrors.push('Invalid managerEmail format');
      }

      // birthDate: if present, must be YYYY-MM-DD, not in the future, age >= 14
      if (r.birthDate) {
        const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!birthDateRegex.test(r.birthDate)) {
          rowErrors.push('Invalid birthDate format (must be YYYY-MM-DD)');
        } else {
          const birthDate = new Date(r.birthDate);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();
          const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
          
          if (birthDate > today) {
            rowErrors.push('birthDate cannot be in the future');
          } else if (actualAge < 14) {
            rowErrors.push('Age must be at least 14 years');
          }
        }
      }

      // nationality: if present, must be ISO 3166-1 alpha-2 (A–Z, length 2)
      if (r.nationality && !/^[A-Za-z]{2}$/.test(r.nationality)) {
        rowErrors.push('Invalid nationality format (must be 2-letter ISO code)');
      }

      // gender: if present, accept (case-insensitive) one of: male, female, non-binary, other, prefer-not-to-say, or short forms m/f
      if (r.gender) {
        const genderLower = r.gender.toLowerCase();
        const validGenders = ['male', 'female', 'non-binary', 'other', 'prefer-not-to-say', 'm', 'f'];
        if (!validGenders.includes(genderLower)) {
          rowErrors.push('Invalid gender (must be: male, female, non-binary, other, prefer-not-to-say, m, f)');
        }
      }

      // phone: if present, must be E.164: ^\+[1-9]\d{7,14}$
      if (r.phone && !/^\+[1-9]\d{7,14}$/.test(r.phone)) {
        rowErrors.push('Invalid phone format (must be E.164: +1234567890)');
      }

      if (rowErrors.length) {
        errors.push({ row: rowNum, message: rowErrors.join('; ') });
      } else {
        valid += 1;
      }
    });

    const preview = records.slice(0, 3).map(r => {
      // normalize gender
      const normalizeGender = (gender: string) => {
        if (!gender) return null;
        const g = gender.toLowerCase();
        if (g === 'm' || g === 'male') return 'male';
        if (g === 'f' || g === 'female') return 'female';
        if (g === 'non-binary') return 'non-binary';
        if (g === 'other') return 'other';
        if (g === 'prefer-not-to-say') return 'prefer-not-to-say';
        return gender; // fallback to original if invalid
      };
      
      return {
        email: r.email ?? null,
        givenName: r.givenName ?? null,
        familyName: r.familyName ?? null,
        department: r.department ?? null,
        managerEmail: r.managerEmail ?? null,
        location: r.location ?? null,
        jobTitle: r.jobTitle ?? null,
        employeeId: r.employeeId ?? null,
        startDate: r.startDate ?? null,
        birthDate: r.birthDate ?? null,
        nationality: r.nationality ? r.nationality.toUpperCase() : null,
        gender: normalizeGender(r.gender),
        phone: r.phone ?? null
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

  plan(csv: string) {
    if (!csv?.trim()) {
      return {
        rows: 0, valid: 0, invalid: 0,
        requiredHeaders: REQUIRED, missingHeaders: REQUIRED,
        inferredHeaders: [], preview: [], proposedUsers: [],
        sampleErrors: [{ row: 0, message: 'CSV body is empty' }]
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

    // Same validation logic as validate method
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

      // managerEmail: if present, validate like email
      if (r.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.managerEmail)) {
        rowErrors.push('Invalid managerEmail format');
      }

      // birthDate: if present, must be YYYY-MM-DD, not in the future, age >= 14
      if (r.birthDate) {
        const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!birthDateRegex.test(r.birthDate)) {
          rowErrors.push('Invalid birthDate format (must be YYYY-MM-DD)');
        } else {
          const birthDate = new Date(r.birthDate);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const dayDiff = today.getDate() - birthDate.getDate();
          const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
          
          if (birthDate > today) {
            rowErrors.push('birthDate cannot be in the future');
          } else if (actualAge < 14) {
            rowErrors.push('Age must be at least 14 years');
          }
        }
      }

      // nationality: if present, must be ISO 3166-1 alpha-2 (A–Z, length 2)
      if (r.nationality && !/^[A-Za-z]{2}$/.test(r.nationality)) {
        rowErrors.push('Invalid nationality format (must be 2-letter ISO code)');
      }

      // gender: if present, accept (case-insensitive) one of: male, female, non-binary, other, prefer-not-to-say, or short forms m/f
      if (r.gender) {
        const genderLower = r.gender.toLowerCase();
        const validGenders = ['male', 'female', 'non-binary', 'other', 'prefer-not-to-say', 'm', 'f'];
        if (!validGenders.includes(genderLower)) {
          rowErrors.push('Invalid gender (must be: male, female, non-binary, other, prefer-not-to-say, m, f)');
        }
      }

      // phone: if present, must be E.164: ^\+[1-9]\d{7,14}$
      if (r.phone && !/^\+[1-9]\d{7,14}$/.test(r.phone)) {
        rowErrors.push('Invalid phone format (must be E.164: +1234567890)');
      }

      if (rowErrors.length) {
        errors.push({ row: rowNum, message: rowErrors.join('; ') });
      } else {
        valid += 1;
      }
    });

    // normalize gender function
    const normalizeGender = (gender: string) => {
      if (!gender) return null;
      const g = gender.toLowerCase();
      if (g === 'm' || g === 'male') return 'male';
      if (g === 'f' || g === 'female') return 'female';
      if (g === 'non-binary') return 'non-binary';
      if (g === 'other') return 'other';
      if (g === 'prefer-not-to-say') return 'prefer-not-to-say';
      return gender; // fallback to original if invalid
    };

    const preview = records.slice(0, 3).map(r => ({
      email: r.email ?? null,
      givenName: r.givenName ?? null,
      familyName: r.familyName ?? null,
      department: r.department ?? null,
      managerEmail: r.managerEmail ?? null,
      location: r.location ?? null,
      jobTitle: r.jobTitle ?? null,
      employeeId: r.employeeId ?? null,
      startDate: r.startDate ?? null,
      birthDate: r.birthDate ?? null,
      nationality: r.nationality ? r.nationality.toUpperCase() : null,
      gender: normalizeGender(r.gender),
      phone: r.phone ?? null
    }));

    const proposedUsers = records.filter((_, idx) => {
      const rowNum = idx + 2;
      return !errors.some(e => e.row === rowNum);
    }).map(r => ({
      email: r.email ?? null,
      givenName: r.givenName ?? null,
      familyName: r.familyName ?? null,
      department: r.department ?? null,
      managerEmail: r.managerEmail ?? null,
      location: r.location ?? null,
      jobTitle: r.jobTitle ?? null,
      employeeId: r.employeeId ?? null,
      startDate: r.startDate ?? null,
      birthDate: r.birthDate ?? null,
      nationality: r.nationality ? r.nationality.toUpperCase() : null,
      gender: normalizeGender(r.gender),
      phone: r.phone ?? null
    }));

    return {
      rows: records.length,
      valid,
      invalid: errors.length,
      requiredHeaders: REQUIRED,
      missingHeaders,
      inferredHeaders: headers,
      preview,
      proposedUsers,
      sampleErrors: errors.slice(0, 5)
    };
  }
}