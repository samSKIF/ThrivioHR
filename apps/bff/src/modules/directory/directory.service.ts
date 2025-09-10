import { Injectable, BadRequestException } from '@nestjs/common';
import { IdentityRepository } from '../identity/identity.repository';
import { signSession, verifySession } from './lib/token';
import { collectNewDepartments, collectNewLocations } from './lib/depts_locs';
import { buildEmailMap, diagnoseManagers } from './lib/managers';
import { parseAndNormalizeCsv } from './lib/csv';
import { computeDiff } from './lib/diff';
import type { CommitOverview, CommitRecord, NormalizedRow } from './lib/types';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as crypto from 'crypto';
import { getJwtSecret } from '../../env';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type ValidationResult = {
  rows: number;
  valid: number;
  invalid: number;
  requiredHeaders: string[];
  missingHeaders: string[];
  inferredHeaders: string[];
  preview: NormalizedRow[]; // first 3 normalized rows
  sampleErrors: { row: number; message: string }[];
};

// type CommitAction = 'create' | 'update' | 'skip'; // Currently unused
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
// const OPTIONAL = [
//   'jobTitle','department','managerEmail','location','employeeId','startDate',
//   'birthDate','nationality','gender','phone'
// ];

@Injectable()
export class DirectoryService {
  constructor(private readonly identity: IdentityRepository) {}

  // GraphQL resolver support methods
  async getOrganizations(limit: number = 1) {
    return this.identity.getOrganizations(limit);
  }

  async listUsersByOrg(orgId: string, limit: number, cursor?: string) {
    return this.identity.listUsersByOrg(orgId, limit, cursor);
  }

  async getUserById(id: string) {
    return this.identity.getUserById(id);
  }

  // Original methods - for compatibility
  async listUsersByOrgAfter(orgId: string, cursor: { createdAt: string; id: string } | undefined, limit: number) {
    return this.identity.listUsersByOrgAfter(orgId, cursor, limit);
  }

  async countUsersByOrg(orgId: string) {
    return this.identity.countUsersByOrg(orgId);
  }

  // RLS-enabled methods that accept a database context
  async listUsersByOrgAfterWithDb(db: NodePgDatabase<Record<string, unknown>>, orgId: string, cursor: { createdAt: string; id: string } | undefined, limit: number) {
    return this.identity.listUsersByOrgAfterWithDb(db, orgId, cursor, limit);
  }

  async countUsersByOrgWithDb(db: NodePgDatabase<Record<string, unknown>>, orgId: string) {
    return this.identity.countUsersByOrgWithDb(db, orgId);
  }
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



  async commitPlan(csv: string, orgId: string, _dryRun = false): Promise<CommitResponse> {
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
    const missingHeaders = REQUIRED.filter(h => !parsed.headers.includes(h));
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
    let creates = 0, updates = 0, skips = 0, invalid = 0;

    for (const row of parsed.normalized) {
      const reason: string[] = [];
      if (!row.email || !row.givenName || !row.familyName) {
        out.push({ action: 'invalid', reason: ['Missing required fields'], incoming: row });
        invalid++;
        continue;
      }
      if (dups.has((row.email || '').toLowerCase())) {
        reason.push('Duplicate email in CSV');
      }

      const current = await this.identity.findUserByEmailOrg(row.email!, orgId);

      // Basic validation only - manager resolution will be done later with enhanced diagnostics

      if (!current) {
        creates++;
        out.push({ action: 'create', reason, incoming: row });
      } else {
        // detect diffs using computeDiff helper
        const diffResult = computeDiff(current, row);
        const changes = diffResult.changes.map(c => ({ 
          field: c.field, 
          from: c.from ?? null, 
          to: c.to ?? null 
        }));

        if (changes.length === 0 && !row.managerEmail) {
          skips++;
          out.push({ action: 'skip', reason, incoming: row });
        } else {
          updates++;
          out.push({
            action: 'update',
            changes: changes.length ? changes : undefined,
            reason,
            incoming: row
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
      const incomingData = rec.incoming as Record<string, unknown> | undefined;
      const email = (incomingData?.email as string ?? '').trim().toLowerCase();
      const mEmail = incomingData?.managerEmail as string | null ?? null;
      const issues = diag.perRecordIssues.get(email) || [];

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

      // Merge manager info into reason array
      outWithManagers.push({
        ...rec,
        reason: [...(rec.reason ?? []), ...issues],
      });
    }

    // Replace original out with enriched version and update overview with diag counters
    const enrichedOut = outWithManagers;
    const overview: CommitOverview = {
      creates, updates, skips,
      duplicates: dups.size,
      invalid,
      newDepartments,
      newLocations,
      managerMissing: diag.managerMissing,
      managerCycles: diag.managerCycles,
      managerSelf: diag.managerSelf
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
    let payload: Record<string, unknown>;
    try {
      payload = verifySession(token, getJwtSecret());
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'unknown';
      throw new BadRequestException(`Invalid or expired session token: ${errorMessage}`);
    }
    if (!payload?.orgId || payload.orgId !== orgIdFromJwt) {
      throw new BadRequestException('Session/org mismatch.');
    }

    const rows: ApplyResultRow[] = [];
    let createdUsers = 0, updatedUsers = 0, skipped = 0, errors = 0, departmentsCreated = 0, membershipsLinked = 0, locationsCreated = 0;

    for (const rec of (payload.records as Record<string, unknown>[])) {
      const incoming = rec?.incoming as Record<string, unknown> | undefined;
      const email = incoming?.email as string | null ?? null;
      const deptName = incoming?.department as string | null ?? null;
      const locName = incoming?.location as string | null ?? null;

      const ignoredFields: string[] = [];
      // These fields are not in the users schema yet; mark as ignored:
      ['jobTitle','employeeId','startDate','birthDate','nationality','gender','phone','managerEmail']
        .forEach(f => { if (incoming?.[f] != null) ignoredFields.push(f); });

      try {
        if (!email || !rec?.action) {
          skipped++; rows.push({ email, action: 'skipped', ignoredFields, message: 'Missing email or action' });
          continue;
        }

        // Determine create/update from planner's decision.
        if (rec.action === 'create') {
          const user = await this.identity.findUserByEmailOrg(email, payload.orgId);
          const firstName = incoming?.givenName as string | null ?? null;
          const lastName  = incoming?.familyName as string | null ?? null;

          const u = user ?? await this.identity.createUser(payload.orgId, email, firstName || '', lastName || '');
          if (!user) createdUsers++; else updatedUsers++; // if user existed, treat as update via name sync below

          if (user) {
            await this.identity.updateUserNames(user.id, firstName, lastName);
          }

          // let departmentCreated = false;
          let membershipLinkedFlag = false;
          let locationCreated = false;
          if (deptName) {
            const { dept, created: deptCreated } = await this.identity.findOrCreateDepartment(payload.orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identity.ensureMembership(u.id, dept.id as string);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true; // Keep per-row membershipLinked: true as-is (still useful to the UI)
            }
          }
          if (locName) {
            const { created: locCreated } = await this.identity.findOrCreateLocation(payload.orgId, locName);
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
            const firstName = incoming?.givenName as string | null ?? null;
            const lastName  = incoming?.familyName as string | null ?? null;
            const u = await this.identity.createUser(payload.orgId, email, firstName || '', lastName || '');
            createdUsers++;
            let membershipLinkedFlag = false;
            let locationCreated = false;
            if (deptName) {
              const { dept, created: deptCreated } = await this.identity.findOrCreateDepartment(payload.orgId, deptName);
              if (deptCreated) departmentsCreated++;
              if (dept) {
                const { created: membershipCreated } = await this.identity.ensureMembership(u.id, dept.id as string);
                if (membershipCreated) membershipsLinked++;
                membershipLinkedFlag = true; // Keep per-row membershipLinked: true as-is (still useful to the UI)
              }
            }
            if (locName) {
              const { created: locCreated } = await this.identity.findOrCreateLocation(payload.orgId, locName);
              if (locCreated) locationsCreated++;
              locationCreated = locCreated;
            }
            rows.push({ email, action: 'created', userId: u.id, department: deptName, membershipLinked: membershipLinkedFlag, location: locName, locationCreated, ignoredFields });
            continue;
          }

          const firstName = incoming?.givenName as string | null ?? null;
          const lastName  = incoming?.familyName as string | null ?? null;
          await this.identity.updateUserNames(user.id, firstName, lastName);
          updatedUsers++;

          let membershipLinkedFlag = false;
          let locationCreated = false;
          if (deptName) {
            const { dept, created: deptCreated } = await this.identity.findOrCreateDepartment(payload.orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identity.ensureMembership(user.id, dept.id as string);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true; // Keep per-row membershipLinked: true as-is (still useful to the UI)
            }
          }
          if (locName) {
            const { created: locCreated } = await this.identity.findOrCreateLocation(payload.orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreated = locCreated;
          }

          rows.push({ email, action: 'updated', userId: user.id, department: deptName, membershipLinked: membershipLinkedFlag, location: locName, locationCreated, ignoredFields });
        } else {
          skipped++; rows.push({ email, action: 'skipped', department: deptName, location: locName, ignoredFields });
        }
      } catch (e: unknown) {
        errors++;
        const errorMessage = e instanceof Error ? e.message : 'unknown error';
        rows.push({ email, action: 'error', department: deptName, location: locName, ignoredFields, message: errorMessage });
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

  async getOrganizationSubscription(orgId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          s.id, 
          s.seats_limit,
          s.subscribed_users,
          s.plan_code,
          s.status,
          s.start_at,
          s.expiration_date
        FROM subscriptions s
        WHERE s.organization_id = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [orgId]);

      if (result.rows.length === 0) {
        return {
          seatsLimit: null, // No subscription found
          subscribedUsers: 0,
          planCode: null,
          status: 'no_subscription'
        };
      }

      const subscription = result.rows[0];
      return {
        id: subscription.id,
        seatsLimit: subscription.seats_limit,
        subscribedUsers: subscription.subscribed_users,
        planCode: subscription.plan_code,
        status: subscription.status,
        startAt: subscription.start_at,
        expirationDate: subscription.expiration_date,
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Return no subscription on error to indicate issue
      return {
        seatsLimit: null,
        subscribedUsers: 0,
        planCode: null,
        status: 'error'
      };
    }
  }

  async getOrganizationDepartments(orgId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          ou.id, 
          ou.name,
          ou.description,
          ou.color,
          COUNT(u.id) as member_count
        FROM org_units ou
        LEFT JOIN org_membership om ON om.org_unit_id = ou.id
        LEFT JOIN users u ON u.id = om.user_id AND u.is_active = true
        WHERE ou.organization_id = $1 AND ou.type = 'department'
        GROUP BY ou.id, ou.name, ou.description, ou.color
        ORDER BY ou.name ASC
      `, [orgId]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color || '#16A34A', // Default emerald color
        memberCount: parseInt(row.member_count, 10) || 0,
        status: 'Active' // All departments are active for now
      }));
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Return empty array on error - will trigger mock data fallback
      return [];
    }
  }

  async createDepartment(orgId: string, name: string, color: string) {
    try {
      const result = await pool.query(`
        INSERT INTO org_units (organization_id, type, name, color, created_at, updated_at)
        VALUES ($1, 'department', $2, $3, NOW(), NOW())
        RETURNING id, name, color
      `, [orgId, name.trim(), color]);

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        color: result.rows[0].color,
        memberCount: 0,
        status: 'Active'
      };
    } catch (error) {
      console.error('Error creating department:', error);
      throw new Error('Failed to create department');
    }
  }

  async updateDepartment(departmentId: string, orgId: string, name: string, color: string) {
    try {
      const result = await pool.query(`
        UPDATE org_units 
        SET name = $1, color = $2, updated_at = NOW()
        WHERE id = $3 AND organization_id = $4 AND type = 'department'
        RETURNING id, name, color
      `, [name.trim(), color, departmentId, orgId]);

      if (result.rows.length === 0) {
        throw new Error('Department not found or access denied');
      }

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        color: result.rows[0].color,
        status: 'Active'
      };
    } catch (error) {
      console.error('Error updating department:', error);
      throw new Error('Failed to update department');
    }
  }

  async deleteDepartment(departmentId: string, orgId: string) {
    try {
      // Check if department has employees
      const employeeCheck = await pool.query(`
        SELECT COUNT(*) as employee_count
        FROM users u
        INNER JOIN org_membership om ON u.id = om.user_id
        WHERE om.org_unit_id = $1 AND u.organization_id = $2
      `, [departmentId, orgId]);

      const employeeCount = parseInt(employeeCheck.rows[0].employee_count, 10);
      if (employeeCount > 0) {
        throw new Error(`Cannot delete department with ${employeeCount} employees. Please reassign employees first.`);
      }

      const result = await pool.query(`
        DELETE FROM org_units 
        WHERE id = $1 AND organization_id = $2 AND type = 'department'
        RETURNING id
      `, [departmentId, orgId]);

      if (result.rows.length === 0) {
        throw new Error('Department not found or access denied');
      }

      return { success: true, id: departmentId };
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  }

  // Location Management Methods
  async getOrganizationLocations(orgId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          l.id, 
          l.name,
          l.type,
          l.code,
          l.address,
          l.parent_id,
          COUNT(u.id) as member_count,
          p.name as parent_name,
          p.type as parent_type
        FROM locations l
        LEFT JOIN org_membership om ON om.org_unit_id = l.id
        LEFT JOIN users u ON u.id = om.user_id AND u.is_active = true
        LEFT JOIN locations p ON p.id = l.parent_id
        WHERE l.organization_id = $1
        GROUP BY l.id, l.name, l.type, l.code, l.address, l.parent_id, p.name, p.type
        ORDER BY l.type, l.name ASC
      `, [orgId]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        code: row.code,
        address: row.address,
        parentId: row.parent_id,
        parentName: row.parent_name,
        parentType: row.parent_type,
        memberCount: parseInt(row.member_count, 10) || 0,
      }));
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  async getAvailableCountries() {
    // Return comprehensive list of 180+ countries with ISO codes
    return [
      { code: 'AD', name: 'Andorra' },
      { code: 'AE', name: 'United Arab Emirates' },
      { code: 'AF', name: 'Afghanistan' },
      { code: 'AG', name: 'Antigua and Barbuda' },
      { code: 'AI', name: 'Anguilla' },
      { code: 'AL', name: 'Albania' },
      { code: 'AM', name: 'Armenia' },
      { code: 'AO', name: 'Angola' },
      { code: 'AQ', name: 'Antarctica' },
      { code: 'AR', name: 'Argentina' },
      { code: 'AS', name: 'American Samoa' },
      { code: 'AT', name: 'Austria' },
      { code: 'AU', name: 'Australia' },
      { code: 'AW', name: 'Aruba' },
      { code: 'AX', name: 'Åland Islands' },
      { code: 'AZ', name: 'Azerbaijan' },
      { code: 'BA', name: 'Bosnia and Herzegovina' },
      { code: 'BB', name: 'Barbados' },
      { code: 'BD', name: 'Bangladesh' },
      { code: 'BE', name: 'Belgium' },
      { code: 'BF', name: 'Burkina Faso' },
      { code: 'BG', name: 'Bulgaria' },
      { code: 'BH', name: 'Bahrain' },
      { code: 'BI', name: 'Burundi' },
      { code: 'BJ', name: 'Benin' },
      { code: 'BL', name: 'Saint Barthélemy' },
      { code: 'BM', name: 'Bermuda' },
      { code: 'BN', name: 'Brunei' },
      { code: 'BO', name: 'Bolivia' },
      { code: 'BQ', name: 'Caribbean Netherlands' },
      { code: 'BR', name: 'Brazil' },
      { code: 'BS', name: 'Bahamas' },
      { code: 'BT', name: 'Bhutan' },
      { code: 'BV', name: 'Bouvet Island' },
      { code: 'BW', name: 'Botswana' },
      { code: 'BY', name: 'Belarus' },
      { code: 'BZ', name: 'Belize' },
      { code: 'CA', name: 'Canada' },
      { code: 'CC', name: 'Cocos Islands' },
      { code: 'CD', name: 'Democratic Republic of the Congo' },
      { code: 'CF', name: 'Central African Republic' },
      { code: 'CG', name: 'Republic of the Congo' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'CI', name: 'Côte d\'Ivoire' },
      { code: 'CK', name: 'Cook Islands' },
      { code: 'CL', name: 'Chile' },
      { code: 'CM', name: 'Cameroon' },
      { code: 'CN', name: 'China' },
      { code: 'CO', name: 'Colombia' },
      { code: 'CR', name: 'Costa Rica' },
      { code: 'CU', name: 'Cuba' },
      { code: 'CV', name: 'Cape Verde' },
      { code: 'CW', name: 'Curaçao' },
      { code: 'CX', name: 'Christmas Island' },
      { code: 'CY', name: 'Cyprus' },
      { code: 'CZ', name: 'Czech Republic' },
      { code: 'DE', name: 'Germany' },
      { code: 'DJ', name: 'Djibouti' },
      { code: 'DK', name: 'Denmark' },
      { code: 'DM', name: 'Dominica' },
      { code: 'DO', name: 'Dominican Republic' },
      { code: 'DZ', name: 'Algeria' },
      { code: 'EC', name: 'Ecuador' },
      { code: 'EE', name: 'Estonia' },
      { code: 'EG', name: 'Egypt' },
      { code: 'EH', name: 'Western Sahara' },
      { code: 'ER', name: 'Eritrea' },
      { code: 'ES', name: 'Spain' },
      { code: 'ET', name: 'Ethiopia' },
      { code: 'FI', name: 'Finland' },
      { code: 'FJ', name: 'Fiji' },
      { code: 'FK', name: 'Falkland Islands' },
      { code: 'FM', name: 'Micronesia' },
      { code: 'FO', name: 'Faroe Islands' },
      { code: 'FR', name: 'France' },
      { code: 'GA', name: 'Gabon' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'GD', name: 'Grenada' },
      { code: 'GE', name: 'Georgia' },
      { code: 'GF', name: 'French Guiana' },
      { code: 'GG', name: 'Guernsey' },
      { code: 'GH', name: 'Ghana' },
      { code: 'GI', name: 'Gibraltar' },
      { code: 'GL', name: 'Greenland' },
      { code: 'GM', name: 'Gambia' },
      { code: 'GN', name: 'Guinea' },
      { code: 'GP', name: 'Guadeloupe' },
      { code: 'GQ', name: 'Equatorial Guinea' },
      { code: 'GR', name: 'Greece' },
      { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
      { code: 'GT', name: 'Guatemala' },
      { code: 'GU', name: 'Guam' },
      { code: 'GW', name: 'Guinea-Bissau' },
      { code: 'GY', name: 'Guyana' },
      { code: 'HK', name: 'Hong Kong' },
      { code: 'HM', name: 'Heard Island and McDonald Islands' },
      { code: 'HN', name: 'Honduras' },
      { code: 'HR', name: 'Croatia' },
      { code: 'HT', name: 'Haiti' },
      { code: 'HU', name: 'Hungary' },
      { code: 'ID', name: 'Indonesia' },
      { code: 'IE', name: 'Ireland' },
      { code: 'IL', name: 'Israel' },
      { code: 'IM', name: 'Isle of Man' },
      { code: 'IN', name: 'India' },
      { code: 'IO', name: 'British Indian Ocean Territory' },
      { code: 'IQ', name: 'Iraq' },
      { code: 'IR', name: 'Iran' },
      { code: 'IS', name: 'Iceland' },
      { code: 'IT', name: 'Italy' },
      { code: 'JE', name: 'Jersey' },
      { code: 'JM', name: 'Jamaica' },
      { code: 'JO', name: 'Jordan' },
      { code: 'JP', name: 'Japan' },
      { code: 'KE', name: 'Kenya' },
      { code: 'KG', name: 'Kyrgyzstan' },
      { code: 'KH', name: 'Cambodia' },
      { code: 'KI', name: 'Kiribati' },
      { code: 'KM', name: 'Comoros' },
      { code: 'KN', name: 'Saint Kitts and Nevis' },
      { code: 'KP', name: 'North Korea' },
      { code: 'KR', name: 'South Korea' },
      { code: 'KW', name: 'Kuwait' },
      { code: 'KY', name: 'Cayman Islands' },
      { code: 'KZ', name: 'Kazakhstan' },
      { code: 'LA', name: 'Laos' },
      { code: 'LB', name: 'Lebanon' },
      { code: 'LC', name: 'Saint Lucia' },
      { code: 'LI', name: 'Liechtenstein' },
      { code: 'LK', name: 'Sri Lanka' },
      { code: 'LR', name: 'Liberia' },
      { code: 'LS', name: 'Lesotho' },
      { code: 'LT', name: 'Lithuania' },
      { code: 'LU', name: 'Luxembourg' },
      { code: 'LV', name: 'Latvia' },
      { code: 'LY', name: 'Libya' },
      { code: 'MA', name: 'Morocco' },
      { code: 'MC', name: 'Monaco' },
      { code: 'MD', name: 'Moldova' },
      { code: 'ME', name: 'Montenegro' },
      { code: 'MF', name: 'Saint Martin' },
      { code: 'MG', name: 'Madagascar' },
      { code: 'MH', name: 'Marshall Islands' },
      { code: 'MK', name: 'North Macedonia' },
      { code: 'ML', name: 'Mali' },
      { code: 'MM', name: 'Myanmar' },
      { code: 'MN', name: 'Mongolia' },
      { code: 'MO', name: 'Macao' },
      { code: 'MP', name: 'Northern Mariana Islands' },
      { code: 'MQ', name: 'Martinique' },
      { code: 'MR', name: 'Mauritania' },
      { code: 'MS', name: 'Montserrat' },
      { code: 'MT', name: 'Malta' },
      { code: 'MU', name: 'Mauritius' },
      { code: 'MV', name: 'Maldives' },
      { code: 'MW', name: 'Malawi' },
      { code: 'MX', name: 'Mexico' },
      { code: 'MY', name: 'Malaysia' },
      { code: 'MZ', name: 'Mozambique' },
      { code: 'NA', name: 'Namibia' },
      { code: 'NC', name: 'New Caledonia' },
      { code: 'NE', name: 'Niger' },
      { code: 'NF', name: 'Norfolk Island' },
      { code: 'NG', name: 'Nigeria' },
      { code: 'NI', name: 'Nicaragua' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'NO', name: 'Norway' },
      { code: 'NP', name: 'Nepal' },
      { code: 'NR', name: 'Nauru' },
      { code: 'NU', name: 'Niue' },
      { code: 'NZ', name: 'New Zealand' },
      { code: 'OM', name: 'Oman' },
      { code: 'PA', name: 'Panama' },
      { code: 'PE', name: 'Peru' },
      { code: 'PF', name: 'French Polynesia' },
      { code: 'PG', name: 'Papua New Guinea' },
      { code: 'PH', name: 'Philippines' },
      { code: 'PK', name: 'Pakistan' },
      { code: 'PL', name: 'Poland' },
      { code: 'PM', name: 'Saint Pierre and Miquelon' },
      { code: 'PN', name: 'Pitcairn' },
      { code: 'PR', name: 'Puerto Rico' },
      { code: 'PS', name: 'Palestine' },
      { code: 'PT', name: 'Portugal' },
      { code: 'PW', name: 'Palau' },
      { code: 'PY', name: 'Paraguay' },
      { code: 'QA', name: 'Qatar' },
      { code: 'RE', name: 'Réunion' },
      { code: 'RO', name: 'Romania' },
      { code: 'RS', name: 'Serbia' },
      { code: 'RU', name: 'Russia' },
      { code: 'RW', name: 'Rwanda' },
      { code: 'SA', name: 'Saudi Arabia' },
      { code: 'SB', name: 'Solomon Islands' },
      { code: 'SC', name: 'Seychelles' },
      { code: 'SD', name: 'Sudan' },
      { code: 'SE', name: 'Sweden' },
      { code: 'SG', name: 'Singapore' },
      { code: 'SH', name: 'Saint Helena' },
      { code: 'SI', name: 'Slovenia' },
      { code: 'SJ', name: 'Svalbard and Jan Mayen' },
      { code: 'SK', name: 'Slovakia' },
      { code: 'SL', name: 'Sierra Leone' },
      { code: 'SM', name: 'San Marino' },
      { code: 'SN', name: 'Senegal' },
      { code: 'SO', name: 'Somalia' },
      { code: 'SR', name: 'Suriname' },
      { code: 'SS', name: 'South Sudan' },
      { code: 'ST', name: 'São Tomé and Príncipe' },
      { code: 'SV', name: 'El Salvador' },
      { code: 'SX', name: 'Sint Maarten' },
      { code: 'SY', name: 'Syria' },
      { code: 'SZ', name: 'Eswatini' },
      { code: 'TC', name: 'Turks and Caicos Islands' },
      { code: 'TD', name: 'Chad' },
      { code: 'TF', name: 'French Southern Territories' },
      { code: 'TG', name: 'Togo' },
      { code: 'TH', name: 'Thailand' },
      { code: 'TJ', name: 'Tajikistan' },
      { code: 'TK', name: 'Tokelau' },
      { code: 'TL', name: 'East Timor' },
      { code: 'TM', name: 'Turkmenistan' },
      { code: 'TN', name: 'Tunisia' },
      { code: 'TO', name: 'Tonga' },
      { code: 'TR', name: 'Turkey' },
      { code: 'TT', name: 'Trinidad and Tobago' },
      { code: 'TV', name: 'Tuvalu' },
      { code: 'TW', name: 'Taiwan' },
      { code: 'TZ', name: 'Tanzania' },
      { code: 'UA', name: 'Ukraine' },
      { code: 'UG', name: 'Uganda' },
      { code: 'UM', name: 'United States Minor Outlying Islands' },
      { code: 'US', name: 'United States' },
      { code: 'UY', name: 'Uruguay' },
      { code: 'UZ', name: 'Uzbekistan' },
      { code: 'VA', name: 'Vatican City' },
      { code: 'VC', name: 'Saint Vincent and the Grenadines' },
      { code: 'VE', name: 'Venezuela' },
      { code: 'VG', name: 'British Virgin Islands' },
      { code: 'VI', name: 'United States Virgin Islands' },
      { code: 'VN', name: 'Vietnam' },
      { code: 'VU', name: 'Vanuatu' },
      { code: 'WF', name: 'Wallis and Futuna' },
      { code: 'WS', name: 'Samoa' },
      { code: 'YE', name: 'Yemen' },
      { code: 'YT', name: 'Mayotte' },
      { code: 'ZA', name: 'South Africa' },
      { code: 'ZM', name: 'Zambia' },
      { code: 'ZW', name: 'Zimbabwe' }
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAvailableCities(countryCode: string) {
    // Return comprehensive cities for specific countries
    const citiesByCountry: Record<string, Array<{ name: string; code: string }>> = {
      'US': [
        { name: 'New York', code: 'NYC' }, { name: 'Los Angeles', code: 'LAX' }, { name: 'Chicago', code: 'CHI' },
        { name: 'Houston', code: 'HOU' }, { name: 'Phoenix', code: 'PHX' }, { name: 'Philadelphia', code: 'PHL' },
        { name: 'San Antonio', code: 'SAT' }, { name: 'San Diego', code: 'SAN' }, { name: 'Dallas', code: 'DFW' },
        { name: 'San Jose', code: 'SJC' }, { name: 'Austin', code: 'AUS' }, { name: 'Jacksonville', code: 'JAX' },
        { name: 'San Francisco', code: 'SFO' }, { name: 'Columbus', code: 'CMH' }, { name: 'Charlotte', code: 'CLT' },
        { name: 'Fort Worth', code: 'FTW' }, { name: 'Indianapolis', code: 'IND' }, { name: 'Seattle', code: 'SEA' },
        { name: 'Denver', code: 'DEN' }, { name: 'Boston', code: 'BOS' }, { name: 'Washington', code: 'WAS' },
        { name: 'Nashville', code: 'BNA' }, { name: 'Detroit', code: 'DTT' }, { name: 'Portland', code: 'PDX' },
        { name: 'Las Vegas', code: 'LAS' }, { name: 'Memphis', code: 'MEM' }, { name: 'Louisville', code: 'SDF' },
        { name: 'Baltimore', code: 'BWI' }, { name: 'Milwaukee', code: 'MKE' }, { name: 'Albuquerque', code: 'ABQ' },
        { name: 'Tucson', code: 'TUS' }, { name: 'Fresno', code: 'FAT' }, { name: 'Sacramento', code: 'SMF' },
        { name: 'Mesa', code: 'AZA' }, { name: 'Atlanta', code: 'ATL' }, { name: 'Kansas City', code: 'MCI' },
        { name: 'Colorado Springs', code: 'COS' }, { name: 'Miami', code: 'MIA' }, { name: 'Raleigh', code: 'RDU' },
        { name: 'Omaha', code: 'OMA' }, { name: 'Long Beach', code: 'LGB' }, { name: 'Virginia Beach', code: 'ORF' },
        { name: 'Oakland', code: 'OAK' }, { name: 'Minneapolis', code: 'MSP' }, { name: 'Tulsa', code: 'TUL' },
        { name: 'Tampa', code: 'TPA' }, { name: 'Arlington', code: 'DFW' }, { name: 'New Orleans', code: 'MSY' }
      ],
      'CA': [
        { name: 'Toronto', code: 'YYZ' }, { name: 'Montreal', code: 'YUL' }, { name: 'Vancouver', code: 'YVR' },
        { name: 'Calgary', code: 'YYC' }, { name: 'Edmonton', code: 'YEG' }, { name: 'Ottawa', code: 'YOW' },
        { name: 'Winnipeg', code: 'YWG' }, { name: 'Quebec City', code: 'YQB' }, { name: 'Hamilton', code: 'YHM' },
        { name: 'Kitchener', code: 'YKF' }, { name: 'London', code: 'YXU' }, { name: 'Halifax', code: 'YHZ' },
        { name: 'Victoria', code: 'YYJ' }, { name: 'Windsor', code: 'YQG' }, { name: 'Oshawa', code: 'YOO' },
        { name: 'Saskatoon', code: 'YXE' }, { name: 'Regina', code: 'YQR' }, { name: 'Sherbrooke', code: 'YSC' },
        { name: 'St. Johns', code: 'YYT' }, { name: 'Barrie', code: 'YBR' }, { name: 'Kelowna', code: 'YKA' }
      ],
      'GB': [
        { name: 'London', code: 'LON' }, { name: 'Birmingham', code: 'BHX' }, { name: 'Manchester', code: 'MAN' },
        { name: 'Glasgow', code: 'GLA' }, { name: 'Liverpool', code: 'LPL' }, { name: 'Leeds', code: 'LDS' },
        { name: 'Sheffield', code: 'SHF' }, { name: 'Edinburgh', code: 'EDI' }, { name: 'Bristol', code: 'BRS' },
        { name: 'Leicester', code: 'LEI' }, { name: 'Coventry', code: 'CVT' }, { name: 'Bradford', code: 'BFD' },
        { name: 'Cardiff', code: 'CWL' }, { name: 'Belfast', code: 'BFS' }, { name: 'Nottingham', code: 'NTT' },
        { name: 'Plymouth', code: 'PLH' }, { name: 'Stoke-on-Trent', code: 'SOT' }, { name: 'Wolverhampton', code: 'WLV' },
        { name: 'Derby', code: 'DRB' }, { name: 'Southampton', code: 'SOU' }, { name: 'Hull', code: 'HUL' },
        { name: 'Swansea', code: 'SWA' }, { name: 'Reading', code: 'RDG' }, { name: 'Northampton', code: 'NTH' },
        { name: 'Luton', code: 'LTN' }, { name: 'York', code: 'YRK' }, { name: 'Poole', code: 'POO' },
        { name: 'Bournemouth', code: 'BOH' }, { name: 'Peterborough', code: 'PBR' }, { name: 'Cambridge', code: 'CBG' }
      ],
      'DE': [
        { name: 'Berlin', code: 'BER' }, { name: 'Hamburg', code: 'HAM' }, { name: 'Munich', code: 'MUC' },
        { name: 'Cologne', code: 'CGN' }, { name: 'Frankfurt', code: 'FRA' }, { name: 'Stuttgart', code: 'STR' },
        { name: 'Düsseldorf', code: 'DUS' }, { name: 'Dortmund', code: 'DTM' }, { name: 'Essen', code: 'ESS' },
        { name: 'Leipzig', code: 'LEJ' }, { name: 'Bremen', code: 'BRE' }, { name: 'Dresden', code: 'DRS' },
        { name: 'Hanover', code: 'HAJ' }, { name: 'Nuremberg', code: 'NUE' }, { name: 'Duisburg', code: 'DUI' },
        { name: 'Bochum', code: 'BOC' }, { name: 'Wuppertal', code: 'WUP' }, { name: 'Bielefeld', code: 'BIE' },
        { name: 'Bonn', code: 'BNN' }, { name: 'Münster', code: 'FMO' }, { name: 'Karlsruhe', code: 'KAR' },
        { name: 'Mannheim', code: 'MHG' }, { name: 'Augsburg', code: 'AUG' }, { name: 'Wiesbaden', code: 'WIE' },
        { name: 'Gelsenkirchen', code: 'GEL' }, { name: 'Mönchengladbach', code: 'MGL' }, { name: 'Braunschweig', code: 'BWE' },
        { name: 'Chemnitz', code: 'CHE' }, { name: 'Kiel', code: 'KEL' }, { name: 'Aachen', code: 'AAC' }
      ],
      'FR': [
        { name: 'Paris', code: 'PAR' }, { name: 'Marseille', code: 'MRS' }, { name: 'Lyon', code: 'LYS' },
        { name: 'Toulouse', code: 'TLS' }, { name: 'Nice', code: 'NCE' }, { name: 'Nantes', code: 'NTE' },
        { name: 'Strasbourg', code: 'SXB' }, { name: 'Montpellier', code: 'MPL' }, { name: 'Bordeaux', code: 'BOD' },
        { name: 'Lille', code: 'LIL' }, { name: 'Rennes', code: 'RNS' }, { name: 'Reims', code: 'RMS' },
        { name: 'Le Havre', code: 'LHV' }, { name: 'Saint-Étienne', code: 'STE' }, { name: 'Toulon', code: 'TLN' },
        { name: 'Angers', code: 'ANG' }, { name: 'Grenoble', code: 'GRE' }, { name: 'Dijon', code: 'DIJ' },
        { name: 'Nîmes', code: 'NIM' }, { name: 'Aix-en-Provence', code: 'AIX' }, { name: 'Saint-Quentin-en-Yvelines', code: 'SQY' },
        { name: 'Brest', code: 'BRS' }, { name: 'Le Mans', code: 'LMN' }, { name: 'Amiens', code: 'AMI' },
        { name: 'Tours', code: 'TRS' }, { name: 'Limoges', code: 'LIM' }, { name: 'Clermont-Ferrand', code: 'CFE' },
        { name: 'Villeurbanne', code: 'VLB' }, { name: 'Besançon', code: 'BES' }, { name: 'Orléans', code: 'ORL' }
      ],
      'IT': [
        { name: 'Rome', code: 'ROM' }, { name: 'Milan', code: 'MIL' }, { name: 'Naples', code: 'NAP' },
        { name: 'Turin', code: 'TRN' }, { name: 'Palermo', code: 'PMO' }, { name: 'Genoa', code: 'GOA' },
        { name: 'Bologna', code: 'BLQ' }, { name: 'Florence', code: 'FLR' }, { name: 'Bari', code: 'BRI' },
        { name: 'Catania', code: 'CTA' }, { name: 'Venice', code: 'VCE' }, { name: 'Verona', code: 'VRN' },
        { name: 'Messina', code: 'MSN' }, { name: 'Padua', code: 'PAD' }, { name: 'Trieste', code: 'TRS' },
        { name: 'Taranto', code: 'TAR' }, { name: 'Brescia', code: 'BRC' }, { name: 'Prato', code: 'PRT' },
        { name: 'Parma', code: 'PMI' }, { name: 'Reggio Calabria', code: 'REG' }, { name: 'Modena', code: 'MOD' },
        { name: 'Reggio Emilia', code: 'RER' }, { name: 'Perugia', code: 'PEG' }, { name: 'Livorno', code: 'LRN' },
        { name: 'Ravenna', code: 'RAV' }, { name: 'Cagliari', code: 'CAG' }, { name: 'Foggia', code: 'FOG' },
        { name: 'Rimini', code: 'RMI' }, { name: 'Salerno', code: 'SAL' }, { name: 'Ferrara', code: 'FER' }
      ],
      'ES': [
        { name: 'Madrid', code: 'MAD' }, { name: 'Barcelona', code: 'BCN' }, { name: 'Valencia', code: 'VLC' },
        { name: 'Seville', code: 'SVQ' }, { name: 'Zaragoza', code: 'ZAZ' }, { name: 'Málaga', code: 'AGP' },
        { name: 'Murcia', code: 'MJV' }, { name: 'Palma', code: 'PMI' }, { name: 'Las Palmas', code: 'LPA' },
        { name: 'Bilbao', code: 'BIO' }, { name: 'Alicante', code: 'ALC' }, { name: 'Córdoba', code: 'ODB' },
        { name: 'Valladolid', code: 'VLL' }, { name: 'Vigo', code: 'VGO' }, { name: 'Gijón', code: 'OVD' },
        { name: 'A Coruña', code: 'LCG' }, { name: 'Vitoria-Gasteiz', code: 'VIT' }, { name: 'Granada', code: 'GRX' },
        { name: 'Elche', code: 'ELC' }, { name: 'Oviedo', code: 'OVD' }, { name: 'Santa Cruz de Tenerife', code: 'TFS' },
        { name: 'Badalona', code: 'BDL' }, { name: 'Cartagena', code: 'CTG' }, { name: 'Terrassa', code: 'TER' },
        { name: 'Jerez de la Frontera', code: 'XRY' }, { name: 'Sabadell', code: 'SAB' }, { name: 'Móstoles', code: 'MOS' },
        { name: 'Alcalá de Henares', code: 'ALC' }, { name: 'Pamplona', code: 'PNA' }, { name: 'Fuenlabrada', code: 'FUE' }
      ],
      'NL': [
        { name: 'Amsterdam', code: 'AMS' }, { name: 'Rotterdam', code: 'RTM' }, { name: 'The Hague', code: 'HAG' },
        { name: 'Utrecht', code: 'UTC' }, { name: 'Eindhoven', code: 'EIN' }, { name: 'Tilburg', code: 'TLB' },
        { name: 'Groningen', code: 'GRQ' }, { name: 'Almere', code: 'ALM' }, { name: 'Breda', code: 'BRE' },
        { name: 'Nijmegen', code: 'NJM' }, { name: 'Enschede', code: 'ENS' }, { name: 'Haarlem', code: 'HRL' },
        { name: 'Arnhem', code: 'ARN' }, { name: 'Zaanstad', code: 'ZAN' }, { name: 'Amersfoort', code: 'AMF' },
        { name: '\'s-Hertogenbosch', code: 'HTB' }, { name: 'Apeldoorn', code: 'APD' }, { name: 'Hoofddorp', code: 'HFD' },
        { name: 'Maastricht', code: 'MST' }, { name: 'Leiden', code: 'LEI' }, { name: 'Dordrecht', code: 'DOR' },
        { name: 'Zoetermeer', code: 'ZOE' }, { name: 'Zwolle', code: 'ZWO' }, { name: 'Deventer', code: 'DEV' },
        { name: 'Delft', code: 'DLF' }, { name: 'Alkmaar', code: 'ALK' }, { name: 'Leeuwarden', code: 'LWR' },
        { name: 'Sittard-Geleen', code: 'SIT' }, { name: 'Venlo', code: 'VEN' }, { name: 'Hilversum', code: 'HLV' }
      ],
      'AU': [
        { name: 'Sydney', code: 'SYD' }, { name: 'Melbourne', code: 'MEL' }, { name: 'Brisbane', code: 'BNE' },
        { name: 'Perth', code: 'PER' }, { name: 'Adelaide', code: 'ADL' }, { name: 'Gold Coast', code: 'OOL' },
        { name: 'Newcastle', code: 'NTL' }, { name: 'Canberra', code: 'CBR' }, { name: 'Sunshine Coast', code: 'MCY' },
        { name: 'Wollongong', code: 'WOL' }, { name: 'Hobart', code: 'HBA' }, { name: 'Geelong', code: 'GEL' },
        { name: 'Townsville', code: 'TSV' }, { name: 'Cairns', code: 'CNS' }, { name: 'Darwin', code: 'DRW' },
        { name: 'Toowoomba', code: 'TWB' }, { name: 'Ballarat', code: 'BAL' }, { name: 'Bendigo', code: 'BDG' },
        { name: 'Albury', code: 'ABX' }, { name: 'Launceston', code: 'LST' }, { name: 'Mackay', code: 'MKY' },
        { name: 'Rockhampton', code: 'ROK' }, { name: 'Bunbury', code: 'BUY' }, { name: 'Bundaberg', code: 'BDB' },
        { name: 'Coffs Harbour', code: 'CFS' }, { name: 'Wagga Wagga', code: 'WGA' }, { name: 'Hervey Bay', code: 'HVB' },
        { name: 'Mildura', code: 'MQL' }, { name: 'Shepparton', code: 'SHE' }, { name: 'Gladstone', code: 'GLT' }
      ],
      'JP': [
        { name: 'Tokyo', code: 'TYO' }, { name: 'Yokohama', code: 'YOK' }, { name: 'Osaka', code: 'OSA' },
        { name: 'Nagoya', code: 'NGO' }, { name: 'Sapporo', code: 'SPK' }, { name: 'Fukuoka', code: 'FUK' },
        { name: 'Kobe', code: 'UKB' }, { name: 'Kawasaki', code: 'KWS' }, { name: 'Kyoto', code: 'KYT' },
        { name: 'Saitama', code: 'STM' }, { name: 'Hiroshima', code: 'HIJ' }, { name: 'Sendai', code: 'SDJ' },
        { name: 'Kitakyushu', code: 'KKJ' }, { name: 'Chiba', code: 'CHB' }, { name: 'Sakai', code: 'SAK' },
        { name: 'Niigata', code: 'KIJ' }, { name: 'Hamamatsu', code: 'HMM' }, { name: 'Okayama', code: 'OKJ' },
        { name: 'Sagamihara', code: 'SGM' }, { name: 'Kumamoto', code: 'KMJ' }, { name: 'Shizuoka', code: 'SZO' },
        { name: 'Kagoshima', code: 'KOJ' }, { name: 'Matsuyama', code: 'MYJ' }, { name: 'Kanazawa', code: 'KMQ' },
        { name: 'Utsunomiya', code: 'UTN' }, { name: 'Oita', code: 'OIT' }, { name: 'Nara', code: 'NAR' },
        { name: 'Nagasaki', code: 'NGS' }, { name: 'Toyama', code: 'TOY' }, { name: 'Gifu', code: 'GIF' }
      ],
      'KR': [
        { name: 'Seoul', code: 'SEL' }, { name: 'Busan', code: 'PUS' }, { name: 'Incheon', code: 'ICN' },
        { name: 'Daegu', code: 'TAE' }, { name: 'Daejeon', code: 'DJN' }, { name: 'Gwangju', code: 'KWJ' },
        { name: 'Suwon', code: 'SWN' }, { name: 'Ulsan', code: 'ULS' }, { name: 'Changwon', code: 'CHW' },
        { name: 'Goyang', code: 'GOY' }, { name: 'Yongin', code: 'YGI' }, { name: 'Seongnam', code: 'SNG' },
        { name: 'Bucheon', code: 'BCH' }, { name: 'Ansan', code: 'ASN' }, { name: 'Cheongju', code: 'CHJ' },
        { name: 'Jeonju', code: 'JJU' }, { name: 'Anyang', code: 'ANY' }, { name: 'Cheonan', code: 'CHN' },
        { name: 'Namyangju', code: 'NYJ' }, { name: 'Pohang', code: 'POH' }, { name: 'Uijeongbu', code: 'UJB' },
        { name: 'Siheung', code: 'SHG' }, { name: 'Jeju', code: 'CJU' }, { name: 'Pyeongtaek', code: 'PTK' },
        { name: 'Gimhae', code: 'GMH' }, { name: 'Wonju', code: 'WNJ' }, { name: 'Asan', code: 'ASN' },
        { name: 'Hwaseong', code: 'HWS' }, { name: 'Gunsan', code: 'GSN' }, { name: 'Gwangmyeong', code: 'GMY' }
      ],
      'CN': [
        { name: 'Beijing', code: 'PEK' }, { name: 'Shanghai', code: 'SHA' }, { name: 'Guangzhou', code: 'CAN' },
        { name: 'Shenzhen', code: 'SZX' }, { name: 'Tianjin', code: 'TSN' }, { name: 'Wuhan', code: 'WUH' },
        { name: 'Dongguan', code: 'DGN' }, { name: 'Chengdu', code: 'CTU' }, { name: 'Nanjing', code: 'NKG' },
        { name: 'Chongqing', code: 'CKG' }, { name: 'Xian', code: 'XIY' }, { name: 'Shenyang', code: 'SHE' },
        { name: 'Hangzhou', code: 'HGH' }, { name: 'Foshan', code: 'FOS' }, { name: 'Harbin', code: 'HRB' },
        { name: 'Suzhou', code: 'SZV' }, { name: 'Qingdao', code: 'TAO' }, { name: 'Dalian', code: 'DLC' },
        { name: 'Zhengzhou', code: 'CGO' }, { name: 'Shantou', code: 'SWA' }, { name: 'Jinan', code: 'TNA' },
        { name: 'Changchun', code: 'CGQ' }, { name: 'Kunming', code: 'KMG' }, { name: 'Taiyuan', code: 'TYN' },
        { name: 'Shijiazhuang', code: 'SJW' }, { name: 'Changsha', code: 'CSX' }, { name: 'Hefei', code: 'HFE' },
        { name: 'Nanchang', code: 'KHN' }, { name: 'Nanning', code: 'NNG' }, { name: 'Guiyang', code: 'KWE' }
      ],
      'IN': [
        { name: 'Mumbai', code: 'BOM' }, { name: 'Delhi', code: 'DEL' }, { name: 'Bangalore', code: 'BLR' },
        { name: 'Hyderabad', code: 'HYD' }, { name: 'Ahmedabad', code: 'AMD' }, { name: 'Chennai', code: 'MAA' },
        { name: 'Kolkata', code: 'CCU' }, { name: 'Surat', code: 'STV' }, { name: 'Pune', code: 'PNQ' },
        { name: 'Jaipur', code: 'JAI' }, { name: 'Lucknow', code: 'LKO' }, { name: 'Kanpur', code: 'KNU' },
        { name: 'Nagpur', code: 'NAG' }, { name: 'Indore', code: 'IDR' }, { name: 'Thane', code: 'TNE' },
        { name: 'Bhopal', code: 'BHO' }, { name: 'Visakhapatnam', code: 'VTZ' }, { name: 'Pimpri-Chinchwad', code: 'PCC' },
        { name: 'Patna', code: 'PAT' }, { name: 'Vadodara', code: 'BDQ' }, { name: 'Ghaziabad', code: 'GHZ' },
        { name: 'Ludhiana', code: 'LDH' }, { name: 'Agra', code: 'AGR' }, { name: 'Nashik', code: 'ISK' },
        { name: 'Faridabad', code: 'FBD' }, { name: 'Meerut', code: 'MRT' }, { name: 'Rajkot', code: 'RAJ' },
        { name: 'Kalyan-Dombivali', code: 'KLD' }, { name: 'Vasai-Virar', code: 'VVR' }, { name: 'Varanasi', code: 'VNS' }
      ],
      'BR': [
        { name: 'São Paulo', code: 'SAO' }, { name: 'Rio de Janeiro', code: 'RIO' }, { name: 'Brasília', code: 'BSB' },
        { name: 'Salvador', code: 'SSA' }, { name: 'Fortaleza', code: 'FOR' }, { name: 'Belo Horizonte', code: 'BHZ' },
        { name: 'Manaus', code: 'MAO' }, { name: 'Curitiba', code: 'CWB' }, { name: 'Recife', code: 'REC' },
        { name: 'Goiânia', code: 'GYN' }, { name: 'Belém', code: 'BEL' }, { name: 'Porto Alegre', code: 'POA' },
        { name: 'Guarulhos', code: 'GRU' }, { name: 'Campinas', code: 'CPQ' }, { name: 'São Luís', code: 'SLZ' },
        { name: 'São Gonçalo', code: 'SGC' }, { name: 'Maceió', code: 'MCZ' }, { name: 'Duque de Caxias', code: 'DCA' },
        { name: 'Natal', code: 'NAT' }, { name: 'Teresina', code: 'THE' }, { name: 'Campo Grande', code: 'CGR' },
        { name: 'Nova Iguaçu', code: 'NIG' }, { name: 'São Bernardo do Campo', code: 'SBC' }, { name: 'João Pessoa', code: 'JPA' },
        { name: 'Osasco', code: 'OSC' }, { name: 'Santo André', code: 'STA' }, { name: 'Jaboatão dos Guararapes', code: 'JAB' },
        { name: 'Contagem', code: 'CNT' }, { name: 'Ribeirão Preto', code: 'RAO' }, { name: 'Uberlândia', code: 'UDI' }
      ],
      'MX': [
        { name: 'Mexico City', code: 'MEX' }, { name: 'Guadalajara', code: 'GDL' }, { name: 'Monterrey', code: 'MTY' },
        { name: 'Puebla', code: 'PBC' }, { name: 'Tijuana', code: 'TIJ' }, { name: 'León', code: 'BJX' },
        { name: 'Juárez', code: 'CJS' }, { name: 'Torreón', code: 'TRC' }, { name: 'Querétaro', code: 'QRO' },
        { name: 'San Luis Potosí', code: 'SLP' }, { name: 'Mérida', code: 'MID' }, { name: 'Mexicali', code: 'MXL' },
        { name: 'Aguascalientes', code: 'AGU' }, { name: 'Acapulco', code: 'ACA' }, { name: 'Cuernavaca', code: 'CVJ' },
        { name: 'Chihuahua', code: 'CUU' }, { name: 'Saltillo', code: 'SLW' }, { name: 'Cancún', code: 'CUN' },
        { name: 'Morelia', code: 'MLM' }, { name: 'Xalapa', code: 'JAL' }, { name: 'Tampico', code: 'TAM' },
        { name: 'Culiacán', code: 'CUL' }, { name: 'Hermosillo', code: 'HMO' }, { name: 'Reynosa', code: 'REX' },
        { name: 'Toluca', code: 'TLC' }, { name: 'Veracruz', code: 'VER' }, { name: 'Tuxtla Gutiérrez', code: 'TGZ' },
        { name: 'Mazatlán', code: 'MZT' }, { name: 'Villahermosa', code: 'VSA' }, { name: 'Nuevo Laredo', code: 'NLD' }
      ],
      'AE': [
        { name: 'Dubai', code: 'DXB' }, { name: 'Abu Dhabi', code: 'AUH' }, { name: 'Sharjah', code: 'SHJ' },
        { name: 'Al Ain', code: 'AAN' }, { name: 'Ajman', code: 'AJM' }, { name: 'Ras Al Khaimah', code: 'RKT' },
        { name: 'Fujairah', code: 'FJR' }, { name: 'Umm Al Quwain', code: 'UAQ' }, { name: 'Khor Fakkan', code: 'KFK' },
        { name: 'Dibba Al-Fujairah', code: 'DBA' }, { name: 'Kalba', code: 'KLB' }, { name: 'Madinat Zayed', code: 'MZY' },
        { name: 'Liwa Oasis', code: 'LWO' }, { name: 'Al Dhafra', code: 'DHF' }, { name: 'Ruwais', code: 'RUW' }
      ],
      'SG': [
        { name: 'Singapore', code: 'SIN' }
      ],
      'SA': [
        { name: 'Riyadh', code: 'RUH' }, { name: 'Jeddah', code: 'JED' }, { name: 'Mecca', code: 'MEC' },
        { name: 'Medina', code: 'MED' }, { name: 'Dammam', code: 'DMM' }, { name: 'Khobar', code: 'KHO' },
        { name: 'Dhahran', code: 'DHA' }, { name: 'Taif', code: 'TIF' }, { name: 'Tabuk', code: 'TUU' },
        { name: 'Buraidah', code: 'ELQ' }, { name: 'Khamis Mushait', code: 'AHB' }, { name: 'Hail', code: 'HAS' },
        { name: 'Hafar Al-Batin', code: 'HBT' }, { name: 'Jubail', code: 'JBL' }, { name: 'Yanbu', code: 'YNB' },
        { name: 'Abha', code: 'AHB' }, { name: 'Najran', code: 'EAM' }, { name: 'Al Qatif', code: 'QTF' },
        { name: 'Arar', code: 'RAR' }, { name: 'Sakaka', code: 'AJF' }, { name: 'Jizan', code: 'GIZ' }
      ],
      'EG': [
        { name: 'Cairo', code: 'CAI' }, { name: 'Alexandria', code: 'ALY' }, { name: 'Giza', code: 'GIZ' },
        { name: 'Shubra El Kheima', code: 'SHK' }, { name: 'Port Said', code: 'PSD' }, { name: 'Suez', code: 'SUZ' },
        { name: 'Luxor', code: 'LXR' }, { name: 'Mansoura', code: 'MAN' }, { name: 'El Mahalla El Kubra', code: 'EMK' },
        { name: 'Tanta', code: 'TNT' }, { name: 'Asyut', code: 'ATZ' }, { name: 'Ismailia', code: 'ISM' },
        { name: 'Fayyum', code: 'FYM' }, { name: 'Zagazig', code: 'ZAG' }, { name: 'Aswan', code: 'ASW' },
        { name: 'Damietta', code: 'DAM' }, { name: 'Damanhur', code: 'DMH' }, { name: 'Minya', code: 'MNY' },
        { name: 'Beni Suef', code: 'BSF' }, { name: 'Qena', code: 'QEN' }, { name: 'Sohag', code: 'SOH' }
      ],
      'ZA': [
        { name: 'Cape Town', code: 'CPT' }, { name: 'Johannesburg', code: 'JNB' }, { name: 'Durban', code: 'DUR' },
        { name: 'Pretoria', code: 'PRY' }, { name: 'Port Elizabeth', code: 'PLZ' }, { name: 'Pietermaritzburg', code: 'PZB' },
        { name: 'Benoni', code: 'BEN' }, { name: 'Tembisa', code: 'TEM' }, { name: 'East London', code: 'ELS' },
        { name: 'Vereeniging', code: 'VER' }, { name: 'Bloemfontein', code: 'BFN' }, { name: 'Boksburg', code: 'BOK' },
        { name: 'Welkom', code: 'WEL' }, { name: 'Newcastle', code: 'NCS' }, { name: 'Krugersdorp', code: 'KRU' },
        { name: 'Diepsloot', code: 'DIE' }, { name: 'Botshabelo', code: 'BOT' }, { name: 'Brakpan', code: 'BRA' },
        { name: 'Witbank', code: 'WIT' }, { name: 'Oberholzer', code: 'OBE' }, { name: 'Germiston', code: 'GER' }
      ],
      'NG': [
        { name: 'Lagos', code: 'LOS' }, { name: 'Kano', code: 'KAN' }, { name: 'Ibadan', code: 'IBA' },
        { name: 'Abuja', code: 'ABV' }, { name: 'Port Harcourt', code: 'PHC' }, { name: 'Benin City', code: 'BNI' },
        { name: 'Maiduguri', code: 'MIU' }, { name: 'Zaria', code: 'ZAR' }, { name: 'Aba', code: 'ABA' },
        { name: 'Jos', code: 'JOS' }, { name: 'Ilorin', code: 'ILR' }, { name: 'Oyo', code: 'OYO' },
        { name: 'Enugu', code: 'ENU' }, { name: 'Abeokuta', code: 'ABE' }, { name: 'Kaduna', code: 'KAD' },
        { name: 'Ogbomoso', code: 'OGB' }, { name: 'Sokoto', code: 'SOK' }, { name: 'Osogbo', code: 'OSO' },
        { name: 'Ondo', code: 'OND' }, { name: 'Bamenda', code: 'BAM' }, { name: 'Calabar', code: 'CBQ' }
      ],
      'KE': [
        { name: 'Nairobi', code: 'NBO' }, { name: 'Mombasa', code: 'MBA' }, { name: 'Kisumu', code: 'KIS' },
        { name: 'Nakuru', code: 'NUU' }, { name: 'Eldoret', code: 'EDL' }, { name: 'Kehancha', code: 'KEH' },
        { name: 'Malindi', code: 'MYD' }, { name: 'Kitale', code: 'KTL' }, { name: 'Garissa', code: 'GAS' },
        { name: 'Kakamega', code: 'GGM' }, { name: 'Thika', code: 'THK' }, { name: 'Lamu', code: 'LAU' },
        { name: 'Nyeri', code: 'NYE' }, { name: 'Machakos', code: 'MAC' }, { name: 'Meru', code: 'MRU' },
        { name: 'Kericho', code: 'KRC' }, { name: 'Migori', code: 'MIG' }, { name: 'Uasin Gishu', code: 'UGS' },
        { name: 'Nanyuki', code: 'NYK' }, { name: 'Voi', code: 'VOI' }, { name: 'Wajir', code: 'WJR' }
      ],
      'MA': [
        { name: 'Casablanca', code: 'CMN' }, { name: 'Rabat', code: 'RBA' }, { name: 'Fes', code: 'FEZ' },
        { name: 'Marrakech', code: 'RAK' }, { name: 'Tangier', code: 'TNG' }, { name: 'Agadir', code: 'AGA' },
        { name: 'Meknes', code: 'MEK' }, { name: 'Oujda', code: 'OUD' }, { name: 'Kenitra', code: 'KNT' },
        { name: 'Tetouan', code: 'TTU' }, { name: 'Safi', code: 'SFI' }, { name: 'Mohammedia', code: 'MOH' },
        { name: 'Khouribga', code: 'KHG' }, { name: 'Beni Mellal', code: 'BNI' }, { name: 'El Jadida', code: 'EJD' },
        { name: 'Taza', code: 'TAZ' }, { name: 'Nador', code: 'NDR' }, { name: 'Settat', code: 'SET' },
        { name: 'Larache', code: 'LRC' }, { name: 'Khenifra', code: 'KHN' }, { name: 'Guelmim', code: 'GLM' }
      ],
      'RU': [
        { name: 'Moscow', code: 'MOW' }, { name: 'Saint Petersburg', code: 'LED' }, { name: 'Novosibirsk', code: 'OVB' },
        { name: 'Yekaterinburg', code: 'SVX' }, { name: 'Kazan', code: 'KZN' }, { name: 'Nizhny Novgorod', code: 'GOJ' },
        { name: 'Chelyabinsk', code: 'CEK' }, { name: 'Samara', code: 'KUF' }, { name: 'Omsk', code: 'OMS' },
        { name: 'Rostov-on-Don', code: 'ROV' }, { name: 'Ufa', code: 'UFA' }, { name: 'Krasnoyarsk', code: 'KJA' },
        { name: 'Perm', code: 'PEE' }, { name: 'Voronezh', code: 'VOZ' }, { name: 'Volgograd', code: 'VOG' },
        { name: 'Krasnodar', code: 'KRR' }, { name: 'Saratov', code: 'GSV' }, { name: 'Tyumen', code: 'TJM' },
        { name: 'Tolyatti', code: 'TOL' }, { name: 'Izhevsk', code: 'IJK' }, { name: 'Barnaul', code: 'BAX' }
      ],
      'TR': [
        { name: 'Istanbul', code: 'IST' }, { name: 'Ankara', code: 'ANK' }, { name: 'Izmir', code: 'ADB' },
        { name: 'Bursa', code: 'YEI' }, { name: 'Adana', code: 'ADA' }, { name: 'Gaziantep', code: 'GZT' },
        { name: 'Konya', code: 'KYA' }, { name: 'Antalya', code: 'AYT' }, { name: 'Kayseri', code: 'ASR' },
        { name: 'Mersin', code: 'MER' }, { name: 'Eskisehir', code: 'ESK' }, { name: 'Diyarbakir', code: 'DIY' },
        { name: 'Samsun', code: 'SZF' }, { name: 'Denizli', code: 'DNZ' }, { name: 'Adapazari', code: 'ADP' },
        { name: 'Malatya', code: 'MLX' }, { name: 'Kahramanmaras', code: 'KCM' }, { name: 'Erzurum', code: 'ERZ' },
        { name: 'Van', code: 'VAN' }, { name: 'Batman', code: 'BAL' }, { name: 'Elazig', code: 'EZS' }
      ],
      'PL': [
        { name: 'Warsaw', code: 'WAW' }, { name: 'Krakow', code: 'KRK' }, { name: 'Lodz', code: 'LCJ' },
        { name: 'Wroclaw', code: 'WRO' }, { name: 'Poznan', code: 'POZ' }, { name: 'Gdansk', code: 'GDN' },
        { name: 'Szczecin', code: 'SZZ' }, { name: 'Bydgoszcz', code: 'BYD' }, { name: 'Lublin', code: 'LUZ' },
        { name: 'Katowice', code: 'KTW' }, { name: 'Bialystok', code: 'BJL' }, { name: 'Gdynia', code: 'GDY' },
        { name: 'Czestochowa', code: 'CZE' }, { name: 'Radom', code: 'RDM' }, { name: 'Sosnowiec', code: 'SOS' },
        { name: 'Torun', code: 'TRN' }, { name: 'Kielce', code: 'KLC' }, { name: 'Gliwice', code: 'GLI' },
        { name: 'Zabrze', code: 'ZAB' }, { name: 'Bytom', code: 'BYT' }, { name: 'Olsztyn', code: 'SZY' }
      ],
      'TH': [
        { name: 'Bangkok', code: 'BKK' }, { name: 'Nonthaburi', code: 'NTB' }, { name: 'Nakhon Ratchasima', code: 'NAK' },
        { name: 'Chiang Mai', code: 'CNX' }, { name: 'Hat Yai', code: 'HDY' }, { name: 'Udon Thani', code: 'UTH' },
        { name: 'Pak Kret', code: 'PKR' }, { name: 'Khon Kaen', code: 'KKC' }, { name: 'Chiang Rai', code: 'CEI' },
        { name: 'Thon Buri', code: 'THB' }, { name: 'Nakhon Si Thammarat', code: 'NST' }, { name: 'Rayong', code: 'RYG' },
        { name: 'Lampang', code: 'LPT' }, { name: 'Ubon Ratchathani', code: 'UBP' }, { name: 'Roi Et', code: 'ROI' },
        { name: 'Kanchanaburi', code: 'KAN' }, { name: 'Surat Thani', code: 'URT' }, { name: 'Surin', code: 'SRI' },
        { name: 'Sisaket', code: 'SSK' }, { name: 'Phitsanulok', code: 'PHS' }, { name: 'Nong Khai', code: 'NKI' }
      ],
      'PH': [
        { name: 'Manila', code: 'MNL' }, { name: 'Quezon City', code: 'QZN' }, { name: 'Davao', code: 'DVO' },
        { name: 'Caloocan', code: 'CAL' }, { name: 'Cebu City', code: 'CEB' }, { name: 'Zamboanga', code: 'ZAM' },
        { name: 'Antipolo', code: 'ANT' }, { name: 'Pasig', code: 'PSG' }, { name: 'Taguig', code: 'TGG' },
        { name: 'Valenzuela', code: 'VAL' }, { name: 'Dasmariñas', code: 'DAS' }, { name: 'Calamba', code: 'CLB' },
        { name: 'Makati', code: 'MKT' }, { name: 'Marikina', code: 'MRK' }, { name: 'Muntinlupa', code: 'MNT' },
        { name: 'Baguio', code: 'BAG' }, { name: 'Bacolod', code: 'BCD' }, { name: 'Iloilo City', code: 'ILO' },
        { name: 'Cagayan de Oro', code: 'CGY' }, { name: 'Parañaque', code: 'PRQ' }, { name: 'Las Piñas', code: 'LPS' }
      ],
      'VN': [
        { name: 'Ho Chi Minh City', code: 'SGN' }, { name: 'Hanoi', code: 'HAN' }, { name: 'Da Nang', code: 'DAD' },
        { name: 'Hai Phong', code: 'HPH' }, { name: 'Can Tho', code: 'VCA' }, { name: 'Bien Hoa', code: 'BHH' },
        { name: 'Hue', code: 'HUI' }, { name: 'Nha Trang', code: 'CXR' }, { name: 'Buon Ma Thuot', code: 'BMV' },
        { name: 'Quy Nhon', code: 'UIH' }, { name: 'Vung Tau', code: 'VTG' }, { name: 'Nam Dinh', code: 'NMD' },
        { name: 'Phan Thiet', code: 'PHA' }, { name: 'Long Xuyen', code: 'LXG' }, { name: 'Ha Long', code: 'HLG' },
        { name: 'Thai Nguyen', code: 'THN' }, { name: 'Thanh Hoa', code: 'THH' }, { name: 'Rach Gia', code: 'RCH' },
        { name: 'Cam Ranh', code: 'CRH' }, { name: 'Vinh', code: 'VII' }, { name: 'My Tho', code: 'MTH' }
      ],
      'MY': [
        { name: 'Kuala Lumpur', code: 'KUL' }, { name: 'George Town', code: 'PEN' }, { name: 'Ipoh', code: 'IPH' },
        { name: 'Shah Alam', code: 'SZB' }, { name: 'Petaling Jaya', code: 'PJY' }, { name: 'Klang', code: 'KLG' },
        { name: 'Johor Bahru', code: 'JHB' }, { name: 'Subang Jaya', code: 'SBJ' }, { name: 'Kuching', code: 'KCH' },
        { name: 'Kota Kinabalu', code: 'BKI' }, { name: 'Seremban', code: 'SRM' }, { name: 'Kuantan', code: 'KUA' },
        { name: 'Iskandar Puteri', code: 'ISK' }, { name: 'Ampang Jaya', code: 'APG' }, { name: 'Malacca City', code: 'MLC' },
        { name: 'Aruah', code: 'ARU' }, { name: 'Sungai Petani', code: 'SPT' }, { name: 'Miri', code: 'MYY' },
        { name: 'Sandakan', code: 'SDK' }, { name: 'Alor Setar', code: 'AOR' }, { name: 'Tawau', code: 'TWU' }
      ],
      'ID': [
        { name: 'Jakarta', code: 'JKT' }, { name: 'Surabaya', code: 'SUB' }, { name: 'Bandung', code: 'BDO' },
        { name: 'Bekasi', code: 'BKS' }, { name: 'Medan', code: 'MES' }, { name: 'Tangerang', code: 'TNG' },
        { name: 'Depok', code: 'DPK' }, { name: 'Semarang', code: 'SRG' }, { name: 'Palembang', code: 'PLM' },
        { name: 'Makassar', code: 'UPG' }, { name: 'Batam', code: 'BTH' }, { name: 'Bogor', code: 'BGR' },
        { name: 'Pekanbaru', code: 'PKU' }, { name: 'Bandar Lampung', code: 'TKG' }, { name: 'Padang', code: 'PDG' },
        { name: 'Malang', code: 'MLG' }, { name: 'Denpasar', code: 'DPS' }, { name: 'Samarinda', code: 'SRI' },
        { name: 'Tasikmalaya', code: 'TSK' }, { name: 'Serang', code: 'SRN' }, { name: 'Banjarmasin', code: 'BDJ' }
      ],
      'AR': [
        { name: 'Buenos Aires', code: 'BUE' }, { name: 'Córdoba', code: 'COR' }, { name: 'Rosario', code: 'ROS' },
        { name: 'Mendoza', code: 'MDZ' }, { name: 'Tucumán', code: 'TUC' }, { name: 'La Plata', code: 'LPL' },
        { name: 'Mar del Plata', code: 'MDQ' }, { name: 'Salta', code: 'SLA' }, { name: 'Santa Fe', code: 'SFN' },
        { name: 'San Juan', code: 'UAQ' }, { name: 'Resistencia', code: 'RES' }, { name: 'Santiago del Estero', code: 'SDE' },
        { name: 'Corrientes', code: 'CNQ' }, { name: 'Posadas', code: 'PSS' }, { name: 'Bahía Blanca', code: 'BHI' },
        { name: 'Paraná', code: 'PRA' }, { name: 'Neuquén', code: 'NQN' }, { name: 'Formosa', code: 'FMA' },
        { name: 'San Luis', code: 'LUQ' }, { name: 'Catamarca', code: 'CTC' }, { name: 'La Rioja', code: 'IRJ' }
      ],
      'CL': [
        { name: 'Santiago', code: 'SCL' }, { name: 'Valparaíso', code: 'VAP' }, { name: 'Concepción', code: 'CCP' },
        { name: 'La Serena', code: 'LSC' }, { name: 'Antofagasta', code: 'ANF' }, { name: 'Temuco', code: 'TEM' },
        { name: 'Rancagua', code: 'RAN' }, { name: 'Talca', code: 'TLC' }, { name: 'Arica', code: 'ARI' },
        { name: 'Chillán', code: 'CHL' }, { name: 'Iquique', code: 'IQQ' }, { name: 'Los Ángeles', code: 'LSA' },
        { name: 'Puerto Montt', code: 'PMC' }, { name: 'Valdivia', code: 'VLD' }, { name: 'Osorno', code: 'OSO' },
        { name: 'Copiapó', code: 'CPO' }, { name: 'Quillota', code: 'QUI' }, { name: 'Curicó', code: 'CUR' },
        { name: 'Punta Arenas', code: 'PUQ' }, { name: 'San Antonio', code: 'SAN' }, { name: 'Calama', code: 'CJC' }
      ],
      'CO': [
        { name: 'Bogotá', code: 'BOG' }, { name: 'Medellín', code: 'MDE' }, { name: 'Cali', code: 'CLO' },
        { name: 'Barranquilla', code: 'BAQ' }, { name: 'Cartagena', code: 'CTG' }, { name: 'Cúcuta', code: 'CUC' },
        { name: 'Soledad', code: 'SOL' }, { name: 'Ibagué', code: 'IBE' }, { name: 'Bucaramanga', code: 'BGA' },
        { name: 'Soacha', code: 'SOA' }, { name: 'Santa Marta', code: 'SMR' }, { name: 'Villavicencio', code: 'VVC' },
        { name: 'Valledupar', code: 'VUP' }, { name: 'Montería', code: 'MTR' }, { name: 'Pereira', code: 'PEI' },
        { name: 'Manizales', code: 'MZL' }, { name: 'Pasto', code: 'PSO' }, { name: 'Neiva', code: 'NVA' },
        { name: 'Armenia', code: 'AXM' }, { name: 'Sincelejo', code: 'SIN' }, { name: 'Popayán', code: 'PPN' }
      ],
      'CH': [
        { name: 'Zurich', code: 'ZUR' }, { name: 'Geneva', code: 'GVA' }, { name: 'Basel', code: 'BSL' },
        { name: 'Bern', code: 'BRN' }, { name: 'Lausanne', code: 'LSN' }, { name: 'Winterthur', code: 'WTH' },
        { name: 'Lucerne', code: 'LCN' }, { name: 'St. Gallen', code: 'SGL' }, { name: 'Lugano', code: 'LUG' },
        { name: 'Biel/Bienne', code: 'BIL' }, { name: 'Thun', code: 'THN' }, { name: 'Köniz', code: 'KNZ' },
        { name: 'La Chaux-de-Fonds', code: 'CDF' }, { name: 'Schaffhausen', code: 'SHF' }, { name: 'Fribourg', code: 'FRB' },
        { name: 'Vernier', code: 'VER' }, { name: 'Chur', code: 'CHR' }, { name: 'Neuchâtel', code: 'NCH' },
        { name: 'Uster', code: 'UST' }, { name: 'Sion', code: 'SIO' }, { name: 'Emmen', code: 'EMM' }
      ],
      'SE': [
        { name: 'Stockholm', code: 'STO' }, { name: 'Gothenburg', code: 'GOT' }, { name: 'Malmö', code: 'MMX' },
        { name: 'Uppsala', code: 'UPS' }, { name: 'Västerås', code: 'VST' }, { name: 'Örebro', code: 'ORB' },
        { name: 'Linköping', code: 'LNK' }, { name: 'Helsingborg', code: 'HLB' }, { name: 'Jönköping', code: 'JKP' },
        { name: 'Norrköping', code: 'NRK' }, { name: 'Lund', code: 'LND' }, { name: 'Umeå', code: 'UME' },
        { name: 'Gävle', code: 'GVL' }, { name: 'Borås', code: 'BOR' }, { name: 'Södertälje', code: 'SOD' },
        { name: 'Eskilstuna', code: 'ESK' }, { name: 'Halmstad', code: 'HAL' }, { name: 'Växjö', code: 'VXJ' },
        { name: 'Karlstad', code: 'KSD' }, { name: 'Sundsvall', code: 'SDL' }, { name: 'Trollhättan', code: 'TRL' }
      ],
      'NO': [
        { name: 'Oslo', code: 'OSL' }, { name: 'Bergen', code: 'BGO' }, { name: 'Stavanger', code: 'SVG' },
        { name: 'Trondheim', code: 'TRD' }, { name: 'Drammen', code: 'DRM' }, { name: 'Fredrikstad', code: 'FRD' },
        { name: 'Kristiansand', code: 'KRS' }, { name: 'Sandnes', code: 'SAN' }, { name: 'Tromsø', code: 'TOS' },
        { name: 'Sarpsborg', code: 'SAR' }, { name: 'Skien', code: 'SKI' }, { name: 'Ålesund', code: 'ALS' },
        { name: 'Sandefjord', code: 'SDF' }, { name: 'Haugesund', code: 'HAU' }, { name: 'Tønsberg', code: 'TON' },
        { name: 'Moss', code: 'MOS' }, { name: 'Bodø', code: 'BOO' }, { name: 'Arendal', code: 'ARE' },
        { name: 'Hamar', code: 'HAM' }, { name: 'Ytrebygda', code: 'YTR' }, { name: 'Larvik', code: 'LAR' }
      ],
      'DK': [
        { name: 'Copenhagen', code: 'CPH' }, { name: 'Aarhus', code: 'AAR' }, { name: 'Odense', code: 'ODE' },
        { name: 'Aalborg', code: 'AAL' }, { name: 'Esbjerg', code: 'EBJ' }, { name: 'Randers', code: 'RAN' },
        { name: 'Kolding', code: 'KOL' }, { name: 'Horsens', code: 'HOR' }, { name: 'Vejle', code: 'VEJ' },
        { name: 'Roskilde', code: 'ROS' }, { name: 'Herning', code: 'HER' }, { name: 'Silkeborg', code: 'SIL' },
        { name: 'Næstved', code: 'NAS' }, { name: 'Fredericia', code: 'FRE' }, { name: 'Viborg', code: 'VIB' },
        { name: 'Køge', code: 'KOG' }, { name: 'Holstebro', code: 'HOL' }, { name: 'Taastrup', code: 'TAA' },
        { name: 'Slagelse', code: 'SLA' }, { name: 'Hillerød', code: 'HIL' }, { name: 'Sønderborg', code: 'SON' }
      ],
      'FI': [
        { name: 'Helsinki', code: 'HEL' }, { name: 'Espoo', code: 'ESP' }, { name: 'Tampere', code: 'TMP' },
        { name: 'Vantaa', code: 'VAN' }, { name: 'Oulu', code: 'OUL' }, { name: 'Turku', code: 'TKU' },
        { name: 'Jyväskylä', code: 'JYV' }, { name: 'Lahti', code: 'LAH' }, { name: 'Kuopio', code: 'KUO' },
        { name: 'Pori', code: 'POR' }, { name: 'Joensuu', code: 'JOE' }, { name: 'Lappeenranta', code: 'LAP' },
        { name: 'Hämeenlinna', code: 'HAM' }, { name: 'Vaasa', code: 'VAA' }, { name: 'Seinäjoki', code: 'SEI' },
        { name: 'Rovaniemi', code: 'ROV' }, { name: 'Mikkeli', code: 'MIK' }, { name: 'Kotka', code: 'KOT' },
        { name: 'Salo', code: 'SAL' }, { name: 'Porvoo', code: 'POO' }, { name: 'Kouvola', code: 'KOV' }
      ],
      'BE': [
        { name: 'Brussels', code: 'BRU' }, { name: 'Antwerp', code: 'ANR' }, { name: 'Ghent', code: 'GNT' },
        { name: 'Charleroi', code: 'CRL' }, { name: 'Liège', code: 'LGG' }, { name: 'Bruges', code: 'BRG' },
        { name: 'Namur', code: 'NAM' }, { name: 'Leuven', code: 'LEU' }, { name: 'Mons', code: 'MON' },
        { name: 'Aalst', code: 'AAL' }, { name: 'Mechelen', code: 'MEC' }, { name: 'La Louvière', code: 'LLV' },
        { name: 'Kortrijk', code: 'KOR' }, { name: 'Hasselt', code: 'HAS' }, { name: 'Sint-Niklaas', code: 'SNK' },
        { name: 'Ostend', code: 'OST' }, { name: 'Genk', code: 'GEN' }, { name: 'Seraing', code: 'SER' },
        { name: 'Roeselare', code: 'ROE' }, { name: 'Mouscron', code: 'MOU' }, { name: 'Verviers', code: 'VER' }
      ],
      'AT': [
        { name: 'Vienna', code: 'VIE' }, { name: 'Graz', code: 'GRZ' }, { name: 'Linz', code: 'LNZ' },
        { name: 'Salzburg', code: 'SZG' }, { name: 'Innsbruck', code: 'INN' }, { name: 'Klagenfurt', code: 'KLA' },
        { name: 'Villach', code: 'VIL' }, { name: 'Wels', code: 'WEL' }, { name: 'Sankt Pölten', code: 'STP' },
        { name: 'Dornbirn', code: 'DOR' }, { name: 'Wiener Neustadt', code: 'WNS' }, { name: 'Steyr', code: 'STY' },
        { name: 'Feldkirch', code: 'FEL' }, { name: 'Bregenz', code: 'BRE' }, { name: 'Leonding', code: 'LEO' },
        { name: 'Klosterneuburg', code: 'KLO' }, { name: 'Baden bei Wien', code: 'BAD' }, { name: 'Wolfsberg', code: 'WOL' },
        { name: 'Leoben', code: 'LEB' }, { name: 'Krems', code: 'KRE' }, { name: 'Traun', code: 'TRA' }
      ],
      'CZ': [
        { name: 'Prague', code: 'PRG' }, { name: 'Brno', code: 'BRN' }, { name: 'Ostrava', code: 'OSR' },
        { name: 'Plzen', code: 'PLZ' }, { name: 'Liberec', code: 'LIB' }, { name: 'Olomouc', code: 'OLO' },
        { name: 'České Budějovice', code: 'BUD' }, { name: 'Hradec Králové', code: 'HKR' }, { name: 'Ústí nad Labem', code: 'UNL' },
        { name: 'Pardubice', code: 'PAR' }, { name: 'Zlín', code: 'ZLN' }, { name: 'Kladno', code: 'KLA' },
        { name: 'Most', code: 'MOS' }, { name: 'Opava', code: 'OPA' }, { name: 'Frýdek-Místek', code: 'FRY' },
        { name: 'Jihlava', code: 'JIH' }, { name: 'Teplice', code: 'TEP' }, { name: 'Děčín', code: 'DEC' },
        { name: 'Karlovy Vary', code: 'KAR' }, { name: 'Jablonec nad Nisou', code: 'JAB' }, { name: 'Mladá Boleslav', code: 'MLB' }
      ],
      'HU': [
        { name: 'Budapest', code: 'BUD' }, { name: 'Debrecen', code: 'DEB' }, { name: 'Szeged', code: 'SZE' },
        { name: 'Miskolc', code: 'MIS' }, { name: 'Pécs', code: 'PEC' }, { name: 'Győr', code: 'GYO' },
        { name: 'Nyíregyháza', code: 'NYI' }, { name: 'Kecskemét', code: 'KEC' }, { name: 'Székesfehérvár', code: 'SZF' },
        { name: 'Szombathely', code: 'SZO' }, { name: 'Érd', code: 'ERD' }, { name: 'Tatabánya', code: 'TAT' },
        { name: 'Kaposvár', code: 'KAP' }, { name: 'Békéscsaba', code: 'BEK' }, { name: 'Zalaegerszeg', code: 'ZAL' },
        { name: 'Sopron', code: 'SOP' }, { name: 'Eger', code: 'EGE' }, { name: 'Nagykanizsa', code: 'NAG' },
        { name: 'Dunaújváros', code: 'DUN' }, { name: 'Hódmezővásárhely', code: 'HOD' }, { name: 'Szolnok', code: 'SZL' }
      ],
      'HK': [
        { name: 'Hong Kong', code: 'HKG' }, { name: 'Kowloon', code: 'KLN' }, { name: 'New Territories', code: 'NTE' },
        { name: 'Central', code: 'CEN' }, { name: 'Tsim Sha Tsui', code: 'TST' }, { name: 'Causeway Bay', code: 'CWB' },
        { name: 'Mong Kok', code: 'MKK' }, { name: 'Admiralty', code: 'ADM' }, { name: 'Wan Chai', code: 'WAN' },
        { name: 'Sheung Wan', code: 'SHW' }, { name: 'North Point', code: 'NPT' }, { name: 'Quarry Bay', code: 'QBY' },
        { name: 'Tai Koo', code: 'TKO' }, { name: 'Fortress Hill', code: 'FTH' }, { name: 'Tin Hau', code: 'THA' },
        { name: 'Chai Wan', code: 'CHW' }, { name: 'Shau Kei Wan', code: 'SKW' }, { name: 'Sai Wan Ho', code: 'SWH' },
        { name: 'Tai Po', code: 'TPO' }, { name: 'Sha Tin', code: 'SHT' }, { name: 'Tuen Mun', code: 'TMN' }
      ],
      'TW': [
        { name: 'Taipei', code: 'TPE' }, { name: 'Kaohsiung', code: 'KHH' }, { name: 'Taichung', code: 'TXG' },
        { name: 'Tainan', code: 'TNN' }, { name: 'Taoyuan', code: 'TAY' }, { name: 'New Taipei', code: 'NTP' },
        { name: 'Hsinchu', code: 'HSZ' }, { name: 'Keelung', code: 'KEL' }, { name: 'Chiayi', code: 'CYI' },
        { name: 'Changhua', code: 'CHW' }, { name: 'Pingtung', code: 'PTG' }, { name: 'Yunlin', code: 'YLN' },
        { name: 'Hualien', code: 'HUN' }, { name: 'Nantou', code: 'NTO' }, { name: 'Miaoli', code: 'MLE' },
        { name: 'Yilan', code: 'ILN' }, { name: 'Taitung', code: 'TTT' }, { name: 'Penghu', code: 'MZG' },
        { name: 'Kinmen', code: 'KNH' }, { name: 'Lienchiang', code: 'LCG' }, { name: 'Hsinchu County', code: 'HSC' }
      ],
      'PK': [
        { name: 'Karachi', code: 'KHI' }, { name: 'Lahore', code: 'LHE' }, { name: 'Islamabad', code: 'ISB' },
        { name: 'Rawalpindi', code: 'RWP' }, { name: 'Faisalabad', code: 'LYP' }, { name: 'Multan', code: 'MUX' },
        { name: 'Peshawar', code: 'PEW' }, { name: 'Quetta', code: 'UET' }, { name: 'Sialkot', code: 'SKT' },
        { name: 'Gujranwala', code: 'GJR' }, { name: 'Hyderabad', code: 'HDD' }, { name: 'Sargodha', code: 'SGI' },
        { name: 'Bahawalpur', code: 'BHV' }, { name: 'Sukkur', code: 'SKZ' }, { name: 'Larkana', code: 'LRK' },
        { name: 'Sheikhupura', code: 'SHK' }, { name: 'Jhang', code: 'JHG' }, { name: 'Rahim Yar Khan', code: 'RYK' },
        { name: 'Gujrat', code: 'GRT' }, { name: 'Kasur', code: 'KSR' }, { name: 'Mardan', code: 'MRD' }
      ],
      'BD': [
        { name: 'Dhaka', code: 'DAC' }, { name: 'Chittagong', code: 'CGP' }, { name: 'Sylhet', code: 'ZYL' },
        { name: 'Rajshahi', code: 'RJH' }, { name: 'Khulna', code: 'KHL' }, { name: 'Barisal', code: 'BZL' },
        { name: 'Rangpur', code: 'RGR' }, { name: 'Mymensingh', code: 'MYM' }, { name: 'Comilla', code: 'CML' },
        { name: 'Narayanganj', code: 'NRG' }, { name: 'Gazipur', code: 'GZP' }, { name: 'Tongi', code: 'TNG' },
        { name: 'Jessore', code: 'JSR' }, { name: 'Bogra', code: 'BGR' }, { name: 'Dinajpur', code: 'DNJ' },
        { name: 'Pabna', code: 'PBN' }, { name: 'Tangail', code: 'TGL' }, { name: 'Jamalpur', code: 'JML' },
        { name: 'Faridpur', code: 'FDP' }, { name: 'Kushtia', code: 'KST' }, { name: 'Brahmanbaria', code: 'BRB' }
      ],
      'LK': [
        { name: 'Colombo', code: 'CMB' }, { name: 'Kandy', code: 'KDY' }, { name: 'Galle', code: 'GLE' },
        { name: 'Jaffna', code: 'JAF' }, { name: 'Negombo', code: 'NGB' }, { name: 'Anuradhapura', code: 'ANP' },
        { name: 'Polonnaruwa', code: 'PLN' }, { name: 'Batticaloa', code: 'BTC' }, { name: 'Matara', code: 'MTR' },
        { name: 'Trincomalee', code: 'TRN' }, { name: 'Kurunegala', code: 'KRN' }, { name: 'Ratnapura', code: 'RTN' },
        { name: 'Badulla', code: 'BDL' }, { name: 'Kalutara', code: 'KLT' }, { name: 'Gampaha', code: 'GMP' },
        { name: 'Monaragala', code: 'MNR' }, { name: 'Hambantota', code: 'HMB' }, { name: 'Vavuniya', code: 'VVN' },
        { name: 'Kegalle', code: 'KGL' }, { name: 'Puttalam', code: 'PUT' }, { name: 'Ampara', code: 'AMP' }
      ],
      'IL': [
        { name: 'Jerusalem', code: 'JRS' }, { name: 'Tel Aviv', code: 'TLV' }, { name: 'Haifa', code: 'HFA' },
        { name: 'Rishon LeZion', code: 'RSL' }, { name: 'Petah Tikva', code: 'PTK' }, { name: 'Ashdod', code: 'ASD' },
        { name: 'Netanya', code: 'NTY' }, { name: 'Beer Sheva', code: 'BEV' }, { name: 'Holon', code: 'HLN' },
        { name: 'Bnei Brak', code: 'BBK' }, { name: 'Ramat Gan', code: 'RMG' }, { name: 'Ashkelon', code: 'ASK' },
        { name: 'Rehovot', code: 'RHT' }, { name: 'Bat Yam', code: 'BTY' }, { name: 'Beit Shemesh', code: 'BSH' },
        { name: 'Kfar Saba', code: 'KFS' }, { name: 'Herzliya', code: 'HRZ' }, { name: 'Hadera', code: 'HDR' },
        { name: 'Modiin', code: 'MDN' }, { name: 'Nazareth', code: 'NZR' }, { name: 'Lod', code: 'LOD' }
      ],
      'QA': [
        { name: 'Doha', code: 'DOH' }, { name: 'Al Rayyan', code: 'ALR' }, { name: 'Umm Salal', code: 'UMS' },
        { name: 'Al Khor', code: 'ALK' }, { name: 'Al Wakrah', code: 'ALW' }, { name: 'Madinat ash Shamal', code: 'MSL' },
        { name: 'Al Daayen', code: 'ALD' }, { name: 'Al Shahaniya', code: 'ALS' }, { name: 'Lusail', code: 'LSL' },
        { name: 'Al Gharrafa', code: 'AGR' }, { name: 'Al Sadd', code: 'ASD' }, { name: 'West Bay', code: 'WBY' },
        { name: 'Al Thumama', code: 'ATH' }, { name: 'Education City', code: 'EDC' }, { name: 'Katara', code: 'KTR' },
        { name: 'The Pearl', code: 'PRL' }, { name: 'Al Markhiya', code: 'AMK' }, { name: 'Al Waab', code: 'AWB' },
        { name: 'Al Aziziyah', code: 'AAZ' }, { name: 'Al Mansoura', code: 'AMN' }, { name: 'Bin Mahmoud', code: 'BMD' }
      ],
      'KW': [
        { name: 'Kuwait City', code: 'KWI' }, { name: 'Hawalli', code: 'HWL' }, { name: 'As Salimiyah', code: 'SLM' },
        { name: 'Sabah as Salem', code: 'SAS' }, { name: 'Al Farwaniyah', code: 'FRW' }, { name: 'Al Ahmadi', code: 'AHM' },
        { name: 'Al Jahra', code: 'JHR' }, { name: 'Mubarak al Kabeer', code: 'MKB' }, { name: 'Ar Riqqah', code: 'RQH' },
        { name: 'Al Fahaheel', code: 'FHH' }, { name: 'Mangaf', code: 'MNG' }, { name: 'Mahboula', code: 'MHB' },
        { name: 'Salmiya', code: 'SAL' }, { name: 'Abraq Khaitan', code: 'ABK' }, { name: 'Al Fintas', code: 'FNT' },
        { name: 'Bayan', code: 'BYN' }, { name: 'Mishref', code: 'MSH' }, { name: 'Salwa', code: 'SLW' },
        { name: 'Surra', code: 'SUR' }, { name: 'Jleeb Al Shuyoukh', code: 'JLS' }, { name: 'Khaitan', code: 'KHT' }
      ],
      'JO': [
        { name: 'Amman', code: 'AMM' }, { name: 'Zarqa', code: 'ZRQ' }, { name: 'Irbid', code: 'IRB' },
        { name: 'Russeifa', code: 'RSF' }, { name: 'Wadi as-Sir', code: 'WAS' }, { name: 'Aqaba', code: 'AQJ' },
        { name: 'Madaba', code: 'MDB' }, { name: 'As Salt', code: 'SLT' }, { name: 'Ma\'an', code: 'MAN' },
        { name: 'Jerash', code: 'JRS' }, { name: 'Karak', code: 'KRK' }, { name: 'Ajloun', code: 'AJL' },
        { name: 'Tafilah', code: 'TFL' }, { name: 'Mafraq', code: 'MFQ' }, { name: 'Sahab', code: 'SHB' },
        { name: 'Fuheis', code: 'FHS' }, { name: 'Jubeiha', code: 'JBH' }, { name: 'Sweileh', code: 'SWL' },
        { name: 'Tla al Ali', code: 'TLA' }, { name: 'Marj al Hamam', code: 'MHM' }, { name: 'Ain al Basha', code: 'AIB' }
      ],
      'LB': [
        { name: 'Beirut', code: 'BEY' }, { name: 'Tripoli', code: 'TRP' }, { name: 'Sidon', code: 'SID' },
        { name: 'Tyre', code: 'TYR' }, { name: 'Nabatieh', code: 'NBT' }, { name: 'Jounieh', code: 'JNH' },
        { name: 'Zahle', code: 'ZHL' }, { name: 'Baalbek', code: 'BAL' }, { name: 'Aley', code: 'ALY' },
        { name: 'Byblos', code: 'BYB' }, { name: 'Anjar', code: 'ANJ' }, { name: 'Bcharre', code: 'BCH' },
        { name: 'Bint Jbeil', code: 'BJL' }, { name: 'Marjayoun', code: 'MRJ' }, { name: 'Jezzine', code: 'JZN' },
        { name: 'Hasbaya', code: 'HSB' }, { name: 'Rashaya', code: 'RSH' }, { name: 'Hermel', code: 'HRM' },
        { name: 'Akkar', code: 'AKK' }, { name: 'Miniyeh-Danniyeh', code: 'MND' }, { name: 'Zgharta', code: 'ZGH' }
      ],
      'GH': [
        { name: 'Accra', code: 'ACC' }, { name: 'Kumasi', code: 'KMS' }, { name: 'Tamale', code: 'TML' },
        { name: 'Takoradi', code: 'TKD' }, { name: 'Cape Coast', code: 'CCT' }, { name: 'Tema', code: 'TEM' },
        { name: 'Ho', code: 'HOE' }, { name: 'Koforidua', code: 'KFR' }, { name: 'Sunyani', code: 'SUN' },
        { name: 'Wa', code: 'WAA' }, { name: 'Bolgatanga', code: 'BOL' }, { name: 'Techiman', code: 'TEC' },
        { name: 'Obuasi', code: 'OBU' }, { name: 'Tarkwa', code: 'TAR' }, { name: 'Nkawkaw', code: 'NKW' },
        { name: 'Winneba', code: 'WIN' }, { name: 'Elmina', code: 'ELM' }, { name: 'Kintampo', code: 'KIN' },
        { name: 'Berekum', code: 'BER' }, { name: 'Yendi', code: 'YEN' }, { name: 'Salaga', code: 'SAL' }
      ],
      'SN': [
        { name: 'Dakar', code: 'DKR' }, { name: 'Touba', code: 'TBA' }, { name: 'Thiès', code: 'THS' },
        { name: 'Kaolack', code: 'KLC' }, { name: 'Saint-Louis', code: 'XLS' }, { name: 'Ziguinchor', code: 'ZIG' },
        { name: 'Diourbel', code: 'DRB' }, { name: 'Louga', code: 'LGA' }, { name: 'Tambacounda', code: 'TBD' },
        { name: 'Mbour', code: 'MBR' }, { name: 'Kolda', code: 'KDA' }, { name: 'Fatick', code: 'FTK' },
        { name: 'Kédougou', code: 'KDG' }, { name: 'Matam', code: 'MAM' }, { name: 'Sédhiou', code: 'SDH' },
        { name: 'Rufisque', code: 'RUF' }, { name: 'Richard Toll', code: 'RTO' }, { name: 'Pikine', code: 'PIK' },
        { name: 'Guédiawaye', code: 'GDW' }, { name: 'Kaffrine', code: 'KAF' }, { name: 'Bambey', code: 'BAM' }
      ],
      'CI': [
        { name: 'Abidjan', code: 'ABJ' }, { name: 'Yamoussoukro', code: 'YAM' }, { name: 'Bouaké', code: 'BKE' },
        { name: 'Daloa', code: 'DLA' }, { name: 'San Pedro', code: 'SPY' }, { name: 'Korhogo', code: 'KHG' },
        { name: 'Man', code: 'MAN' }, { name: 'Divo', code: 'DIV' }, { name: 'Gagnoa', code: 'GNA' },
        { name: 'Abengourou', code: 'ABG' }, { name: 'Agboville', code: 'AGV' }, { name: 'Grand-Bassam', code: 'GBS' },
        { name: 'Anyama', code: 'ANY' }, { name: 'Dabou', code: 'DBO' }, { name: 'Dimbokro', code: 'DMB' },
        { name: 'Issia', code: 'ISS' }, { name: 'Soubré', code: 'SOB' }, { name: 'Adzopé', code: 'ADZ' },
        { name: 'Bongouanou', code: 'BGN' }, { name: 'Sassandra', code: 'SAS' }, { name: 'Bondoukou', code: 'BDK' }
      ],
      'ML': [
        { name: 'Bamako', code: 'BKO' }, { name: 'Sikasso', code: 'SKS' }, { name: 'Mopti', code: 'MOP' },
        { name: 'Koutiala', code: 'KTL' }, { name: 'Ségou', code: 'SEG' }, { name: 'Kayes', code: 'KYS' },
        { name: 'Gao', code: 'GAO' }, { name: 'Tombouctou', code: 'TOM' }, { name: 'Kidal', code: 'KDL' },
        { name: 'San', code: 'SAN' }, { name: 'Marka', code: 'MRK' }, { name: 'Djenné', code: 'DJE' },
        { name: 'Bandiagara', code: 'BND' }, { name: 'Kita', code: 'KIT' }, { name: 'Kolokani', code: 'KLK' },
        { name: 'Bafoulabé', code: 'BAF' }, { name: 'Nioro du Sahel', code: 'NIO' }, { name: 'Yanfolila', code: 'YAN' },
        { name: 'Bougouni', code: 'BOU' }, { name: 'Yorosso', code: 'YOR' }, { name: 'Douentza', code: 'DOU' }
      ],
      'BF': [
        { name: 'Ouagadougou', code: 'OUA' }, { name: 'Bobo-Dioulasso', code: 'BOB' }, { name: 'Koudougou', code: 'KDG' },
        { name: 'Ouahigouya', code: 'OHG' }, { name: 'Banfora', code: 'BAN' }, { name: 'Kaya', code: 'KAY' },
        { name: 'Tenkodogo', code: 'TKD' }, { name: 'Orodara', code: 'ORO' }, { name: 'Fada N\'Gourma', code: 'FAD' },
        { name: 'Gaoua', code: 'GAO' }, { name: 'Dori', code: 'DOR' }, { name: 'Bogandé', code: 'BOG' },
        { name: 'Diapaga', code: 'DIA' }, { name: 'Manga', code: 'MNG' }, { name: 'Réo', code: 'REO' },
        { name: 'Ziniaré', code: 'ZIN' }, { name: 'Gourcy', code: 'GOU' }, { name: 'Djibo', code: 'DJI' },
        { name: 'Tougan', code: 'TOU' }, { name: 'Nouna', code: 'NOU' }, { name: 'Boromo', code: 'BOR' }
      ],
      'GN': [
        { name: 'Conakry', code: 'CKY' }, { name: 'Nzérékoré', code: 'NZE' }, { name: 'Kankan', code: 'KNN' },
        { name: 'Kindia', code: 'KND' }, { name: 'Labé', code: 'LAB' }, { name: 'Mamou', code: 'MAM' },
        { name: 'Boké', code: 'BKE' }, { name: 'Faranah', code: 'FAR' }, { name: 'Kissidougou', code: 'KIS' },
        { name: 'Dabola', code: 'DAB' }, { name: 'Siguiri', code: 'SIG' }, { name: 'Kouroussa', code: 'KOU' },
        { name: 'Macenta', code: 'MAC' }, { name: 'Guéckédou', code: 'GUE' }, { name: 'Beyla', code: 'BEY' },
        { name: 'Yomou', code: 'YOM' }, { name: 'Dalaba', code: 'DAL' }, { name: 'Pita', code: 'PIT' },
        { name: 'Télimélé', code: 'TEL' }, { name: 'Gaoual', code: 'GAO' }, { name: 'Koundara', code: 'KND' }
      ],
      'SL': [
        { name: 'Freetown', code: 'FNA' }, { name: 'Bo', code: 'BOO' }, { name: 'Kenema', code: 'KEN' },
        { name: 'Koidu', code: 'KOI' }, { name: 'Makeni', code: 'MAK' }, { name: 'Lunsar', code: 'LUN' },
        { name: 'Port Loko', code: 'PLK' }, { name: 'Waterloo', code: 'WAT' }, { name: 'Kabala', code: 'KAB' },
        { name: 'Koindu', code: 'KON' }, { name: 'Magburaka', code: 'MAG' }, { name: 'Moyamba', code: 'MOY' },
        { name: 'Bonthe', code: 'BON' }, { name: 'Kambia', code: 'KAM' }, { name: 'Pujehun', code: 'PUJ' },
        { name: 'Segbwema', code: 'SEG' }, { name: 'Mile 91', code: 'MIL' }, { name: 'Yengema', code: 'YEN' },
        { name: 'Panguma', code: 'PAN' }, { name: 'Daru', code: 'DAR' }, { name: 'Mattru Jong', code: 'MAT' }
      ],
      'LR': [
        { name: 'Monrovia', code: 'ROB' }, { name: 'Gbarnga', code: 'GBA' }, { name: 'Kakata', code: 'KAK' },
        { name: 'Voinjama', code: 'VOI' }, { name: 'Harper', code: 'HAR' }, { name: 'Tubmanburg', code: 'TUB' },
        { name: 'Ganta', code: 'GAN' }, { name: 'Buchanan', code: 'BUC' }, { name: 'Zwedru', code: 'ZWE' },
        { name: 'New Kru Town', code: 'NKT' }, { name: 'Harbel', code: 'HBL' }, { name: 'Pleebo', code: 'PLE' },
        { name: 'Greenville', code: 'GRE' }, { name: 'Barclayville', code: 'BAR' }, { name: 'Robertsport', code: 'ROB' },
        { name: 'Sanniquellie', code: 'SAN' }, { name: 'Tappita', code: 'TAP' }, { name: 'Palala', code: 'PAL' },
        { name: 'Saclepea', code: 'SAC' }, { name: 'Bensonville', code: 'BEN' }, { name: 'Red Light', code: 'RED' }
      ],
      'NE': [
        { name: 'Niamey', code: 'NIM' }, { name: 'Zinder', code: 'ZIN' }, { name: 'Maradi', code: 'MFQ' },
        { name: 'Agadez', code: 'AJY' }, { name: 'Tahoua', code: 'THZ' }, { name: 'Dosso', code: 'DOS' },
        { name: 'Tillabéri', code: 'TIL' }, { name: 'Diffa', code: 'DIF' }, { name: 'Arlit', code: 'ARL' },
        { name: 'Tessaoua', code: 'TES' }, { name: 'Madaoua', code: 'MAD' }, { name: 'Dakoro', code: 'DAK' },
        { name: 'Tera', code: 'TER' }, { name: 'Birni N\'Konni', code: 'BIR' }, { name: 'Gaya', code: 'GAY' },
        { name: 'Say', code: 'SAY' }, { name: 'Dogondoutchi', code: 'DOG' }, { name: 'Mayahi', code: 'MAY' },
        { name: 'Mirriah', code: 'MIR' }, { name: 'Gouré', code: 'GOU' }, { name: 'Bilma', code: 'BIL' }
      ],
      'BJ': [
        { name: 'Cotonou', code: 'COO' }, { name: 'Porto-Novo', code: 'PNO' }, { name: 'Parakou', code: 'PKO' },
        { name: 'Djougou', code: 'DJO' }, { name: 'Bohicon', code: 'BOH' }, { name: 'Kandi', code: 'KAN' },
        { name: 'Lokossa', code: 'LOK' }, { name: 'Ouidah', code: 'OUI' }, { name: 'Abomey', code: 'ABO' },
        { name: 'Natitingou', code: 'NAT' }, { name: 'Nikki', code: 'NIK' }, { name: 'Savalou', code: 'SAV' },
        { name: 'Pobé', code: 'POB' }, { name: 'Kétou', code: 'KET' }, { name: 'Malanville', code: 'MAL' },
        { name: 'Ségbana', code: 'SEG' }, { name: 'Aplahoué', code: 'APL' }, { name: 'Dogbo', code: 'DOG' },
        { name: 'Come', code: 'COM' }, { name: 'Bassila', code: 'BAS' }, { name: 'Tanguiéta', code: 'TAN' }
      ],
      'TG': [
        { name: 'Lomé', code: 'LFW' }, { name: 'Sokodé', code: 'SOK' }, { name: 'Kara', code: 'KAR' },
        { name: 'Kpalimé', code: 'KPA' }, { name: 'Atakpamé', code: 'ATA' }, { name: 'Dapaong', code: 'DAP' },
        { name: 'Tsévié', code: 'TSE' }, { name: 'Aného', code: 'ANE' }, { name: 'Mango', code: 'MAN' },
        { name: 'Bassar', code: 'BAS' }, { name: 'Tchamba', code: 'TCH' }, { name: 'Vogan', code: 'VOG' },
        { name: 'Badou', code: 'BAD' }, { name: 'Niamtougou', code: 'NIA' }, { name: 'Glidji', code: 'GLI' },
        { name: 'Tabligbo', code: 'TAB' }, { name: 'Notse', code: 'NOT' }, { name: 'Blitta', code: 'BLI' },
        { name: 'Kandé', code: 'KAN' }, { name: 'Amlamé', code: 'AML' }, { name: 'Agou', code: 'AGO' }
      ],
      'ET': [
        { name: 'Addis Ababa', code: 'ADD' }, { name: 'Dire Dawa', code: 'DIR' }, { name: 'Mekelle', code: 'MQX' },
        { name: 'Gondar', code: 'GDQ' }, { name: 'Awasa', code: 'AWA' }, { name: 'Bahir Dar', code: 'BJR' },
        { name: 'Dessie', code: 'DSE' }, { name: 'Jimma', code: 'JIM' }, { name: 'Jijiga', code: 'JIJ' },
        { name: 'Shashamane', code: 'SHC' }, { name: 'Nekemte', code: 'NEK' }, { name: 'Bishoftu', code: 'BIS' },
        { name: 'Kombolcha', code: 'KMB' }, { name: 'Hosaena', code: 'HOS' }, { name: 'Harar', code: 'HRR' },
        { name: 'Dilla', code: 'DLL' }, { name: 'Sodo', code: 'SOD' }, { name: 'Arba Minch', code: 'AMH' },
        { name: 'Sebeta', code: 'SBT' }, { name: 'Adama', code: 'ADA' }, { name: 'Debre Markos', code: 'DBM' }
      ],
      'TZ': [
        { name: 'Dar es Salaam', code: 'DAR' }, { name: 'Mwanza', code: 'MWZ' }, { name: 'Arusha', code: 'ARK' },
        { name: 'Dodoma', code: 'DOD' }, { name: 'Mbeya', code: 'MBI' }, { name: 'Morogoro', code: 'MRG' },
        { name: 'Tanga', code: 'TGT' }, { name: 'Kahama', code: 'KHM' }, { name: 'Tabora', code: 'TBO' },
        { name: 'Zanzibar City', code: 'ZNZ' }, { name: 'Kigoma', code: 'TKQ' }, { name: 'Sumbawanga', code: 'SUT' },
        { name: 'Kasulu', code: 'KAS' }, { name: 'Musoma', code: 'MUZ' }, { name: 'Shinyanga', code: 'SHY' },
        { name: 'Iringa', code: 'IRI' }, { name: 'Singida', code: 'SGX' }, { name: 'Njombe', code: 'NJE' },
        { name: 'Bukoba', code: 'BKZ' }, { name: 'Mtwara', code: 'MYW' }, { name: 'Lindi', code: 'LDI' }
      ],
      'UG': [
        { name: 'Kampala', code: 'EBB' }, { name: 'Gulu', code: 'ULU' }, { name: 'Lira', code: 'LRA' },
        { name: 'Mbarara', code: 'MBQ' }, { name: 'Jinja', code: 'JIN' }, { name: 'Bwizibwera', code: 'BWI' },
        { name: 'Mbale', code: 'MBL' }, { name: 'Mukono', code: 'MUK' }, { name: 'Kasese', code: 'KSE' },
        { name: 'Masaka', code: 'MSK' }, { name: 'Entebbe', code: 'ENT' }, { name: 'Njeru', code: 'NJE' },
        { name: 'Kitgum', code: 'KTG' }, { name: 'Koboko', code: 'KBK' }, { name: 'Moroto', code: 'MRT' },
        { name: 'Yumbe', code: 'YMB' }, { name: 'Lugazi', code: 'LGZ' }, { name: 'Wobulenzi', code: 'WOB' },
        { name: 'Pader', code: 'PAD' }, { name: 'Iganga', code: 'IGA' }, { name: 'Soroti', code: 'SRT' }
      ],
      'RW': [
        { name: 'Kigali', code: 'KGL' }, { name: 'Butare', code: 'BUT' }, { name: 'Gitarama', code: 'GIT' },
        { name: 'Ruhengeri', code: 'RHG' }, { name: 'Gisenyi', code: 'GIS' }, { name: 'Byumba', code: 'BYU' },
        { name: 'Cyangugu', code: 'CYG' }, { name: 'Kibungo', code: 'KBG' }, { name: 'Kibuye', code: 'KBY' },
        { name: 'Gikongoro', code: 'GKR' }, { name: 'Umutara', code: 'UMT' }, { name: 'Kigoma', code: 'KIG' },
        { name: 'Nyanza', code: 'NYZ' }, { name: 'Musanze', code: 'MSZ' }, { name: 'Muhanga', code: 'MHG' },
        { name: 'Rubavu', code: 'RBV' }, { name: 'Huye', code: 'HUY' }, { name: 'Nyagatare', code: 'NYG' },
        { name: 'Kayonza', code: 'KYZ' }, { name: 'Rusizi', code: 'RSZ' }, { name: 'Burera', code: 'BUR' }
      ],
      'BI': [
        { name: 'Bujumbura', code: 'BJM' }, { name: 'Gitega', code: 'GTG' }, { name: 'Muyinga', code: 'MYG' },
        { name: 'Ngozi', code: 'NGZ' }, { name: 'Ruyigi', code: 'RYG' }, { name: 'Kayanza', code: 'KYZ' },
        { name: 'Muramvya', code: 'MRV' }, { name: 'Makamba', code: 'MKB' }, { name: 'Bururi', code: 'BRR' },
        { name: 'Cibitoke', code: 'CBT' }, { name: 'Karuzi', code: 'KRZ' }, { name: 'Bubanza', code: 'BBZ' },
        { name: 'Cankuzo', code: 'CNK' }, { name: 'Kirundo', code: 'KRD' }, { name: 'Rutana', code: 'RTN' },
        { name: 'Mwaro', code: 'MWR' }, { name: 'Rumonge', code: 'RMG' }, { name: 'Isale', code: 'ISL' }
      ],
      'DJ': [
        { name: 'Djibouti', code: 'JIB' }, { name: 'Ali Sabieh', code: 'AIS' }, { name: 'Dikhil', code: 'DIK' },
        { name: 'Tadjoura', code: 'TAD' }, { name: 'Obock', code: 'OBC' }, { name: 'Arta', code: 'ART' },
        { name: 'Holhol', code: 'HOL' }, { name: 'Yoboki', code: 'YOB' }, { name: 'Galafi', code: 'GAL' },
        { name: 'Loyada', code: 'LOY' }, { name: 'Randa', code: 'RAN' }, { name: 'Balho', code: 'BAL' }
      ],
      'ER': [
        { name: 'Asmara', code: 'ASM' }, { name: 'Assab', code: 'ASB' }, { name: 'Massawa', code: 'MSW' },
        { name: 'Keren', code: 'KER' }, { name: 'Mendefera', code: 'MDF' }, { name: 'Barentu', code: 'BAR' },
        { name: 'Dekemhare', code: 'DEK' }, { name: 'Ak\'ordat', code: 'AKO' }, { name: 'Adi Keyh', code: 'ADK' },
        { name: 'Adi Quala', code: 'ADQ' }, { name: 'Senafe', code: 'SEN' }, { name: 'Tessaney', code: 'TES' },
        { name: 'Afabet', code: 'AFB' }, { name: 'Nakfa', code: 'NAK' }, { name: 'Ghinda', code: 'GHI' }
      ],
      'SO': [
        { name: 'Mogadishu', code: 'MGQ' }, { name: 'Hargeisa', code: 'HGA' }, { name: 'Bosaso', code: 'BSA' },
        { name: 'Kismayo', code: 'KMU' }, { name: 'Merca', code: 'MRC' }, { name: 'Berbera', code: 'BBO' },
        { name: 'Baidoa', code: 'BIB' }, { name: 'Galkayo', code: 'GLK' }, { name: 'Garowe', code: 'GGR' },
        { name: 'Burao', code: 'BUO' }, { name: 'Borama', code: 'BRM' }, { name: 'Las Anod', code: 'LAS' },
        { name: 'Erigavo', code: 'ERG' }, { name: 'Qardho', code: 'QRD' }, { name: 'Luuq', code: 'LUQ' },
        { name: 'Jowhar', code: 'JOW' }, { name: 'Beledweyne', code: 'BLD' }, { name: 'Dhusamareb', code: 'DHU' },
        { name: 'Hudur', code: 'HUD' }, { name: 'Wajid', code: 'WAJ' }, { name: 'Bardera', code: 'BSY' }
      ],
      'SD': [
        { name: 'Khartoum', code: 'KRT' }, { name: 'Omdurman', code: 'OMD' }, { name: 'Khartoum North', code: 'KTN' },
        { name: 'Port Sudan', code: 'PZU' }, { name: 'Kassala', code: 'KSL' }, { name: 'El Obeid', code: 'EBD' },
        { name: 'Nyala', code: 'UYL' }, { name: 'Wad Medani', code: 'WDM' }, { name: 'El Fasher', code: 'ELF' },
        { name: 'El Gadarif', code: 'ELG' }, { name: 'Atbara', code: 'ATB' }, { name: 'Dongola', code: 'DOG' },
        { name: 'Madani', code: 'MDN' }, { name: 'Sennar', code: 'SNR' }, { name: 'Rabak', code: 'RBK' },
        { name: 'Geneina', code: 'EGN' }, { name: 'Damazin', code: 'DMZ' }, { name: 'Kadugli', code: 'KDG' },
        { name: 'El Roseires', code: 'ELR' }, { name: 'Zalingei', code: 'ZLG' }, { name: 'Kosti', code: 'KOT' }
      ],
      'CD': [
        { name: 'Kinshasa', code: 'FIH' }, { name: 'Lubumbashi', code: 'FBM' }, { name: 'Mbuji-Mayi', code: 'MJM' },
        { name: 'Kananga', code: 'KGA' }, { name: 'Kisangani', code: 'FKI' }, { name: 'Bukavu', code: 'BKY' },
        { name: 'Tshikapa', code: 'TSH' }, { name: 'Kolwezi', code: 'KWZ' }, { name: 'Likasi', code: 'LIK' },
        { name: 'Goma', code: 'GOM' }, { name: 'Uvira', code: 'UVR' }, { name: 'Bunia', code: 'BUX' },
        { name: 'Mbandaka', code: 'MDK' }, { name: 'Matadi', code: 'MAT' }, { name: 'Kabinda', code: 'KAB' },
        { name: 'Mwene-Ditu', code: 'MWK' }, { name: 'Kikwit', code: 'KKW' }, { name: 'Isiro', code: 'IRP' },
        { name: 'Bandundu', code: 'BAN' }, { name: 'Gemena', code: 'GMA' }, { name: 'Ilebo', code: 'PFR' }
      ],
      'CM': [
        { name: 'Douala', code: 'DLA' }, { name: 'Yaoundé', code: 'NSI' }, { name: 'Garoua', code: 'GOU' },
        { name: 'Kousseri', code: 'KOS' }, { name: 'Bamenda', code: 'BPC' }, { name: 'Maroua', code: 'MVR' },
        { name: 'Nkongsamba', code: 'NKS' }, { name: 'Bafoussam', code: 'BFX' }, { name: 'Kumbo', code: 'KMB' },
        { name: 'Okola', code: 'OKL' }, { name: 'Kribi', code: 'KBI' }, { name: 'Tiko', code: 'TKC' },
        { name: 'Limbé', code: 'LMB' }, { name: 'Edéa', code: 'EDE' }, { name: 'Loum', code: 'LOU' },
        { name: 'Kumba', code: 'KBA' }, { name: 'Foumban', code: 'FBN' }, { name: 'Mbouda', code: 'MBD' },
        { name: 'Dschang', code: 'DSC' }, { name: 'Wum', code: 'WUM' }, { name: 'Ebolowa', code: 'EBW' }
      ],
      'CF': [
        { name: 'Bangui', code: 'BGF' }, { name: 'Bimbo', code: 'BIM' }, { name: 'Berbérati', code: 'BBT' },
        { name: 'Carnot', code: 'CRN' }, { name: 'Bambari', code: 'BBR' }, { name: 'Bouar', code: 'BOU' },
        { name: 'Bossangoa', code: 'BSG' }, { name: 'Bria', code: 'BRI' }, { name: 'Bangassou', code: 'BGS' },
        { name: 'Nola', code: 'NOL' }, { name: 'Mbaiki', code: 'MBK' }, { name: 'Kaga-Bandoro', code: 'KGB' },
        { name: 'Obo', code: 'OBO' }, { name: 'Sibut', code: 'SBT' }, { name: 'Zemio', code: 'ZEM' },
        { name: 'Rafai', code: 'RAF' }, { name: 'Bozoum', code: 'BZM' }, { name: 'Batangafo', code: 'BTG' },
        { name: 'Ndélé', code: 'NDE' }, { name: 'Paoua', code: 'PAO' }, { name: 'Gamboula', code: 'GMB' }
      ],
      'TD': [
        { name: 'N\'Djamena', code: 'NDJ' }, { name: 'Moundou', code: 'MOU' }, { name: 'Sarh', code: 'SRH' },
        { name: 'Abéché', code: 'AEH' }, { name: 'Kélo', code: 'KEL' }, { name: 'Koumra', code: 'KMR' },
        { name: 'Pala', code: 'PAL' }, { name: 'Am Timan', code: 'AMT' }, { name: 'Bongor', code: 'BON' },
        { name: 'Mongo', code: 'MON' }, { name: 'Doba', code: 'DOB' }, { name: 'Ati', code: 'ATI' },
        { name: 'Laï', code: 'LAI' }, { name: 'Fianga', code: 'FIA' }, { name: 'Massenya', code: 'MAS' },
        { name: 'Moïssala', code: 'MOI' }, { name: 'Goz Beida', code: 'GOZ' }, { name: 'Mao', code: 'MAO' },
        { name: 'Bokoro', code: 'BOK' }, { name: 'Biltine', code: 'BIL' }, { name: 'Beinamar', code: 'BEI' }
      ],
      'CG': [
        { name: 'Brazzaville', code: 'BZV' }, { name: 'Pointe-Noire', code: 'PNR' }, { name: 'Dolisie', code: 'NKY' },
        { name: 'Nkayi', code: 'NKY' }, { name: 'Mossendjo', code: 'MSX' }, { name: 'Impfondo', code: 'IMP' },
        { name: 'Ouesso', code: 'OUE' }, { name: 'Madingou', code: 'MDG' }, { name: 'Owando', code: 'FTX' },
        { name: 'Sibiti', code: 'SIB' }, { name: 'Gamboma', code: 'GAM' }, { name: 'Divénié', code: 'DIV' },
        { name: 'Makoua', code: 'MKJ' }, { name: 'Djambala', code: 'DJA' }, { name: 'Ewo', code: 'EWO' },
        { name: 'Loandjili', code: 'LOA' }, { name: 'Kinkala', code: 'KIN' }, { name: 'Boundji', code: 'BDJ' },
        { name: 'Mokeko', code: 'MOK' }, { name: 'Boko', code: 'BOK' }, { name: 'Zanaga', code: 'ZAN' }
      ],
      'GQ': [
        { name: 'Malabo', code: 'SSG' }, { name: 'Bata', code: 'BSG' }, { name: 'Ebebiyín', code: 'EBE' },
        { name: 'Aconibe', code: 'ACO' }, { name: 'Añisoc', code: 'ANI' }, { name: 'Luba', code: 'LUB' },
        { name: 'Evinayong', code: 'EVI' }, { name: 'Mongomo', code: 'MON' }, { name: 'Mengomeyén', code: 'MEN' },
        { name: 'Acurenam', code: 'ACU' }, { name: 'Cogo', code: 'COG' }, { name: 'Micomeseng', code: 'MIC' },
        { name: 'Nsoc', code: 'NSO' }, { name: 'Ayene', code: 'AYE' }, { name: 'Machinda', code: 'MAC' },
        { name: 'Niefang', code: 'NIE' }, { name: 'Nsok', code: 'NSK' }, { name: 'Corisco', code: 'COR' }
      ],
      'GA': [
        { name: 'Libreville', code: 'LBV' }, { name: 'Port-Gentil', code: 'POG' }, { name: 'Franceville', code: 'MVB' },
        { name: 'Oyem', code: 'OYE' }, { name: 'Moanda', code: 'MFF' }, { name: 'Mouila', code: 'MJL' },
        { name: 'Lambaréné', code: 'LBR' }, { name: 'Tchibanga', code: 'TCH' }, { name: 'Koulamoutou', code: 'KOU' },
        { name: 'Makokou', code: 'MKU' }, { name: 'Bitam', code: 'BTB' }, { name: 'Gamba', code: 'GAX' },
        { name: 'Mayumba', code: 'MYB' }, { name: 'Mitzic', code: 'MIT' }, { name: 'Ndjolé', code: 'NDJ' },
        { name: 'Booué', code: 'BOO' }, { name: 'Lastoursville', code: 'LAS' }, { name: 'Fougamou', code: 'FOU' },
        { name: 'Okondja', code: 'OKO' }, { name: 'Ndendé', code: 'NDE' }, { name: 'Mékambo', code: 'MEK' }
      ],
      'AO': [
        { name: 'Luanda', code: 'LAD' }, { name: 'Huambo', code: 'NOV' }, { name: 'Lobito', code: 'LUO' },
        { name: 'Benguela', code: 'BUG' }, { name: 'Kuito', code: 'SVP' }, { name: 'Lubango', code: 'SDD' },
        { name: 'Malanje', code: 'MEG' }, { name: 'Namibe', code: 'MSZ' }, { name: 'Soyo', code: 'SZA' },
        { name: 'Cabinda', code: 'CAB' }, { name: 'Uíge', code: 'UGE' }, { name: 'Saurimo', code: 'VHC' },
        { name: 'Sumbe', code: 'NDD' }, { name: 'Menongue', code: 'SPP' }, { name: 'Mbanza-Kongo', code: 'SSY' },
        { name: 'Luena', code: 'LUE' }, { name: 'Caxito', code: 'CXT' }, { name: 'Caala', code: 'CAA' },
        { name: 'Ondjiva', code: 'VPE' }, { name: 'Dondo', code: 'DRC' }, { name: 'Ndalatando', code: 'NDD' }
      ],
      'ZM': [
        { name: 'Lusaka', code: 'LUN' }, { name: 'Kitwe', code: 'KIW' }, { name: 'Ndola', code: 'NLA' },
        { name: 'Kabwe', code: 'KAB' }, { name: 'Chingola', code: 'CGJ' }, { name: 'Mufulira', code: 'MUF' },
        { name: 'Livingstone', code: 'LVI' }, { name: 'Luanshya', code: 'LNS' }, { name: 'Kasama', code: 'KAM' },
        { name: 'Chipata', code: 'CIP' }, { name: 'Mazabuka', code: 'MZU' }, { name: 'Kafue', code: 'KAF' },
        { name: 'Choma', code: 'CHM' }, { name: 'Mongu', code: 'MNR' }, { name: 'Solwezi', code: 'SLI' },
        { name: 'Mansa', code: 'MNS' }, { name: 'Kapiri Mposhi', code: 'KMP' }, { name: 'Kalulushi', code: 'KLS' },
        { name: 'Chililabombwe', code: 'CLB' }, { name: 'Petauke', code: 'PTK' }, { name: 'Nchelenge', code: 'NCH' }
      ],
      'ZW': [
        { name: 'Harare', code: 'HRE' }, { name: 'Bulawayo', code: 'BUQ' }, { name: 'Chitungwiza', code: 'CHT' },
        { name: 'Mutare', code: 'UTA' }, { name: 'Gweru', code: 'GWE' }, { name: 'Kwekwe', code: 'KWE' },
        { name: 'Kadoma', code: 'KAD' }, { name: 'Masvingo', code: 'MVZ' }, { name: 'Chinhoyi', code: 'CHI' },
        { name: 'Norton', code: 'NOR' }, { name: 'Marondera', code: 'MAR' }, { name: 'Ruwa', code: 'RUW' },
        { name: 'Chegutu', code: 'CHE' }, { name: 'Zvishavane', code: 'ZVI' }, { name: 'Bindura', code: 'BIN' },
        { name: 'Beitbridge', code: 'BEI' }, { name: 'Redcliff', code: 'RED' }, { name: 'Victoria Falls', code: 'VFA' },
        { name: 'Hwange', code: 'HWN' }, { name: 'Chiredzi', code: 'CHR' }, { name: 'Kariba', code: 'KAR' }
      ],
      'BW': [
        { name: 'Gaborone', code: 'GBE' }, { name: 'Francistown', code: 'FRW' }, { name: 'Molepolole', code: 'MOL' },
        { name: 'Maun', code: 'MUB' }, { name: 'Serowe', code: 'SER' }, { name: 'Selibe Phikwe', code: 'PKW' },
        { name: 'Kanye', code: 'KAN' }, { name: 'Mochudi', code: 'MOC' }, { name: 'Mahalapye', code: 'MHP' },
        { name: 'Palapye', code: 'PAL' }, { name: 'Tlokweng', code: 'TLO' }, { name: 'Lobatse', code: 'LOB' },
        { name: 'Ramotswa', code: 'RAM' }, { name: 'Letlhakane', code: 'LET' }, { name: 'Tonota', code: 'TON' },
        { name: 'Moshupa', code: 'MOS' }, { name: 'Thamaga', code: 'THA' }, { name: 'Bobonong', code: 'BOB' },
        { name: 'Tutume', code: 'TUT' }, { name: 'Gweta', code: 'GWE' }, { name: 'Kasane', code: 'KAS' }
      ],
      'NA': [
        { name: 'Windhoek', code: 'WDH' }, { name: 'Rundu', code: 'NDU' }, { name: 'Walvis Bay', code: 'WVB' },
        { name: 'Swakopmund', code: 'SWP' }, { name: 'Oshakati', code: 'OSH' }, { name: 'Rehoboth', code: 'REB' },
        { name: 'Katima Mulilo', code: 'MPA' }, { name: 'Otjiwarongo', code: 'OTJ' }, { name: 'Okahandja', code: 'OKA' },
        { name: 'Ondangwa', code: 'OND' }, { name: 'Oshikango', code: 'OSK' }, { name: 'Keetmanshoop', code: 'KMP' },
        { name: 'Tsumeb', code: 'TSB' }, { name: 'Grootfontein', code: 'GFI' }, { name: 'Mariental', code: 'MRI' },
        { name: 'Gobabis', code: 'GOG' }, { name: 'Henties Bay', code: 'HTB' }, { name: 'Outapi', code: 'OUT' },
        { name: 'Lüderitz', code: 'LUD' }, { name: 'Aranos', code: 'ARA' }, { name: 'Usakos', code: 'USA' }
      ],
      'LS': [
        { name: 'Maseru', code: 'MSU' }, { name: 'Teyateyaneng', code: 'TYT' }, { name: 'Leribe', code: 'LRB' },
        { name: 'Mafeteng', code: 'MFT' }, { name: 'Hlotse', code: 'HLT' }, { name: 'Mohale\'s Hoek', code: 'MHH' },
        { name: 'Maputsoe', code: 'MPT' }, { name: 'Qacha\'s Nek', code: 'QCH' }, { name: 'Quthing', code: 'QUT' },
        { name: 'Butha-Buthe', code: 'BTB' }, { name: 'Mokhotlong', code: 'MKH' }, { name: 'Thaba-Tseka', code: 'TBT' },
        { name: 'Peka', code: 'PEK' }, { name: 'Roma', code: 'ROM' }, { name: 'Morija', code: 'MOR' },
        { name: 'Kolonyama', code: 'KOL' }, { name: 'Mapoteng', code: 'MPG' }, { name: 'Semonkong', code: 'SMK' }
      ],
      'SZ': [
        { name: 'Mbabane', code: 'MTS' }, { name: 'Manzini', code: 'MAN' }, { name: 'Big Bend', code: 'BGB' },
        { name: 'Malkerns', code: 'MAL' }, { name: 'Nhlangano', code: 'NHL' }, { name: 'Siteki', code: 'SIT' },
        { name: 'Piggs Peak', code: 'PGS' }, { name: 'Lobamba', code: 'LOB' }, { name: 'Hluti', code: 'HLU' },
        { name: 'Lavumisa', code: 'LAV' }, { name: 'Mankayane', code: 'MNK' }, { name: 'Hlatikulu', code: 'HLA' },
        { name: 'Nsoko', code: 'NSO' }, { name: 'Kubuta', code: 'KUB' }, { name: 'Bulembu', code: 'BUL' },
        { name: 'Ngwenya', code: 'NGW' }, { name: 'Matsapha', code: 'MAT' }, { name: 'Simunye', code: 'SIM' }
      ],
      'MW': [
        { name: 'Lilongwe', code: 'LLW' }, { name: 'Blantyre', code: 'BLZ' }, { name: 'Mzuzu', code: 'ZZU' },
        { name: 'Zomba', code: 'ZOM' }, { name: 'Kasungu', code: 'KSU' }, { name: 'Mangochi', code: 'MAI' },
        { name: 'Karonga', code: 'KGJ' }, { name: 'Salima', code: 'SLM' }, { name: 'Liwonde', code: 'LIW' },
        { name: 'Nkhotakota', code: 'NKH' }, { name: 'Chiradzulu', code: 'CHI' }, { name: 'Thyolo', code: 'THY' },
        { name: 'Dedza', code: 'DED' }, { name: 'Ntcheu', code: 'NTC' }, { name: 'Dowa', code: 'DOW' },
        { name: 'Rumphi', code: 'RMP' }, { name: 'Chitipa', code: 'CTP' }, { name: 'Nsanje', code: 'NSJ' },
        { name: 'Balaka', code: 'BAL' }, { name: 'Luchenza', code: 'LUC' }, { name: 'Monkey Bay', code: 'MNK' }
      ],
      'MZ': [
        { name: 'Maputo', code: 'MPM' }, { name: 'Matola', code: 'MTL' }, { name: 'Beira', code: 'BEW' },
        { name: 'Nampula', code: 'APL' }, { name: 'Chimoio', code: 'VPY' }, { name: 'Nacala', code: 'MNC' },
        { name: 'Quelimane', code: 'UEL' }, { name: 'Tete', code: 'TET' }, { name: 'Xai-Xai', code: 'VJB' },
        { name: 'Lichinga', code: 'VXC' }, { name: 'Pemba', code: 'POL' }, { name: 'Inhambane', code: 'INH' },
        { name: 'Maxixe', code: 'MXI' }, { name: 'Angoche', code: 'ANO' }, { name: 'Montepuez', code: 'MPZ' },
        { name: 'Cuamba', code: 'FXO' }, { name: 'Gurué', code: 'GUE' }, { name: 'Dondo', code: 'DON' },
        { name: 'Chibuto', code: 'CHB' }, { name: 'Chokwé', code: 'TGS' }, { name: 'Manhiça', code: 'MAN' }
      ],
      'MG': [
        { name: 'Antananarivo', code: 'TNR' }, { name: 'Toamasina', code: 'TMM' }, { name: 'Antsirabe', code: 'ATJ' },
        { name: 'Fianarantsoa', code: 'FTU' }, { name: 'Mahajanga', code: 'MJN' }, { name: 'Toliara', code: 'TLE' },
        { name: 'Antsiranana', code: 'DIE' }, { name: 'Ambovombe', code: 'AMB' }, { name: 'Morondava', code: 'MOQ' },
        { name: 'Manakara', code: 'WVK' }, { name: 'Sambava', code: 'SVB' }, { name: 'Nosy Be', code: 'NOS' },
        { name: 'Farafangana', code: 'RVA' }, { name: 'Vohémar', code: 'VOH' }, { name: 'Ambatondrazaka', code: 'AMN' },
        { name: 'Maintirano', code: 'MXT' }, { name: 'Mananara', code: 'WMR' }, { name: 'Ihosy', code: 'IHO' },
        { name: 'Tsiroanomandidy', code: 'WTS' }, { name: 'Antalaha', code: 'ANM' }, { name: 'Vangaindrano', code: 'VVB' }
      ],
      'MU': [
        { name: 'Port Louis', code: 'MRU' }, { name: 'Beau Bassin-Rose Hill', code: 'BBR' }, { name: 'Vacoas-Phoenix', code: 'VAC' },
        { name: 'Curepipe', code: 'CUR' }, { name: 'Quatre Bornes', code: 'QTB' }, { name: 'Triolet', code: 'TRI' },
        { name: 'Goodlands', code: 'GOO' }, { name: 'Centre de Flacq', code: 'CDF' }, { name: 'Mahébourg', code: 'MAH' },
        { name: 'Saint Pierre', code: 'STP' }, { name: 'Bambous', code: 'BAM' }, { name: 'Surinam', code: 'SUR' },
        { name: 'Tamarin', code: 'TAM' }, { name: 'Arsenal', code: 'ARS' }, { name: 'Pamplemousses', code: 'PAM' },
        { name: 'Grand Baie', code: 'GRB' }, { name: 'Rivière du Rempart', code: 'RDR' }, { name: 'Souillac', code: 'SOU' }
      ]
    };

    const cities = citiesByCountry[countryCode] || [];
    
    // If no cities found for the country, return a helpful message in the logs
    if (cities.length === 0) {
      console.log(`No cities data available for country code: ${countryCode}`);
    }
    
    return cities;
  }

  async createLocation(orgId: string, type: string, name: string, code?: string, parentId?: string) {
    try {
      const result = await pool.query(`
        INSERT INTO locations (organization_id, type, name, code, parent_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, name, type, code, parent_id
      `, [orgId, type, name.trim(), code || null, parentId || null]);

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        code: result.rows[0].code,
        parentId: result.rows[0].parent_id,
        memberCount: 0
      };
    } catch (error) {
      console.error('Error creating location:', error);
      throw new Error('Failed to create location');
    }
  }

  async updateLocation(id: string, orgId: string, name: string, code?: string) {
    try {
      const result = await pool.query(`
        UPDATE locations 
        SET name = $1, code = $2, updated_at = NOW()
        WHERE id = $3 AND organization_id = $4
        RETURNING id, name, type, code, parent_id
      `, [name.trim(), code || null, id, orgId]);

      if (result.rows.length === 0) {
        throw new Error('Location not found or access denied');
      }

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        code: result.rows[0].code,
        parentId: result.rows[0].parent_id
      };
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  async deleteLocation(id: string, orgId: string) {
    try {
      // Check if location has employees assigned
      const employeeCheck = await pool.query(`
        SELECT COUNT(*) as employee_count
        FROM users u
        INNER JOIN org_membership om ON u.id = om.user_id
        WHERE om.org_unit_id = $1 AND u.organization_id = $2
      `, [id, orgId]);

      const employeeCount = parseInt(employeeCheck.rows[0].employee_count, 10);
      if (employeeCount > 0) {
        throw new Error(`Cannot delete location with ${employeeCount} employees. Please reassign employees first.`);
      }

      // Check if location has child locations
      const childCheck = await pool.query(`
        SELECT COUNT(*) as child_count
        FROM locations
        WHERE parent_id = $1 AND organization_id = $2
      `, [id, orgId]);

      const childCount = parseInt(childCheck.rows[0].child_count, 10);
      if (childCount > 0) {
        throw new Error(`Cannot delete location with ${childCount} child locations. Please remove child locations first.`);
      }

      const result = await pool.query(`
        DELETE FROM locations 
        WHERE id = $1 AND organization_id = $2
        RETURNING id
      `, [id, orgId]);

      if (result.rows.length === 0) {
        throw new Error('Location not found or access denied');
      }

      return { success: true, id: id };
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }
}