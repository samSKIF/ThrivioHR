import { randomUUID } from 'crypto';
// we exported `db` in jest.setup.db.ts already; also export the raw pg client:
import { db, client } from './jest.setup.db';

function uniqueEmail(prefix='user'){ return `${prefix}+${Date.now()}_${Math.random().toString(36).slice(2,6)}@example.com`; }
function slug(prefix='org'){ return `${prefix}_${Math.random().toString(36).slice(2,8)}`; }

export async function createOrg(name?: string) {
  const n = name ?? `Test Org ${Math.random().toString(36).slice(2,8)}`;
  const res = await client.query(
    `INSERT INTO organizations (name, is_active) VALUES ($1, $2) RETURNING id`,
    [n, true]
  );
  return { id: res.rows[0].id as string };
}

export async function ensureCompanyOrgUnit(orgId: string) {
  // returns the company-level org_unit id; create if missing
  const r0 = await client.query(
    `SELECT id FROM org_units WHERE organization_id=$1 AND type='company' LIMIT 1`,
    [orgId]
  );
  if (r0.rowCount > 0) return r0.rows[0].id as string;
  const r1 = await client.query(
    `INSERT INTO org_units (organization_id, type, name, parent_id) VALUES ($1,'company','Company',NULL) RETURNING id`,
    [orgId]
  );
  return r1.rows[0].id as string;
}

export async function createDepartment(orgId: string, name='Dept') {
  const companyId = await ensureCompanyOrgUnit(orgId);
  const r = await client.query(
    `INSERT INTO org_units (organization_id, type, name, parent_id) VALUES ($1,'department',$2,$3) RETURNING id`,
    [orgId, name, companyId]
  );
  return r.rows[0].id as string;
}

export async function createTeam(orgId: string, name='Team', parentDeptId?: string) {
  const deptId = parentDeptId ?? await createDepartment(orgId, 'Dept');
  const r = await client.query(
    `INSERT INTO org_units (organization_id, type, name, parent_id) VALUES ($1,'team',$2,$3) RETURNING id`,
    [orgId, name, deptId]
  );
  return r.rows[0].id as string;
}

export async function createUser(organizationId?: string, email?: string) {
  const orgId = organizationId ?? (await createOrg()).id;
  const userEmail = email ?? uniqueEmail('user');
  const r = await client.query(
    `INSERT INTO users (organization_id, email, first_name, last_name) VALUES ($1,$2,$3,$4) RETURNING id`,
    [orgId, userEmail, 'Test', 'User']
  );
  return { id: r.rows[0].id as string, organizationId: orgId, email: userEmail };
}

export async function createIdentity(userId?: string, provider: 'local'|'oidc'|'saml'|'csv' = 'local', subject?: string) {
  const u = userId ? { id: userId } : await createUser();
  const sub = subject ?? randomUUID();
  const r = await client.query(
    `INSERT INTO identities (user_id, provider, provider_subject) VALUES ($1,$2,$3) RETURNING id`,
    [u.id, provider, sub]
  );
  return { id: r.rows[0].id as string, userId: u.id };
}

export async function createSession(userId?: string, expiresMinutes = 60) {
  const u = userId ? { id: userId } : await createUser();
  const now = new Date();
  const exp = new Date(now.getTime() + expiresMinutes * 60_000);
  const r = await client.query(
    `INSERT INTO sessions (user_id, expires_at) VALUES ($1,$2) RETURNING id`,
    [u.id, exp]
  );
  return { id: r.rows[0].id as string, userId: u.id };
}

export async function createMembership(userId?: string) {
  const u = userId ? { id: userId } : await createUser();
  // find the user org
  const orgRow = await client.query(`SELECT organization_id FROM users WHERE id=$1`, [u.id]);
  const orgId: string = orgRow.rows[0].organization_id;
  const teamId = await createTeam(orgId, 'Team');
  const r = await client.query(
    `INSERT INTO org_membership (user_id, org_unit_id) VALUES ($1,$2) RETURNING id`,
    [u.id, teamId]
  );
  return { id: r.rows[0].id as string, userId: u.id, orgId, teamId };
}

export async function createEmploymentEvent(userId?: string, event: 'hire'|'transfer'|'manager_change'|'title_change'|'terminate'|'rehire' = 'hire') {
  const u = userId ? { id: userId } : await createUser();
  const from = new Date();
  const r = await client.query(
    `INSERT INTO employment_events (user_id, event_type, effective_from, metadata) VALUES ($1,$2,$3,$4) RETURNING id`,
    [u.id, event, from, JSON.stringify({ note: 'test' })]
  );
  return { id: r.rows[0].id as string, userId: u.id };
}

// tiny util for tests
export async function tableCount(table: string): Promise<number> {
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return r.rows[0].c as number;
}