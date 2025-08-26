import { Client } from 'pg';

function parseEmail(e: string): { local: string; domain: string } | null {
  const m = e.match(/^([^@]+)@(.+)$/);
  if (!m) return null;
  return { local: m[1], domain: m[2] };
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Detect optional columns
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='users'`
    );
    const cols = new Set(colRes.rows.map((r: any) => r.column_name));
    const hasCreatedAt = cols.has('created_at');
    const hasPRR = cols.has('password_reset_required');

    // Find duplicate groups
    const dupGroups = await client.query(
      `SELECT lower(email) AS email_lc
       FROM users
       GROUP BY 1
       HAVING COUNT(*) > 1
       ORDER BY email_lc`
    );
    if (dupGroups.rowCount === 0) {
      console.log('No duplicate emails found. Nothing to clean.');
      return;
    }

    console.log(`Found ${dupGroups.rowCount} duplicate group(s). Starting cleanup...`);

    // Begin transaction
    await client.query('BEGIN');

    let updated = 0;
    for (const g of dupGroups.rows) {
      const emailLc: string = g.email_lc;
      const detailSql = hasCreatedAt
        ? `SELECT id, email, created_at FROM users WHERE lower(email)=$1 ORDER BY created_at NULLS LAST, id ASC`
        : `SELECT id, email        FROM users WHERE lower(email)=$1 ORDER BY id ASC`;
      const { rows } = await client.query(detailSql, [emailLc]);
      if (rows.length <= 1) continue;

      // Keep first as canonical; change others
      const keep = rows[0];
      const dups = rows.slice(1);

      for (const row of dups) {
        const parsed = parseEmail(row.email);
        if (!parsed) {
          console.warn(`Skipping malformed email: ${row.email} (id=${row.id})`);
          continue;
        }
        const baseLocal = parsed.local.split('+')[0]; // preserve anything before '+'
        let candidate: string;
        let attempt = 0;
        // Prefer id prefix to ensure uniqueness
        const id6 = String(row.id).replace(/-/g, '').slice(0, 6) || Math.random().toString(36).slice(2, 8);

        while (true) {
          const suffix = attempt === 0 ? `+dup-${id6}` : `+dup-${id6}-${attempt}`;
          candidate = `${baseLocal}${suffix}@${parsed.domain}`;
          const exists = await client.query(
            `SELECT 1 FROM users WHERE lower(email)=lower($1) LIMIT 1`,
            [candidate]
          );
          if (exists.rowCount === 0) break;
          attempt++;
          if (attempt > 10) {
            throw new Error(`Cannot find unique candidate for ${row.email} (id=${row.id})`);
          }
        }

        if (hasPRR) {
          await client.query(
            `UPDATE users SET email=$1, password_reset_required=true WHERE id=$2`,
            [candidate, row.id]
          );
        } else {
          await client.query(`UPDATE users SET email=$1 WHERE id=$2`, [candidate, row.id]);
        }
        updated++;
        console.log(`Updated ${row.email} -> ${candidate} (id=${row.id})`);
      }
    }

    await client.query('COMMIT');
    console.log(`Cleanup complete. Emails updated: ${updated}`);
  } catch (e: any) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Cleanup failed:', e?.message || e);
    process.exit(2);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Fatal:', e?.message || e);
  process.exit(3);
});