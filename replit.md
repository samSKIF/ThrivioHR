replit

## Purpose
This doc is the **contract** the Replit Agent must follow. If any prompt conflicts with this file, **STOP and ask**. Prefer small, reversible changes with explicit acceptance checks.

## Monorepo
- Package manager: **pnpm**. Orchestrator: **Nx**. Language: **TypeScript**.
- Apps: `/apps/web` (Next.js) and `/apps/bff` (NestJS GraphQL).
- Services: `/services/*` (NestJS microservices).
- Shared libs: `/packages/*` (`types`, `config`, `ui`, `contracts`, `testing`).
- **Never** create projects outside these roots.

## File & asset limits (CI-enforced)
- **Source file hard size:** **40 KB** (soft 28 KB).
- **Function length:** soft 60 lines, **hard 100** (fail).
- **Component length:** soft 300 lines, **hard 500** (fail).
- **Service/module length:** soft 500 lines, **hard 800** (fail).
- **Test file length:** ≤ 800 lines.
- **Assets:** block > **300 KB** (SVG up to 500 KB). No videos or large binaries in repo.
- Any file that breaches hard limits **must be split** before merge.

## Duplicate guard
- Do **not** create files with suffixes like `(1)`, `(2)`, `copy`, `- Copy`.
- If a new file is required, list it in the plan **before** writing.
- Pre-commit & CI will fail on duplicate basenames in the same folder.

## Temp/build policy
- Must be ignored by git:
.nx/cache
dist/
build/
coverage/
.turbo/
.next/
.expo/
.cache/
playwright-report/
test-results/
tmp/
uploads/
node_modules/
.DS_Store
- After `test` and `e2e`, run `pnpm clean` which executes `scripts/cleanup-dev.sh` to delete those folders. Do **not** leave temp artifacts.

## Commands
- `pnpm dev` — run web, bff, and selected services.
- `pnpm test` — unit & integration tests.
- `pnpm e2e` — Playwright E2E.
- `pnpm clean` — remove temp/build caches.

## Contracts-first
- Update `/packages/contracts` first: **OpenAPI** (services), **GraphQL** (BFF), **JSON Schemas** (events).
- Generate clients and commit them.
- CI blocks breaking REST/GraphQL/event changes without a version bump.

## Auth & entitlements
- Web calls **only** the **GraphQL BFF**; never call services directly from the browser.
- BFF enforces RBAC/ABAC + Entitlements; services re-check authorization (defense in depth).

## i18n & a11y
- All UI strings via **ICU** i18n keys. **No hardcoded sentences**.
- RTL-safe layouts (logical CSS properties). WCAG **AA** contrast; keyboard focus visible.

## Testing & coverage
- Core services (**identity**, **ledger**, **recognition**): **100%** statements & branches.
- All other services/apps: **≥ 90%**.
- Playwright: smoke flows on PRs (login, P2P recognition, manager grant).
- k6: perf smoke (ledger write, order flow) with p95 regression gate.

## Logging, tracing, errors
- Structured logs (**pino**), no PII; include `trace_id`, and where available `tenant_id`, `user_id`.
- End-to-end tracing (**OpenTelemetry**) from web → BFF → services → jobs.
- Use **typed error classes**; map to GraphQL codes; never throw raw strings.

## Security
- Secrets only from env/Replit Secrets. **Never** commit secrets.
- Validate all inputs (zod/DTOs); reject unknown fields.
- Step-up auth (**WebAuthn**) for funding, refunds, PMV changes, support impersonation.
- Respect **data residency**; no cross-pod PII.

## Prompting rules (Agent)
- **MANDATORY FIRST STEP**: Before ANY work, check these files for context:
  1. `architecture.md` - System architecture, domains, regions, tenancy
  2. `context/coding-standards.md` - File limits, patterns, stack versions  
  3. `context/guardrails.md` - Security rules, what to avoid
  4. `context/mission.md` - Product goals, markets, deployment modes
  5. `replit.md` - User preferences and recent changes
- **One small change per prompt.**
- **Print a PLAN** with exact files to touch. Do not touch outside files.
- After edits, run acceptance checks (lint/tests/dev port up/etc.) and print results.
- If anything fails: **revert and STOP**.

## Performance & pagination
- Avoid N+1: BFF uses **DataLoader**; services provide batch endpoints.
- Pagination required on lists > 100 items (cursor/keyset preferred).
- Response size budgets in BFF; compress where appropriate.

## Git & reviews
- Conventional Commits. Short-lived branches. `CODEOWNERS` required reviews.
- PR description must include: what/why, affected contracts, test evidence, rollback plan.

## Recent Changes
- **2025-08-12**: Successfully implemented locations support for CSV import (Big 4.4)
- **Locations Features**: Full location import workflow with findOrCreateLocation, location counter tracking
- **Repository Methods**: Added listDistinctLocations and findOrCreateLocation with proper type handling
- **Import Enhancement**: CSV import now supports location field, creates locations as 'site' type, tracks newLocations
- **Database Integration**: Fixed location schema handling with required type field for hierarchical structure
- **Testing**: Verified location creation, import planning, and counter accuracy
- **Progress**: Big 4 Directory ADVANCED - locations import operational alongside departments and users
