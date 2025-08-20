import { spawnSync } from 'child_process';

function runESLintJSON() {
  const res = spawnSync(
    process.execPath,
    ['node_modules/eslint/bin/eslint.js', 'apps/web', '--ext', '.ts,.tsx,.js,.jsx', '--format', 'json'],
    { encoding: 'utf8' }
  );
  const out = (res.stdout || '[]').trim();
  try { return JSON.parse(out); } catch { throw new Error('Failed to parse ESLint JSON output'); }
}

test('eslint excludes /static generated files', () => {
  const results = runESLintJSON();
  const offenders = results
    .map((r: any) => r.filePath as string)
    .filter((p: string) => p.includes('/static/'));
  expect(offenders).toHaveLength(0);
});