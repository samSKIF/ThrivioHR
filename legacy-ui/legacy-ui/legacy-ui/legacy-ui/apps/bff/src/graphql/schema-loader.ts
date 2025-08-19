// apps/bff/src/graphql/schema-loader.ts
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';

const req = createRequire(__filename);

/**
 * Robustly load the contract-first SDL from @thrivio/contracts across:
 *  - ts-node/dev
 *  - Jest (ts-jest)
 *  - compiled dist in CI
 */
export function loadContractSDL(): string {
  const candidates = [
    // TS sources (dev/jest)
    '@thrivio/contracts/src/graphql/schema.graphql',
    // Built outputs (CI/dist)
    '@thrivio/contracts/dist/src/graphql/schema.graphql',
    // Fallback legacy (in case package exposes a flat path)
    '@thrivio/contracts/graphql/schema.graphql',
  ];

  for (const specifier of candidates) {
    try {
      const resolved = req.resolve(specifier);
      if (existsSync(resolved)) {
        return readFileSync(resolved, 'utf8');
      }
    } catch {
      // ignore and try next
    }
  }

  throw new Error(
    'Cannot locate GraphQL SDL from @thrivio/contracts. Checked TS and dist paths.'
  );
}