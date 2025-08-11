// jest.setup.db.ts — ephemeral schema + programmatic migrations for Identity
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../src/db/schema';
import * as crypto from 'crypto';
import path from 'node:path';

let client: Client;
export let db: ReturnType<typeof drizzle>;
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
  // Programmatic migrations into the current search_path
  const migrationsFolder = path.resolve(__dirname, '../drizzle');
  console.log('TEST using migrations folder:', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('TEST search_path after migrate:', (await client.query('SHOW search_path')).rows[0].search_path);
  const t = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type='BASE TABLE' ORDER BY table_name`,
    [schemaName]
  );
  console.log('TEST_SCHEMA_TABLES:', t.rows.map(r => r.table_name).join(','));
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