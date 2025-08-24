import { readFileSync } from 'fs';
import { Client } from 'pg';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: tsx scripts/sql-runner.ts <file.sql>');
    process.exit(1);
  }
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const sqlText = readFileSync(file, 'utf8');
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sqlText);
    console.log(`Applied SQL from ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('SQL run failed:', e?.message || e);
  process.exit(2);
});