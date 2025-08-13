import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IdentityRepository } from '../identity/identity.repository';
import { signSession, verifySession } from './lib/token';
import { collectNewDepartments, collectNewLocations } from './lib/depts_locs';
import { buildEmailMap, diagnoseManagers } from './lib/managers';
import { parseAndNormalizeCsv } from './lib/csv';
import { computeDiff } from './lib/diff';
import { summarize } from './lib/overview';
import type { NormalizedRow, CommitRecord, CommitOverview, ImportRow } from './lib/types';
import * as crypto from 'crypto';
import { getJwtSecret } from '../../env';

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

    const parsed = parseAndNormalizeCsv(csv);
    const missingHeaders = REQUIRED.filter(h => !parsed.headers.includes(h));
    
    const preview = parsed.normalized.slice(0, 3);
    const validCount = parsed.normalized.length - parsed.errors.length;

    return {
      rows: parsed.normalized.length,
      valid: validCount,
      invalid: parsed.errors.length,
      requiredHeaders: REQUIRED,
      missingHeaders,
      inferredHeaders: parsed.headers,
      preview,
      sampleErrors: parsed.errors.slice(0, 5)
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

    const parsed = parseAndNormalizeCsv(csv);
    const missingHeaders = REQUIRED.filter(h => !parsed.headers.includes(h));
    
    const validRows = parsed.normalized.filter((_, idx) => 
      !parsed.errors.some(e => e.row === idx + 2)
    );
    
    return {
      rows: parsed.normalized.length,
      valid: validRows.length,
      invalid: parsed.errors.length,
      requiredHeaders: REQUIRED,
      missingHeaders,
      inferredHeaders: parsed.headers,
      preview: parsed.normalized.slice(0, 3),
      proposedUsers: validRows,
      sampleErrors: parsed.errors.slice(0, 5)
    };
  }



  async commitPlan(csv: string, orgId: string, dryRun = false): Promise<CommitResponse> {
    if (!csv?.trim()) {
      return {
        overview: {
          rows: 0, creates: 0, updates: 0, skips: 0,
          duplicateEmails: [], managerMissing: 0, newDepartments: [], newLocations: []
        },
        records: [{
          email: null, action: 'skip',
          reason: ['CSV body is empty'],
          incoming: {}, managerResolved: false
        }]
      };
    }

    const parsed = parseAndNormalizeCsv(csv);
    const missingHeaders = REQUIRED.filter(h => !parsed.headers.includes(h));
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
    for (const row of parsed.normalized) {
      const e = (row.email ?? '').trim().toLowerCase();
      if (!e) continue;
      if (seen.has(e)) dups.add(e); else seen.add(e);
    }

    // existing departments and locations in org
    const existingDepts = new Set((await this.identity.listDistinctDepartments(orgId)).map(d => d.trim().toLowerCase()));
    const existingLocs = new Set((await this.identity.listDistinctLocations(orgId)).map(l => l.trim().toLowerCase()));
    const out: CommitRecord[] = [];
    let creates = 0, updates = 0, skips = 0, managerMissing = 0;

    for (const row of parsed.normalized) {
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
        // detect diffs using computeDiff helper
        const diffResult = computeDiff(current, row);
        const diffs = diffResult.changes.map(c => c.field);

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
    const newDepartments = collectNewDepartments(parsed.normalized, existingDepts);
    const newLocations = collectNewLocations(parsed.normalized, existingLocs);

    // Enhanced manager graph diagnostics
    const emailMap = buildEmailMap(parsed.normalized);
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
    const diag = await diagnoseManagers(parsed.normalized, resolveManager);

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
      rows: parsed.normalized.length,
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
    const token = signSession(payload, getJwtSecret());
    return { token, overview: plan.overview };
  }

  previewImportSession(token: string) {
    const { overview, records } = verifySession(token, getJwtSecret());
    return { overview, records };
  }

  async applyImportSession(token: string, orgIdFromJwt: string): Promise<ApplyReport> {
    let payload: any;
    try {
      payload = verifySession(token, getJwtSecret());
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