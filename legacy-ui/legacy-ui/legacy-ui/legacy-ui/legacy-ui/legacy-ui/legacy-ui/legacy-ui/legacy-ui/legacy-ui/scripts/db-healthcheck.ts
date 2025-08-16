// scripts/db-healthcheck.ts
import { Client } from 'pg';

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing. Add it in Replit Secrets.');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const r = await client.query('select 1 as ok');
    console.log('DB OK:', r.rows[0].ok === 1);
  } catch (e) {
    console.error('DB ERROR:', (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();