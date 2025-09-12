import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { IdentityPort } from './ports/identity.port';
import { IDENTITY_PORT } from './ports/identity.port';
import { 
  ValidationResult, 
  CommitResponse, 
  ApplyReport, 
  ImportSessionData,
  NormalizedRow,
  CommitOverview,
  CommitRecord,
  ApplyResultRow
} from './types';
import * as crypto from 'crypto';
import { parseAndNormalizeCsv } from '../directory/lib/csv';
import { collectNewDepartments, collectNewLocations } from '../directory/lib/depts_locs';
import { buildEmailMap, diagnoseManagers } from '../directory/lib/managers';
import { computeDiff } from '../directory/lib/diff';
import { Pool } from 'pg';

const REQUIRED_HEADERS = ['email', 'firstName', 'jobTitle', 'department', 'hireDate'];
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class ImportService {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  constructor(@Inject(IDENTITY_PORT) private readonly identityPort: IdentityPort) {}

  /**
   * Validate CSV format and structure
   */
  validateCsv(csv: string): ValidationResult {
    if (!csv?.trim()) {
      return {
        rows: 0, valid: 0, invalid: 0,
        requiredHeaders: REQUIRED_HEADERS, 
        missingHeaders: REQUIRED_HEADERS,
        inferredHeaders: [], 
        preview: [], 
        sampleErrors: [{ row: 0, message: 'CSV body is empty' }]
      };
    }

    const parsed = parseAndNormalizeCsv(csv);
    const missingHeaders = REQUIRED_HEADERS.filter(h => !parsed.headers.includes(h));
    const preview = parsed.normalized.slice(0, 3);
    const validCount = parsed.normalized.length - parsed.errors.length;

    return {
      rows: parsed.normalized.length,
      valid: validCount,
      invalid: parsed.errors.length,
      requiredHeaders: REQUIRED_HEADERS,
      missingHeaders,
      inferredHeaders: parsed.headers,
      preview,
      sampleErrors: parsed.errors.slice(0, 5)
    };
  }

  /**
   * Create import plan from CSV
   */
  async createImportPlan(csv: string, orgId: string): Promise<CommitResponse> {
    if (!csv?.trim()) {
      return {
        overview: {
          creates: 0, updates: 0, skips: 0, duplicates: 0, invalid: 1,
          newDepartments: [], newLocations: []
        },
        records: [{
          action: 'invalid',
          reason: ['CSV body is empty'],
          incoming: { email: '', givenName: '', familyName: '' }
        }]
      };
    }

    const parsed = parseAndNormalizeCsv(csv);
    const missingHeaders = REQUIRED_HEADERS.filter(h => !parsed.headers.includes(h));
    
    if (missingHeaders.length) {
      return {
        overview: {
          creates: 0, updates: 0, skips: 0, duplicates: 0, invalid: 1,
          newDepartments: [], newLocations: []
        },
        records: [{
          action: 'invalid',
          reason: [`Missing required headers: ${missingHeaders.join(', ')}`],
          incoming: { email: '', givenName: '', familyName: '' }
        }]
      };
    }

    // Detect CSV duplicates
    const seen = new Set<string>();
    const dups = new Set<string>();
    for (const row of parsed.normalized) {
      const email = (row.email ?? '').trim().toLowerCase();
      if (!email) continue;
      if (seen.has(email)) dups.add(email); 
      else seen.add(email);
    }

    // Get existing data
    const existingDepts = new Set((await this.identityPort.listDistinctDepartments(orgId)).map(d => d.trim().toLowerCase()));
    const existingLocs = new Set((await this.identityPort.listDistinctLocations(orgId)).map(l => l.trim().toLowerCase()));

    const records: CommitRecord[] = [];
    let creates = 0, updates = 0, skips = 0, invalid = 0;

    for (const row of parsed.normalized) {
      const reason: string[] = [];
      
      // Validate required fields
      if (!row.email || !row.givenName || !row.jobTitle || !row.department || !row.hireDate) {
        const missing = [];
        if (!row.email) missing.push('email');
        if (!row.givenName) missing.push('givenName');
        if (!row.jobTitle) missing.push('jobTitle');
        if (!row.department) missing.push('department');
        if (!row.hireDate) missing.push('hireDate');
        records.push({ 
          action: 'invalid', 
          reason: [`Missing required fields: ${missing.join(', ')}`], 
          incoming: row 
        });
        invalid++;
        continue;
      }

      if (dups.has((row.email || '').toLowerCase())) {
        reason.push('Duplicate email in CSV');
      }

      const currentUser = await this.identityPort.findUserByEmailOrg(row.email!, orgId);

      if (!currentUser) {
        creates++;
        records.push({ action: 'create', reason, incoming: row });
      } else {
        // Check for changes
        const diffResult = computeDiff(currentUser, row);
        const changes = diffResult.changes.map(c => ({ 
          field: c.field, 
          from: c.from ?? null, 
          to: c.to ?? null 
        }));

        if (changes.length === 0 && !row.managerEmail) {
          skips++;
          records.push({ action: 'skip', reason, incoming: row });
        } else {
          updates++;
          records.push({
            action: 'update',
            changes: changes.length ? changes : undefined,
            reason,
            incoming: row
          });
        }
      }
    }

    // Calculate new departments and locations
    const newDepartments = collectNewDepartments(parsed.normalized, existingDepts);
    const newLocations = collectNewLocations(parsed.normalized, existingLocs);

    // Enhanced manager diagnostics
    const emailMap = buildEmailMap(parsed.normalized);
    const resolveManager = async (mEmail: string): Promise<'db'|'csv'|null> => {
      const key = (mEmail ?? '').trim().toLowerCase();
      if (!key) return null;
      
      const user = await this.identityPort.findUserByEmailOrg(key, orgId);
      if (user) return 'db';
      
      if (emailMap.has(key)) return 'csv';
      return null;
    };

    const managerDiag = await diagnoseManagers(parsed.normalized, resolveManager);

    // Enhance records with manager information
    const enhancedRecords: CommitRecord[] = [];
    for (const rec of records) {
      const incomingData = rec.incoming as Record<string, unknown> | undefined;
      const email = (incomingData?.email as string ?? '').trim().toLowerCase();
      const mEmail = incomingData?.managerEmail as string | null ?? null;
      const issues = managerDiag.perRecordIssues.get(email) || [];

      if (mEmail) {
        const res = await resolveManager(mEmail);
        if (res === 'db') {
          issues.push('manager found in database');
        } else if (res === 'csv') {
          issues.push('manager will be created from CSV');
        } else {
          issues.push('manager not found');
        }
      }

      enhancedRecords.push({
        ...rec,
        reason: [...(rec.reason ?? []), ...issues],
      });
    }

    const overview: CommitOverview = {
      creates, updates, skips,
      duplicates: dups.size,
      invalid,
      newDepartments,
      newLocations,
      managerMissing: managerDiag.managerMissing,
      managerCycles: managerDiag.managerCycles,
      managerSelf: managerDiag.managerSelf
    };

    return {
      overview,
      records: enhancedRecords
    };
  }

  /**
   * Create import session in database
   */
  async createImportSession(csv: string, orgId: string, userId: string, filename: string): Promise<{ sessionId: string; overview: CommitOverview }> {
    const plan = await this.createImportPlan(csv, orgId);
    const csvSha256 = crypto.createHash('sha256').update(csv, 'utf8').digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const result = await this.pool.query(`
      INSERT INTO import_sessions (org_id, user_id, filename, file_size, csv_sha256, plan_json, status, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
      RETURNING id
    `, [orgId, userId, filename, csv.length, csvSha256, JSON.stringify(plan), expiresAt]);

    return {
      sessionId: result.rows[0].id,
      overview: plan.overview
    };
  }

  /**
   * Get import session by ID
   */
  async getImportSession(sessionId: string, orgId: string): Promise<ImportSessionData | null> {
    const result = await this.pool.query(`
      SELECT * FROM import_sessions 
      WHERE id = $1 AND org_id = $2 AND expires_at > NOW()
    `, [sessionId, orgId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      filename: row.filename,
      fileSize: row.file_size,
      csvSha256: row.csv_sha256,
      status: row.status,
      planJson: row.plan_json,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Preview import session plan
   */
  async previewImportSession(sessionId: string, orgId: string): Promise<CommitResponse> {
    const session = await this.getImportSession(sessionId, orgId);
    if (!session) {
      throw new BadRequestException('Import session not found or expired');
    }

    if (!session.planJson) {
      throw new BadRequestException('Import session has no plan data');
    }

    return JSON.parse(session.planJson);
  }

  /**
   * Apply/commit import session
   */
  async applyImportSession(sessionId: string, orgId: string): Promise<ApplyReport> {
    const session = await this.getImportSession(sessionId, orgId);
    if (!session) {
      throw new BadRequestException('Import session not found or expired');
    }

    if (session.status !== 'pending') {
      throw new BadRequestException(`Import session is ${session.status}, cannot commit`);
    }

    const plan: CommitResponse = JSON.parse(session.planJson || '{}');
    const rows: ApplyResultRow[] = [];
    let createdUsers = 0, updatedUsers = 0, skipped = 0, errors = 0;
    let departmentsCreated = 0, membershipsLinked = 0, locationsCreated = 0;

    // Update session status to committed
    await this.pool.query(`
      UPDATE import_sessions SET status = 'committed', updated_at = NOW()
      WHERE id = $1
    `, [sessionId]);

    for (const rec of plan.records) {
      const incoming = rec.incoming;
      const email = incoming.email || null;
      const deptName = incoming.department || null;
      const locName = incoming.location || null;

      const ignoredFields: string[] = [];
      ['employeeId', 'startDate', 'birthDate', 'nationality', 'gender', 'phone', 'managerEmail']
        .forEach(f => { if (incoming[f as keyof typeof incoming] != null) ignoredFields.push(f); });

      try {
        if (!email || !rec.action) {
          skipped++; 
          rows.push({ email, action: 'skipped', ignoredFields, message: 'Missing email or action' });
          continue;
        }

        if (rec.action === 'create') {
          const existingUser = await this.identityPort.findUserByEmailOrg(email, orgId);
          const firstName = incoming.givenName || null;
          const lastName = incoming.familyName || null;

          const user = existingUser ?? await this.identityPort.createUser(
            orgId, email, firstName, lastName, 
            incoming.jobTitle || '', deptName || '', locName || '', 
            incoming.hireDate || new Date().toISOString().split('T')[0]
          );

          if (!existingUser) createdUsers++; 
          else updatedUsers++;

          if (existingUser) {
            await this.identityPort.updateUserNames(existingUser.id, firstName, lastName);
          }

          let membershipLinkedFlag = false;
          let locationCreatedFlag = false;

          if (deptName) {
            const { dept, created: deptCreated } = await this.identityPort.findOrCreateDepartment(orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identityPort.ensureMembership(user.id, dept.id as string);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true;
            }
          }

          if (locName) {
            const { created: locCreated } = await this.identityPort.findOrCreateLocation(orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreatedFlag = locCreated;
          }

          rows.push({
            email, action: existingUser ? 'updated' : 'created',
            userId: user.id,
            department: deptName,
            membershipLinked: membershipLinkedFlag,
            location: locName,
            locationCreated: locationCreatedFlag,
            ignoredFields
          });

        } else if (rec.action === 'update') {
          const user = await this.identityPort.findUserByEmailOrg(email, orgId);
          if (!user) {
            // Safety: create if user disappeared
            const firstName = incoming.givenName || null;
            const lastName = incoming.familyName || null;
            const newUser = await this.identityPort.createUser(
              orgId, email, firstName, lastName,
              incoming.jobTitle || '', deptName || '', locName || '',
              incoming.hireDate || new Date().toISOString().split('T')[0]
            );
            createdUsers++;
            
            rows.push({ email, action: 'created', userId: newUser.id, department: deptName, location: locName, ignoredFields });
            continue;
          }

          const firstName = incoming.givenName || null;
          const lastName = incoming.familyName || null;
          await this.identityPort.updateUserNames(user.id, firstName, lastName);
          updatedUsers++;

          let membershipLinkedFlag = false;
          let locationCreatedFlag = false;

          if (deptName) {
            const { dept, created: deptCreated } = await this.identityPort.findOrCreateDepartment(orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identityPort.ensureMembership(user.id, dept.id as string);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true;
            }
          }

          if (locName) {
            const { created: locCreated } = await this.identityPort.findOrCreateLocation(orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreatedFlag = locCreated;
          }

          rows.push({ 
            email, action: 'updated', userId: user.id, 
            department: deptName, membershipLinked: membershipLinkedFlag, 
            location: locName, locationCreated: locationCreatedFlag, 
            ignoredFields 
          });

        } else {
          skipped++; 
          rows.push({ email, action: 'skipped', department: deptName, location: locName, ignoredFields });
        }
      } catch (e: unknown) {
        errors++;
        const errorMessage = e instanceof Error ? e.message : 'unknown error';
        rows.push({ email, action: 'error', department: deptName, location: locName, ignoredFields, message: errorMessage });
      }
    }

    return {
      createdUsers, updatedUsers, skipped, errors,
      departmentsCreated, membershipsLinked, locationsCreated,
      rows,
    };
  }

  /**
   * Cancel/delete import session
   */
  async cancelImportSession(sessionId: string, orgId: string): Promise<void> {
    await this.pool.query(`
      DELETE FROM import_sessions 
      WHERE id = $1 AND org_id = $2
    `, [sessionId, orgId]);
  }
}