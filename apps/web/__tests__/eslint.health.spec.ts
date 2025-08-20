import { spawnSync } from 'child_process';

function runESLintJSON(timeoutMs = 20000) {
  const res = spawnSync(
    process.execPath,
    [
      'node_modules/eslint/bin/eslint.js',
      'apps/web',
      '--ext', '.ts,.tsx,.js,.jsx',
      '--format', 'json',
      '--no-error-on-unmatched-pattern'
    ],
    { encoding: 'utf8', timeout: timeoutMs }
  );

  if (res.error) throw res.error;
  if (res.signal) throw new Error(`eslint terminated by signal: ${res.signal}`);
  const out = (res.stdout || '[]').trim();
  let results: any[] = [];
  try { results = JSON.parse(out); } catch { throw new Error('Failed to parse ESLint JSON output'); }

  // Flatten counts
  const errors = results.reduce((s, r:any) => s + (r.errorCount || 0), 0);
  const offenders = results
    .map((r: any) => r.filePath as string)
    .filter((fp: string) => fp.includes('/.next/') || fp.includes('/static/'));

  return { errors, offenders, resultsCount: results.length };
}

test('eslint health: completes, no errors, excludes .next/static', () => {
  const { errors, offenders, resultsCount } = runESLintJSON(20000);
  // Must complete with no parse/timeout; must not include generated files; must have zero errors
  expect(offenders).toHaveLength(0);
  expect(errors).toBe(0);
  // Sanity: there should be some results, otherwise test isn't meaningful
  expect(resultsCount).toBeGreaterThan(0);
});