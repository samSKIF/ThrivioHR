import path from 'path';
import { ESLint } from 'eslint';

jest.setTimeout(30000);

test('eslint health: completes, no errors, excludes .next/static', async () => {
  // Run ESLint programmatically with cwd=apps/web so it picks up apps/web/eslint.config.mjs
  const cwd = path.resolve(__dirname, '..'); // apps/web
  const eslint = new ESLint({ cwd });        // flat config is auto-resolved by ESLint v9+

  // Lint files per the project's own config (no legacy --ext flags or wrong paths)
  const results = await eslint.lintFiles(['.']);

  // Sanity: should process >0 files (otherwise the test isn't meaningful)
  expect(results.length).toBeGreaterThan(0);

  // Must have zero errors
  const errors = results.reduce((s, r) => s + (r.errorCount || 0), 0);
  expect(errors).toBe(0);

  // Must NOT include generated outputs
  const offenders = results
    .map(r => r.filePath)
    .filter(fp =>
      fp.includes(`${path.sep}.next${path.sep}`) ||
      fp.includes(`${path.sep}static${path.sep}`) ||
      fp.includes('/.next/') ||
      fp.includes('/static/')
    );
  expect(offenders).toHaveLength(0);
});