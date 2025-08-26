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

async function upsertOrg(client: Client, s: AdminSeed): Promise<string> {
  // Try get by slug, else insert.
  const { rows: existing } = await client.query('SELECT id FROM organizations WHERE slug = $1', [s.slug]);
  if (existing.length) return existing[0].id;

  const id = randomUUID();
  await client.query(
    `INSERT INTO organizations (id, name, slug, status, created_at, updated_at)
     VALUES ($1,$2,$3,'active', now(), now())
     ON CONFLICT DO NOTHING`,
    [id, s.name, s.slug]
  );

  // Ensure domain mapping
  const domId = randomUUID();
  try {
    await client.query(
      `INSERT INTO organization_domains (id, org_id, domain, is_primary, created_at)
       VALUES ($1,$2,$3,true, now())`,
      [domId, id, s.domain]
    );
  } catch (e: any) {
    // ignore unique violations on domain
    if (e?.code !== '23505') throw e;
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

  const colNames = ['id', 'org_id', 'email', 'password_hash', 'password_reset_required', 'created_at'];
  const vals = [userId, orgId, email.toLowerCase(), hash, true, new Date().toISOString()];

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