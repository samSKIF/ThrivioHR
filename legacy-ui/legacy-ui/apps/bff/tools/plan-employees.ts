import { Client } from 'pg';

const THRESHOLD_MS = Number(process.env.PLAN_MAX_MS ?? 25); // tweakable
const INDEX_NAME = 'idx_users_org_created_id';

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // 1) pick the org with the most users to ensure optimal index usage
  const { rows: orgs } = await client.query(`
    SELECT organization_id as id 
    FROM users 
    GROUP BY organization_id 
    ORDER BY COUNT(*) DESC 
    LIMIT 1
  `);
  if (!orgs.length) throw new Error('No organizations found');
  const orgId = orgs[0].id;

  const { rows: cursor } = await client.query(`
    select created_at as "createdAt", id
    from users
    where organization_id = $1
    order by created_at asc, id asc
    offset 5 limit 1
  `, [orgId]);
  if (!cursor.length) throw new Error('Not enough users to compute a cursor');

  const { createdAt, id } = cursor[0];

  // 2) explain analyze the page-2 query
  const { rows: planRows } = await client.query(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, email
    FROM users
    WHERE organization_id = $1
      AND (created_at, id) > ($2::timestamp, $3::uuid)
    ORDER BY created_at ASC, id ASC
    LIMIT 101;
  `, [orgId, createdAt, id]);

  const planText = planRows.map(r => r['QUERY PLAN']).join('\n');

  // 3) assertions
  const usesIndex = /Index (Only )?Scan .*idx_users_org_created_id/.test(planText);
  const hasSort = /\bSort\b/.test(planText);
  const timeMatch = planText.match(/Execution Time:\s+([\d.]+)\s+ms/);
  const timeMs = timeMatch ? Number(timeMatch[1]) : NaN;

  const failures: string[] = [];
  if (!usesIndex) failures.push('Planner did not use idx_users_org_created_id');
  if (hasSort) failures.push('Planner added a Sort (ordering not satisfied by index)');
  if (!Number.isFinite(timeMs)) failures.push('Could not parse execution time');
  else if (timeMs > THRESHOLD_MS) failures.push(`Execution time ${timeMs}ms > ${THRESHOLD_MS}ms`);

  if (failures.length) {
    console.error('--- PLAN GUARD FAIL ---');
    console.error(planText);
    console.error('Failures:', failures);
    process.exit(1);
  } else {
    console.log('INDEX_OK ✅  NO_SORT ✅  TIME_OK ✅', `(Execution ${timeMs}ms)`);
  }

  await client.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});