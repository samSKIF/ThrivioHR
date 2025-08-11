// jest.setup.db.ts — ephemeral schema + programmatic migrations for Identity
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema';
import * as crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';

let client: Client;
export let db: ReturnType<typeof drizzle>;
export { client };
let schemaName = '';

function rand(n=6){ return crypto.randomBytes(n).toString('hex'); }

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  schemaName = `identity_test_${Date.now()}_${rand(3)}`;
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
  await client.query(`CREATE SCHEMA "${schemaName}";`);
  console.log('TEST search_path before migrate:', (await client.query('SHOW search_path')).rows[0].search_path);
  await client.query(`SET search_path TO "${schemaName}", public`);
  db = drizzle(client, { schema });
  // --- begin manual migrations runner ---
  const migrationsDir = path.resolve(__dirname, '../drizzle/migrations');
  const files = fs.readdirSync(migrationsDir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.sql'))
    .map(d => d.name)
    .sort();

  console.log('TEST using migrations folder (manual):', migrationsDir, 'files:', files.length);
  for (const f of files) {
    let sqlText = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    // Strip schema qualifiers so FKs point to ephemeral schema instead of "public"
    sqlText = sqlText.replaceAll('"public".', '');
    sqlText = sqlText.replaceAll('public.', '');
    await client.query(sqlText); // applies into current search_path
  }
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type='BASE TABLE'
     ORDER BY table_name`,
    [schemaName]
  );
  console.log('TEST_SCHEMA_TABLES:', tables.rows.map(r => r.table_name).join(','));
  // --- end manual migrations runner ---
});

afterEach(async () => {
  // Truncate all tables created by the migrations; this is safe because search_path is scoped
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = $1 AND table_type='BASE TABLE'
  `, [schemaName]);
  const tables = res.rows.map(r => `"${schemaName}"."${r.table_name}"`).join(', ');
  if (tables) {
    await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
  }
});

afterAll(async () => {
  try {
    await client.query(`SET search_path TO public;`);
    await client.query(`DROP SCHEMA "${schemaName}" CASCADE;`);
  } finally {
    await client.end();
  }
});

export { client };