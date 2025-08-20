import { spawnSync } from 'child_process';
import * as path from 'path';

function runESLintJSON() {
  // Call ESLint directly so we can parse JSON results deterministically
  const res = spawnSync(
    process.execPath,
    ['node_modules/eslint/bin/eslint.js', 'apps/web', '--ext', '.ts,.tsx', '--format', 'json'],
    { encoding: 'utf8' }
  );

  if (res.error) {
    throw res.error;
  }
  const out = res.stdout?.trim() || '[]';
  try {
    return JSON.parse(out);
  } catch (e) {
    throw new Error('Failed to parse ESLint JSON output:\n' + out.slice(0, 1000));
  }
}

test('eslint excludes .next', () => {
  const results: Array<{ filePath: string }> = runESLintJSON();
  const offenders = results
    .map(r => r.filePath)
    .filter(fp =>
      fp &&
      (fp.includes(`${path.sep}.next${path.sep}`) || fp.includes('/.next/'))
    );

  // This fails if any .next files slipped into lint results
  expect(offenders).toHaveLength(0);
});