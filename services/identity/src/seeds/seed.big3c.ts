import { randomUUID, createHash } from 'crypto';
import { Client } from 'pg';
// Resilient hashing: prefer prebuilt @node-rs/argon2; fallback to argon2 native.
async function hashPassword(password: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nr = require('@node-rs/argon2');
    // @node-rs/argon2 API: hash(password, options?)
    // Defaults to argon2id; options can be tuned later.
    return await nr.hash(password);
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const a = require('argon2');
    return await a.hash(password, { type: a.argon2id });
  }
}

type AdminSeed = { name: string; slug: string; domain: string; adminEmail: string; };

const ORGS: AdminSeed[] = [
  { name: 'Canva',     slug: 'canva',    domain: 'canva.com',    adminEmail: 'admin@canva.com' },
  { name: 'Loylogic',  slug: 'loylogic', domain: 'loylogic.com', adminEmail: 'admin@loylogic.com' },
  { name: 'Jumia',     slug: 'jumia',    domain: 'jumia.com',    adminEmail: 'admin@jumia.com' },
];

// NOTE: keep default; first login must change
const ADMIN_PASSWORD = 'Admin123';

async function tableHasColumn(client: Client, table: string, col: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return rows.length > 0;
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=$1`,
    [table]
  );
  return rows.length > 0;
}

async function upsertOrg(client: Client, s: AdminSeed): Promise<string> {
  // 1) Prefer lookup by domain if organization_domains exists
  if (await tableExists(client, 'organization_domains')) {
    const byDom = await client.query(
      `SELECT o.id
         FROM organizations o
         JOIN organization_domains d ON d.org_id = o.id
        WHERE lower(d.domain) = lower($1)
        LIMIT 1`,
      [s.domain]
    );
    if (byDom.rows.length) return byDom.rows[0].id;
  }

  // 2) Fallback lookup by name (case-insensitive)
  const byName = await client.query(
    `SELECT id FROM organizations WHERE lower(name) = lower($1) LIMIT 1`,
    [s.name]
  );
  if (byName.rows.length) return byName.rows[0].id;

  // 3) Insert with only columns that exist
  const id = randomUUID();
  const cols: string[] = ['id', 'name'];
  const vals: any[] = [id, s.name];

  if (await tableHasColumn(client, 'organizations', 'slug')) {
    cols.push('slug'); vals.push(s.slug);
  }
  if (await tableHasColumn(client, 'organizations', 'status')) {
    cols.push('status'); vals.push('active');
  }
  if (await tableHasColumn(client, 'organizations', 'created_at')) {
    cols.push('created_at'); vals.push(new Date().toISOString());
  }
  if (await tableHasColumn(client, 'organizations', 'updated_at')) {
    cols.push('updated_at'); vals.push(new Date().toISOString());
  }

  const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
  await client.query(
    `INSERT INTO organizations (${cols.join(',')}) VALUES (${placeholders})`,
    vals
  );

  // 4) Ensure domain mapping if table exists
  if (await tableExists(client, 'organization_domains')) {
    const domId = randomUUID();
    try {
      const domCols = ['id', 'org_id', 'domain'];
      const domVals = [domId, id, s.domain.toLowerCase()];
      const domPh = domCols.map((_, i) => `$${i + 1}`).join(',');
      await client.query(
        `INSERT INTO organization_domains (${domCols.join(',')}) VALUES (${domPh})`,
        domVals
      );
    } catch (e: any) {
      if (e?.code !== '23505') throw e; // ignore unique conflicts
    }
  }

  return id;
}

async function ensureAdmin(client: Client, orgId: string, email: string) {
  const { rows: u } = await client.query('SELECT id FROM users WHERE lower(email)=lower($1)', [email]);
  if (u.length) return u[0].id;

  const userId = randomUUID();
  const hash = await hashPassword(ADMIN_PASSWORD);

  // Insert with safest common columns; tolerate schema variance.
  // We dynamically discover optional columns to avoid failures.
  const { rows: cols } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='users'`
  );
  const names = cols.map((r: any) => r.column_name);

  // Include BOTH possible org columns; whichever exists will be used.
  const colNames = [
    'id',
    'org_id',
    'organization_id',
    'email',
    'password_hash',
    'password_reset_required',
    'created_at',
  ];
  const vals = [
    userId,
    orgId,              // for org_id
    orgId,              // for organization_id
    email.toLowerCase(),
    hash,
    true,
    new Date().toISOString(),
  ];

  const fields = colNames.filter(n => names.includes(n));
  const placeholders = fields.map((_, i) => `$${i+1}`);
  const args = fields.map((n) => vals[colNames.indexOf(n)]);

  if (fields.length < 3) throw new Error('users table missing required columns for seed');

  await client.query(
    `INSERT INTO users (${fields.join(',')}) VALUES (${placeholders.join(',')})`,
    args
  );

  // Create empty profile row if table exists
  const profileExists = cols.some((r: any) => r.column_name === 'profile_completion_pct');
  try {
    await client.query(
      `INSERT INTO user_profiles (user_id, updated_at) VALUES ($1, now())`,
      [userId]
    );
  } catch { /* ignore if table absent */ }

  // Best-effort: link user to org if org_membership table exists
  if (await tableExists(client, 'org_membership')) {
    try {
      // Discover column names
      const { rows: omCols } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='org_membership'`
      );
      const set = new Set(omCols.map((r: any) => r.column_name));
      if (set.has('org_id') && set.has('user_id')) {
        await client.query(
          `INSERT INTO org_membership (org_id, user_id) VALUES ($1, $2)`,
          [orgId, userId]
        );
      }
    } catch (e: any) {
      if (e?.code !== '23505') console.warn('org_membership link warn:', e?.message || e);
    }
  }

  return userId;
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error('DATABASE_URL not set');

  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const org of ORGS) {
      const orgId = await upsertOrg(client, org);
      await ensureAdmin(client, orgId, org.adminEmail);
      console.log(`Seeded org=${org.slug} admin=${org.adminEmail}`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('seed.big3c failed:', e?.message || e);
    process.exit(1);
  });
}