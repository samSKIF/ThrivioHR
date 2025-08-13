import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { IdentityRepository } from '../identity/identity.repository';
import { normalizeRow, isValidEmail } from './lib/normalizers';
import { signSession, verifySession } from './lib/token';
import { collectNewDepartments, collectNewLocations } from './lib/depts_locs';
import { buildEmailMap, diagnoseManagers } from './lib/managers';
import type { NormalizedRow } from './lib/types';
import * as crypto from 'crypto';

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

type CommitAction = 'create' | 'update' | 'skip';
type CommitRecord = {
  email: string | null;
  action: CommitAction;
  diffs?: string[];
  reason?: string[];
  incoming: any;
  current?: any;
  managerResolved: boolean;
  managerUserId?: string | null;
};
type CommitOverview = {
  rows: number;
  creates: number;
  updates: number;
  skips: number;
  duplicateEmails: string[];
  managerMissing: number;
  managerCycles?: number;
  managerSelf?: number;
  newDepartments: string[];
  newLocations: string[];
};
type CommitResponse = {
  overview: CommitOverview;
  records: CommitRecord[];
};

type ApplyResultRow = {
  email: string|null;
  action: 'created'|'updated'|'skipped'|'error';
  userId?: string;
  department?: string|null;
  departmentCreated?: boolean;
  membershipLinked?: boolean;
  location?: string|null;
  locationCreated?: boolean;
  ignoredFields?: string[];
  message?: string;
};
type ApplyReport = {
  createdUsers: number;
  updatedUsers: number;
  skipped: number;
  errors: number;
  departmentsCreated: number;
  membershipsLinked: number;
  locationsCreated: number;
  rows: ApplyResultRow[];
};

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;



const REQUIRED = ['email', 'givenName', 'familyName'];
const OPTIONAL = [
  'jobTitle','department','managerEmail','location','employeeId','startDate',
  'birthDate','nationality','gender','phone'
];

@Injectable()
export class DirectoryService {
  constructor(@Inject(IdentityRepository) private readonly identity: IdentityRepository) {}
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



  async commitPlan(csv: string, orgId: string, dryRun = false): Promise<CommitResponse> {
    const records = csv?.trim()
      ? (parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<string,string>[])
      : [];
    const headers = records.length ? Object.keys(records[0]) : [];
    const missingHeaders = REQUIRED.filter(h => !headers.includes(h));
    if (missingHeaders.length) {
      return {
        overview: {
          rows: 0, creates: 0, updates: 0, skips: 0,
          duplicateEmails: [], managerMissing: 0, newDepartments: [], newLocations: []
        },
        records: [{
          email: null, action: 'skip',
          reason: [`Missing required headers: ${missingHeaders.join(', ')}`],
          incoming: {}, managerResolved: false
        }]
      };
    }
    // CSV duplicate detection
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const r of records) {
      const e = (r.email ?? '').trim().toLowerCase();
      if (!e) continue;
      if (seen.has(e)) dups.add(e); else seen.add(e);
    }

    // existing departments and locations in org
    const existingDepts = new Set((await this.identity.listDistinctDepartments(orgId)).map(d => d.trim().toLowerCase()));
    const existingLocs = new Set((await this.identity.listDistinctLocations(orgId)).map(l => l.trim().toLowerCase()));
    const out: CommitRecord[] = [];
    let creates = 0, updates = 0, skips = 0, managerMissing = 0;

    // normalize rows
    const normalized = records.map(r => normalizeRow(r));

    for (const row of normalized) {
      const reason: string[] = [];
      if (!row.email || !row.givenName || !row.familyName) {
        out.push({ email: row.email, action: 'skip', reason: ['Missing required fields'], incoming: row, managerResolved: false });
        skips++;
        continue;
      }
      if (dups.has((row.email || '').toLowerCase())) {
        reason.push('Duplicate email in CSV');
      }

      const current = await this.identity.findUserByEmailOrg(row.email!, orgId);

      // Basic validation only - manager resolution will be done later with enhanced diagnostics

      if (!current) {
        creates++;
        out.push({ email: row.email, action: 'create', reason, incoming: row, managerResolved: false });
      } else {
        // detect diffs across supported fields (CSV as source-of-truth on commit)
        const diffs: string[] = [];
        const cmp = (k: keyof typeof row, curVal: any) => {
          const inc = (row as any)[k];
          if ((inc ?? null) !== (curVal ?? null)) diffs.push(String(k));
        };
        cmp('givenName', (current as any).firstName);
        cmp('familyName', (current as any).lastName);
        cmp('jobTitle', (current as any).jobTitle);
        cmp('department', (current as any).department);
        cmp('location', (current as any).location);
        cmp('employeeId', (current as any).employeeId);
        cmp('startDate', (current as any).startDate);
        cmp('birthDate', (current as any).birthDate);
        cmp('nationality', (current as any).nationality);
        cmp('gender', (current as any).gender);
        cmp('phone', (current as any).phone);

        if (diffs.length === 0 && !row.managerEmail) {
          skips++;
          out.push({ email: row.email, action: 'skip', reason, incoming: row, current: { id: (current as any).id }, managerResolved: false });
        } else {
          updates++;
          out.push({
            email: row.email,
            action: 'update',
            diffs, reason,
            incoming: row,
            current: {
              id: (current as any).id,
              givenName: (current as any).firstName,
              familyName: (current as any).lastName,
              jobTitle: (current as any).jobTitle,
              department: (current as any).department,
              location: (current as any).location,
              employeeId: (current as any).employeeId,
              startDate: (current as any).startDate,
              birthDate: (current as any).birthDate,
              nationality: (current as any).nationality,
              gender: (current as any).gender,
              phone: (current as any).phone
            },
            managerResolved: false
          });
        }
      }
    }

    // compute new departments and locations from CSV vs existing
    const newDepartments = collectNewDepartments(normalized, existingDepts);
    const newLocations = collectNewLocations(normalized, existingLocs);

    // Enhanced manager graph diagnostics
    const emailMap = buildEmailMap(normalized);
    const resolveManager = async (mEmail: string): Promise<'db'|'csv'|null> => {
      const key = (mEmail ?? '').trim().toLowerCase();
      if (!key) return null;
      // 1) Try DB
      const u = await this.identity.findUserByEmailOrg(key, orgId);
      if (u) return 'db';
      // 2) Try batch: if the manager will be created in this CSV
      if (emailMap.has(key)) return 'csv';
      return null;
    };
    const diag = await diagnoseManagers(normalized, resolveManager);

    // Per-record manager resolution and issues; merge diag.perRecordIssues into each record's reason[]
    const outWithManagers: CommitRecord[] = [];
    for (const rec of out) {
      const email = (rec.incoming?.email ?? '').trim().toLowerCase();
      const mEmail = rec.incoming?.managerEmail ?? null;
      const issues = diag.perRecordIssues.get(email) || [];
      let resolved = false;
      let managerUserId: string|null = null;

      if (mEmail) {
        const res = await resolveManager(mEmail);
        if (res === 'db') {
          resolved = true;
          const u = await this.identity.findUserByEmailOrg(mEmail, orgId);
          managerUserId = (u as any)?.id ?? null;
        } else if (res === 'csv') {
          resolved = true; managerUserId = null;
        }
      }

      // Merge into record
      outWithManagers.push({
        ...rec,
        managerResolved: resolved,
        managerUserId,
        reason: [...(rec.reason ?? []), ...issues],
      });
    }

    // Replace original out with enriched version and update overview with diag counters
    const enrichedOut = outWithManagers;
    const overview: CommitOverview = {
      rows: normalized.length,
      creates, updates, skips,
      duplicateEmails: Array.from(dups.values()),
      managerMissing: diag.managerMissing,
      managerCycles: diag.managerCycles,
      managerSelf: diag.managerSelf,
      newDepartments,
      newLocations
    };

    return {
      overview,
      records: enrichedOut
    };
  }

  async createImportSession(csv: string, orgId: string, userId: string) {
    const plan = await this.commitPlan(csv, orgId, true); // reuses dry-run planner
    const payload = {
      v: 1,
      orgId,
      userId,
      createdAt: Date.now(),
      exp: Date.now() + SESSION_TTL_MS,
      sha256: crypto.createHash('sha256').update(csv, 'utf8').digest('hex'),
      overview: plan.overview,
      records: plan.records, // embed records for preview
    };
    const token = signSession(payload, process.env.JWT_SECRET || 'dev-secret');
    return { token, overview: plan.overview };
  }

  previewImportSession(token: string) {
    const { overview, records } = verifySession(token, process.env.JWT_SECRET || 'dev-secret');
    return { overview, records };
  }

  async applyImportSession(token: string, orgIdFromJwt: string): Promise<ApplyReport> {
    let payload: any;
    try {
      payload = verifySession(token, process.env.JWT_SECRET || 'dev-secret');
    } catch (e: any) {
      throw new BadRequestException(`Invalid or expired session token: ${e?.message || 'unknown'}`);
    }
    if (!payload?.orgId || payload.orgId !== orgIdFromJwt) {
      throw new BadRequestException('Session/org mismatch.');
    }

    const rows: ApplyResultRow[] = [];
    let createdUsers = 0, updatedUsers = 0, skipped = 0, errors = 0, departmentsCreated = 0, membershipsLinked = 0, locationsCreated = 0;

    for (const rec of payload.records as any[]) {
      const email = rec?.incoming?.email ?? null;
      const deptName = rec?.incoming?.department ?? null;
      const locName = rec?.incoming?.location ?? null;

      const ignoredFields: string[] = [];
      // These fields are not in the users schema yet; mark as ignored:
      ['jobTitle','employeeId','startDate','birthDate','nationality','gender','phone','managerEmail']
        .forEach(f => { if (rec?.incoming?.[f] != null) ignoredFields.push(f); });

      try {
        if (!email || !rec?.action) {
          skipped++; rows.push({ email, action: 'skipped', ignoredFields, message: 'Missing email or action' });
          continue;
        }

        // Determine create/update from planner's decision.
        if (rec.action === 'create') {
          const user = await this.identity.findUserByEmailOrg(email, payload.orgId);
          const firstName = rec.incoming?.givenName ?? null;
          const lastName  = rec.incoming?.familyName ?? null;

          const u = user ?? await this.identity.createUser(payload.orgId, email, firstName || '', lastName || '');
          if (!user) createdUsers++; else updatedUsers++; // if user existed, treat as update via name sync below

          if (user) {
            await this.identity.updateUserNames(user.id, firstName, lastName);
          }

          let departmentCreated = false;
          let membershipLinkedFlag = false;
          let locationCreated = false;
          if (deptName) {
            const { dept, created: deptCreated } = await this.identity.findOrCreateDepartment(payload.orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identity.ensureMembership(u.id, dept.id);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true; // Keep per-row membershipLinked: true as-is (still useful to the UI)
            }
          }
          if (locName) {
            const { loc, created: locCreated } = await this.identity.findOrCreateLocation(payload.orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreated = locCreated;
          }

          rows.push({
            email, action: user ? 'updated' : 'created',
            userId: (user ? user.id : u.id),
            department: deptName,
            membershipLinked: membershipLinkedFlag,
            location: locName,
            locationCreated,
            ignoredFields
          });
        } else if (rec.action === 'update') {
          const user = await this.identity.findUserByEmailOrg(email, payload.orgId);
          if (!user) {
            // Safety: if planner said update but user disappeared, create now.
            const firstName = rec.incoming?.givenName ?? '';
            const lastName  = rec.incoming?.familyName ?? '';
            const u = await this.identity.createUser(payload.orgId, email, firstName, lastName);
            createdUsers++;
            let membershipLinkedFlag = false;
            let locationCreated = false;
            if (deptName) {
              const { dept, created: deptCreated } = await this.identity.findOrCreateDepartment(payload.orgId, deptName);
              if (deptCreated) departmentsCreated++;
              if (dept) {
                const { created: membershipCreated } = await this.identity.ensureMembership(u.id, dept.id);
                if (membershipCreated) membershipsLinked++;
                membershipLinkedFlag = true; // Keep per-row membershipLinked: true as-is (still useful to the UI)
              }
            }
            if (locName) {
              const { loc, created: locCreated } = await this.identity.findOrCreateLocation(payload.orgId, locName);
              if (locCreated) locationsCreated++;
              locationCreated = locCreated;
            }
            rows.push({ email, action: 'created', userId: u.id, department: deptName, membershipLinked: membershipLinkedFlag, location: locName, locationCreated, ignoredFields });
            continue;
          }

          const firstName = rec.incoming?.givenName ?? null;
          const lastName  = rec.incoming?.familyName ?? null;
          await this.identity.updateUserNames(user.id, firstName, lastName);
          updatedUsers++;

          let membershipLinkedFlag = false;
          let locationCreated = false;
          if (deptName) {
            const { dept, created: deptCreated } = await this.identity.findOrCreateDepartment(payload.orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identity.ensureMembership(user.id, dept.id);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true; // Keep per-row membershipLinked: true as-is (still useful to the UI)
            }
          }
          if (locName) {
            const { loc, created: locCreated } = await this.identity.findOrCreateLocation(payload.orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreated = locCreated;
          }

          rows.push({ email, action: 'updated', userId: user.id, department: deptName, membershipLinked: membershipLinkedFlag, location: locName, locationCreated, ignoredFields });
        } else {
          skipped++; rows.push({ email, action: 'skipped', department: deptName, location: locName, ignoredFields });
        }
      } catch (e: any) {
        errors++;
        rows.push({ email, action: 'error', department: deptName, location: locName, ignoredFields, message: e?.message || 'unknown error' });
      }
    }

    // departmentsCreated and membershipsLinked are now counted precisely above

    return {
      createdUsers, updatedUsers, skipped, errors,
      departmentsCreated,
      membershipsLinked,
      locationsCreated,
      rows,
    };
  }
}