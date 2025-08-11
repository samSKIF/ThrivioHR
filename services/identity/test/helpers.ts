import { client } from './jest.setup.db';
import { randomUUID } from 'crypto';

type Col = { name: string; isNullable: boolean; hasDefault: boolean; dataType: string };

// Resolve or create a real organization id in the current schema
export async function ensureOrganizationId(input?: string | { id?: string } | { orgId?: string }): Promise<string> {
  // 1) Extract candidate id if provided
  let candidate: string | undefined;
  if (typeof input === 'string') candidate = input;
  else if (input && typeof input === 'object') candidate = (input as any).id ?? (input as any).orgId;

  // 2) If candidate provided, verify it exists; otherwise create one
  if (candidate) {
    const check = await client.query(`SELECT 1 FROM organizations WHERE id = $1 LIMIT 1`, [candidate]);
    if (check.rowCount === 1) return candidate;
  }
  // Create a new org (reuse your existing createOrganization implementation)
  const createdId = await createOrganization();
  return createdId;
}

async function getColumns(table: string): Promise<Col[]> {
  const r = await client.query(
    `SELECT column_name AS name,
            is_nullable = 'YES' AS "isNullable",
            column_default IS NOT NULL AS "hasDefault",
            data_type AS "dataType"
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
      ORDER BY ordinal_position`,
    [table]
  );
  return r.rows;
}

function pick<T extends object>(obj: T, keys: string[]) {
  const out: any = {};
  for (const k of keys) if (k in obj && obj[k as keyof T] !== undefined) out[k] = (obj as any)[k];
  return out;
}

function defaultFor(col: Col): any {
  switch (col.dataType) {
    case 'boolean': return false;
    case 'integer': return 0;
    case 'numeric': return 0;
    case 'timestamp with time zone':
    case 'timestamp without time zone': return new Date();
    case 'json': case 'jsonb': return {};
    default: return 'x'; // text-like fallback; emails handled explicitly
  }
}

async function dynamicInsert(table: string, provided: Record<string, any>) {
  const cols = await getColumns(table);
  // Required = NOT NULL and no default and not the PK id
  const required = cols.filter(c => !c.isNullable && !c.hasDefault && c.name !== 'id').map(c => c.name);
  // Only include provided keys that exist
  const allowed = cols.map(c => c.name);
  const base = pick(provided, allowed);
  // Fill any missing required fields with safe defaults
  for (const c of cols) {
    if (required.includes(c.name) && base[c.name] === undefined) {
      base[c.name] = defaultFor(c);
    }
  }
  const keys = Object.keys(base);
  if (keys.length === 0) throw new Error(`No columns to insert for ${table}`);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const vals = keys.map(k => base[k]);
  const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`;
  const res = await client.query(sql, vals);
  return res.rows[0].id as string;
}

// Utilities
function uniqueEmail(prefix='user'){ return `${prefix}+${Date.now()}_${Math.random().toString(36).slice(2,6)}@example.com`; }

// Schema-aware implementation (internal)
async function createOrganization(name?: string, region?: string) {
  const payload: Record<string, any> = {
    name: name ?? `Org ${Math.random().toString(36).slice(2,8)}`,
    region: region ?? 'eu-west-1',
  };
  return await dynamicInsert('organizations', payload);
}

// Public helpers (auto-prereqs in correct order)
export async function createOrg(name?: string) {
  const id = await createOrganization(name);
  return { id };
}

export async function ensureCompanyOrgUnit(orgId: string) {
  const r0 = await client.query(
    `SELECT id FROM org_units WHERE organization_id=$1 AND type='company' LIMIT 1`, [orgId]
  );
  if (r0.rowCount > 0) return r0.rows[0].id as string;
  return await dynamicInsert('org_units', {
    organization_id: orgId,
    type: 'company',
    name: 'Company',
    parent_id: null
  });
}

export async function createDepartment(orgId: string, name='Dept') {
  const companyId = await ensureCompanyOrgUnit(orgId);
  return await dynamicInsert('org_units', {
    organization_id: orgId,
    type: 'department',
    name,
    parent_id: companyId
  });
}

export async function createTeam(orgId: string, name='Team', parentDeptId?: string) {
  const deptId = parentDeptId ?? await createDepartment(orgId, 'Dept');
  return await dynamicInsert('org_units', {
    organization_id: orgId,
    type: 'team',
    name,
    parent_id: deptId
  });
}

export async function createUser(arg1?: any, arg2?: any) {
  // Legacy shapes: (orgId, email) OR ({ id/orgId/email })
  let orgRef = arg1;
  let email: string | undefined = typeof arg2 === 'string' ? arg2 : undefined;

  // Normalize orgId (string or object) → ensure exists in current schema
  const orgId = await ensureOrganizationId(orgRef);

  // If email not provided, try arg1.email; else synthesize
  if (!email && arg1 && typeof arg1 === 'object' && typeof arg1.email === 'string') {
    email = arg1.email;
  }
  const finalEmail = (email ?? `user+${Date.now()}@example.com`).toLowerCase();

  const userId = await dynamicInsert('users', {
    organization_id: orgId,
    email: finalEmail,
    given_name: 'Test',
    family_name: 'User',
    locale: 'en',
    status: 'active'
  });

  // ALWAYS return object, even in legacy mode
  return { userId, organizationId: orgId, orgId, email: finalEmail };
}

export async function createIdentity(userId?: string, provider: 'local'|'oidc'|'saml'|'csv' = 'local', subject?: string) {
  const u = userId ? { userId } : await createUser();
  const id = await dynamicInsert('identities', {
    user_id: u.userId ?? u,
    provider,
    provider_subject: subject ?? randomUUID()
  });
  return { id, userId: u.userId ?? u };
}

export async function createSession(userRef?: any, minutes = 60) {
  let userId: string | undefined;
  if (typeof userRef === 'string') userId = userRef;
  else if (userRef && typeof userRef === 'object' && typeof userRef.userId === 'string') userId = userRef.userId;
  else userId = (await createUser()).userId;

  const now = new Date();
  const exp = new Date(now.getTime() + minutes * 60_000);

  const id = await dynamicInsert('sessions', {
    user_id: userId,
    issued_at: now,
    expires_at: exp,
    ip: '127.0.0.1',
    user_agent: 'jest'
  });
  return { sessionId: id, userId };
}

export async function createMembership(userId?: string) {
  const u = userId ? { userId } : await createUser();
  const uid = u.userId ?? u;
  const orgRow = await client.query(`SELECT organization_id FROM users WHERE id=$1`, [uid]);
  const orgId: string = orgRow.rows[0].organization_id;
  const teamId = await createTeam(orgId, 'Team');
  const id = await dynamicInsert('org_membership', { user_id: uid, org_unit_id: teamId });
  return { id, userId: uid, orgId, teamId };
}

export async function createEmploymentEvent(
  userRef?: any,
  event: 'hire'|'transfer'|'manager_change'|'title_change'|'terminate'|'rehire' = 'hire',
  effective_from?: Date,
  effective_to?: Date
) {
  // Resolve/ensure a user
  let userId: string;
  if (typeof userRef === 'string') userId = userRef;
  else if (userRef && typeof userRef === 'object' && typeof userRef.userId === 'string') userId = userRef.userId;
  else userId = (await createUser()).userId;

  const from = effective_from ?? new Date();
  const to = (effective_to === undefined) ? null : effective_to;

  const id = await dynamicInsert('employment_events', {
    user_id: userId,
    event_type: event,
    effective_from: from,
    effective_to: to,
    payload: { note: 'test' }
  });
  return { employmentEventId: id, userId };
}

export async function tableCount(table: string): Promise<number> {
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return r.rows[0].c as number;
}