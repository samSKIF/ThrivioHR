import path from 'path';
import { spawnSync } from 'child_process';

jest.setTimeout(30000);

function runESLintCLI() {
  const cwd = path.resolve(__dirname, '..'); // apps/web
  const nodeBin = process.execPath; // run "node path/to/eslint.js"
  const eslintJS = path.join(cwd, '..', '..', 'node_modules', 'eslint', 'bin', 'eslint.js');

  const args = [
    eslintJS,
    '.',                            // lint the web app folder
    '--config', 'eslint.config.mjs',// use web's flat config
    '--format', 'json',
    '--no-error-on-unmatched-pattern'
  ];

  const res = spawnSync(nodeBin, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '0' },
    encoding: 'utf8',
    timeout: 25000
  });

  if (res.error) throw res.error;
  if (res.signal) throw new Error(`ESLint killed by signal: ${res.signal}`);

  const stdout = (res.stdout || '').trim();
  if (!stdout) {
    throw new Error(`ESLint produced no JSON output.\nSTDERR:\n${res.stderr || '(empty)'}`);
  }

  let results: any[];
  try { results = JSON.parse(stdout); } 
  catch (e) { 
    throw new Error('Failed to parse ESLint JSON output:\n' + stdout.slice(0, 1200));
  }

  return { results, stderr: res.stderr || '' };
}

test('eslint smoke: completes via CLI, 0 errors, excludes .next/static', () => {
  const { results } = runESLintCLI();

  // Should lint at least one file (otherwise test isn't meaningful)
  expect(results.length).toBeGreaterThan(0);

  const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);
  expect(totalErrors).toBe(0);

  const offenders = results
    .map(r => r.filePath as string)
    .filter(fp => fp.includes('/.next/') || fp.includes('/static/'));
  expect(offenders).toHaveLength(0);
});