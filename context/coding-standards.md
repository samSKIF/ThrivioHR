# coding-standards

## Stack & versions
- TypeScript **5.x**, Node **20 LTS**
- **NestJS** for services
- **Next.js 14** (App Router) for web
- **React Native/Expo** (mobile shell; later)
- ORM: **Drizzle** (SQL-first, typed)
- Tests: **Jest** (unit/integration), **Playwright** (E2E), **k6** (perf smoke)
- Tooling: **pnpm + Nx**, ESLint, Prettier, Commitlint

## Repo layout (monorepo)
/apps
/web # Next.js: Workspace + Admin via role-aware nav
/bff # NestJS GraphQL Apollo
/services
/identity /directory /recognition /budgets /ledger /marketplace
/licensing /notifications /insights
/packages
/types /config /ui /contracts /testing
/docs

markdown
Copy
Edit

## Code style & limits (CI-enforced)
- **Source file size**: soft **28 KB**, hard **40 KB** (fail CI)
- **Functions**: ≤ **60** lines (soft), **100** (hard)
- **Components**: ≤ **300/500** lines (soft/hard)
- **Service/modules**: ≤ **500/800** lines (soft/hard)
- **Tests**: ≤ **800** lines per file
- **Assets**: block > **300 KB** (SVG up to **500 KB**). No videos/big binaries in repo.
- Strict TS: `"strict": true`, no `any` without comment justification.

## Patterns
- **Contracts-first**: Update OpenAPI/GraphQL/Event Schemas in `/packages/contracts`; generate clients; keep services/types in sync; CI enforces backward-compat.
- **Ports & adapters** everywhere: DB, MessageBus, BlobStore, AI, Payments, Provider connectors.
- **Idempotency** on all mutating endpoints; accept idempotency keys; safe retries.
- **Tracing**: OpenTelemetry end-to-end; propagate `trace_id` BFF → services → jobs.
- **Errors**: typed error classes; map to GraphQL error codes; never throw raw strings.
- **Logging**: pino structured logs; include `trace_id`, `tenant_id`, `user_id` when available; **no PII** in logs.
- **Pagination** required on lists > 100 items; cursor or keyset where possible.

## Security
- Never store secrets in code. Use env + Replit secrets.
- Validate all inputs (zod/DTOs); reject unknown fields.
- AuthZ in **BFF and service** (defense in depth). Deny by default.
- WebAuthn step-up for risky ops (funding, refunds, PMV changes, support impersonation).
- Threat modeling for money/ledger endpoints; SAST + dependency scanning in CI.

## Internationalization & accessibility
- All UI strings via i18n keys (ICU). No hardcoded sentences.
- RTL-safe (logical CSS props); test Arabic layouts.
- A11y: keyboard reachable, visible focus, WCAG **AA** contrast, semantic roles/labels.

## Testing standards
- **Core services** (identity, ledger, recognition): **100%** statements & branches.
- Others: **≥ 90%**.
- Playwright: smoke flows on PRs (login, P2P recognition, manager grant).
- k6: perf smoke for ledger writes and order flow (p95 regression gate).
- Deterministic tests: no network to external providers; use adapters/mocks.

## Performance & DX
- Avoid N+1: BFF uses DataLoader; services expose batch endpoints.
- Use streaming/chunked endpoints for large exports.
- Lint/format must pass; pre-commit hooks enforced.
- Keep functions small & pure where possible; isolate side-effects.

## Duplicate prevention
- Do **not** create files ending with `(1)`, `(2)`, `copy`, `- Copy`.
- Reuse components from `/packages/ui`; cross-service imports are forbidden.
