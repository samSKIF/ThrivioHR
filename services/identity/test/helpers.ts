import { client } from './jest.setup.db';
import { randomUUID } from 'crypto';

type Col = { name: string; isNullable: boolean; hasDefault: boolean; dataType: string };

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
  // Accept legacy shapes:
  //  - createUser(orgId?: string, email?: string) -> returns userId (string)
  //  - createUser({ orgId?, email?, given_name?, family_name?, locale?, status? }) -> returns { userId, orgId }
  let orgId: string | undefined;
  let email: string | undefined;

  // Handle legacy calls first: createUser(orgId, email) or createUser(orgObj, email)
  if (typeof arg1 === 'string' || typeof arg2 === 'string' || (arg1 && typeof arg1 === 'object' && 'id' in arg1)) {
    // Legacy format
    if (typeof arg1 === 'string') {
      orgId = arg1;
    } else if (arg1 && typeof arg1 === 'object' && 'id' in arg1) {
      orgId = arg1.id;  // support createOrg() result
      if (!email && 'email' in arg1 && typeof arg1.email === 'string') {
        email = arg1.email;
      }
    }
    
    if (typeof arg2 === 'string') {
      email = arg2;
    }

    if (!orgId) orgId = await createOrganization();
    const id = await dynamicInsert('users', {
      organization_id: orgId,
      email: (email ?? `user+${Date.now()}@example.com`).toLowerCase(),
      given_name: 'Test',
      family_name: 'User',
      locale: 'en',
      status: 'active'
    });
    return id; // legacy return: string userId
  }

  // New object form
  const opts = arg1 ?? {};
  if (!opts.orgId) opts.orgId = await createOrganization();
  const userId = await dynamicInsert('users', {
    organization_id: opts.orgId,
    email: (opts.email ?? `user+${Date.now()}@example.com`).toLowerCase(),
    given_name: opts.given_name ?? 'Test',
    family_name: opts.family_name ?? 'User',
    locale: opts.locale ?? 'en',
    status: opts.status ?? 'active'
  });
  return { userId, orgId: opts.orgId };
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

export async function createSession(userId?: string, minutes=60) {
  const u = userId ? { userId } : await createUser();
  const exp = new Date(Date.now() + minutes * 60_000);
  const id = await dynamicInsert('sessions', {
    user_id: u.userId ?? u,
    expires_at: exp
  });
  return { id, userId: u.userId ?? u };
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

export async function createEmploymentEvent(userId?: string, event: 'hire'|'transfer'|'manager_change'|'title_change'|'terminate'|'rehire' = 'hire') {
  const u = userId ? { userId } : await createUser();
  const uid = u.userId ?? u;
  const id = await dynamicInsert('employment_events', {
    user_id: uid,
    event_type: event,
    effective_from: new Date(),
    metadata: JSON.stringify({ note: 'test' })
  });
  return { id, userId: uid };
}

export async function tableCount(table: string): Promise<number> {
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return r.rows[0].c as number;
}