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
    // Return cities for specific countries
    const citiesByCountry: Record<string, Array<{ name: string; code: string }>> = {
      'US': [
        { name: 'New York', code: 'NYC' },
        { name: 'Los Angeles', code: 'LAX' },
        { name: 'Chicago', code: 'CHI' },
        { name: 'Houston', code: 'HOU' },
        { name: 'Phoenix', code: 'PHX' },
        { name: 'Philadelphia', code: 'PHL' },
        { name: 'San Antonio', code: 'SAT' },
        { name: 'San Diego', code: 'SAN' },
        { name: 'Dallas', code: 'DFW' },
        { name: 'San Jose', code: 'SJC' },
        { name: 'Austin', code: 'AUS' },
        { name: 'Jacksonville', code: 'JAX' },
        { name: 'San Francisco', code: 'SFO' },
        { name: 'Columbus', code: 'CMH' },
        { name: 'Charlotte', code: 'CLT' },
        { name: 'Fort Worth', code: 'FTW' },
        { name: 'Indianapolis', code: 'IND' },
        { name: 'Seattle', code: 'SEA' },
        { name: 'Denver', code: 'DEN' },
        { name: 'Boston', code: 'BOS' }
      ],
      'GB': [
        { name: 'London', code: 'LON' },
        { name: 'Birmingham', code: 'BHX' },
        { name: 'Manchester', code: 'MAN' },
        { name: 'Glasgow', code: 'GLA' },
        { name: 'Liverpool', code: 'LPL' },
        { name: 'Leeds', code: 'LDS' },
        { name: 'Sheffield', code: 'SHF' },
        { name: 'Edinburgh', code: 'EDI' },
        { name: 'Bristol', code: 'BRS' },
        { name: 'Leicester', code: 'LEI' }
      ],
      'DE': [
        { name: 'Berlin', code: 'BER' },
        { name: 'Hamburg', code: 'HAM' },
        { name: 'Munich', code: 'MUC' },
        { name: 'Cologne', code: 'CGN' },
        { name: 'Frankfurt', code: 'FRA' },
        { name: 'Stuttgart', code: 'STR' },
        { name: 'Düsseldorf', code: 'DUS' },
        { name: 'Dortmund', code: 'DTM' },
        { name: 'Essen', code: 'ESS' },
        { name: 'Leipzig', code: 'LEJ' }
      ],
      'FR': [
        { name: 'Paris', code: 'PAR' },
        { name: 'Marseille', code: 'MRS' },
        { name: 'Lyon', code: 'LYS' },
        { name: 'Toulouse', code: 'TLS' },
        { name: 'Nice', code: 'NCE' },
        { name: 'Nantes', code: 'NTE' },
        { name: 'Strasbourg', code: 'SXB' },
        { name: 'Montpellier', code: 'MPL' },
        { name: 'Bordeaux', code: 'BOD' },
        { name: 'Lille', code: 'LIL' }
      ],
      'AE': [
        { name: 'Dubai', code: 'DXB' },
        { name: 'Abu Dhabi', code: 'AUH' },
        { name: 'Sharjah', code: 'SHJ' },
        { name: 'Al Ain', code: 'AAN' },
        { name: 'Ajman', code: 'AJM' },
        { name: 'Ras Al Khaimah', code: 'RKT' },
        { name: 'Fujairah', code: 'FJR' }
      ],
      'SG': [
        { name: 'Singapore', code: 'SIN' }
      ],
      'AU': [
        { name: 'Sydney', code: 'SYD' },
        { name: 'Melbourne', code: 'MEL' },
        { name: 'Brisbane', code: 'BNE' },
        { name: 'Perth', code: 'PER' },
        { name: 'Adelaide', code: 'ADL' },
        { name: 'Gold Coast', code: 'OOL' },
        { name: 'Newcastle', code: 'NTL' },
        { name: 'Canberra', code: 'CBR' },
        { name: 'Sunshine Coast', code: 'MCY' },
        { name: 'Wollongong', code: 'WOL' }
      ]
    };

    return citiesByCountry[countryCode] || [];
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