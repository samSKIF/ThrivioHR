import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function rand(n = 6) { return crypto.randomBytes(n).toString('hex'); }

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    
    const schemaName = `diagnose_${Date.now()}_${rand(3)}`;
    
    // Create extensions first
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
    
    // Create schema and set search path
    await client.query(`CREATE SCHEMA "${schemaName}";`);
    await client.query(`SET search_path TO "${schemaName}";`);
    
    // Read and execute all migration files
    const migrationsDir = 'services/identity/drizzle/migrations';
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sqlContent);
    }
    
    // Query tables in the schema
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 AND table_type='BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);
    
    const tableNames = res.rows.map(r => r.table_name);
    console.log('DIAG: tables=' + JSON.stringify(tableNames));
    
    // Cleanup
    await client.query(`SET search_path TO public;`);
    await client.query(`DROP SCHEMA "${schemaName}" CASCADE;`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();