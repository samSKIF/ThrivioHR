// jest.setup.db.ts — ephemeral schema + programmatic migrations for Identity
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../src/db/schema';
import * as crypto from 'crypto';

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
  await client.query(`CREATE SCHEMA "${schemaName}";`);
  await client.query(`SET search_path TO "${schemaName}";`);
  db = drizzle(client, { schema });
  // Programmatic migrations into the current search_path
  await migrate(db, { migrationsFolder: 'services/identity/drizzle/migrations' });
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