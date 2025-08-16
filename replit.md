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
- After finishing all request by the prompt provide an overview where we are compared to Roadmap.md

## Performance & pagination
- Avoid N+1: BFF uses **DataLoader**; services provide batch endpoints.
- Pagination required on lists > 100 items (cursor/keyset preferred).
- Response size budgets in BFF; compress where appropriate.

## Git & reviews
- Conventional Commits. Short-lived branches. `CODEOWNERS` required reviews.
- PR description must include: what/why, affected contracts, test evidence, rollback plan.

## Recent Changes
- **2025-08-16**: **DEFAULT LOGIN PAGE REDIRECT** - Configured home page to automatically redirect to login page on app startup for better development workflow
- **2025-08-16**: **APOLLO CLIENT GRAPHQL AUTHENTICATION - COMPLETE** - Fixed GraphQL authentication by configuring Apollo Client to use Next.js proxy routes
- **Apollo Client Fix**: Changed NEXT_PUBLIC_GRAPHQL_URL from direct BFF URL to `/graphql` proxy route for proper JWT token inclusion
- **Authentication Flow Verified**: Full end-to-end authentication working - REST login → JWT storage → GraphQL currentUser query successful
- **2025-08-15**: **BIG 3A WEB APP FOUNDATION - COMPLETE** - Next.js 14 app with Apollo Client GraphQL, authentication flow, and dev bootstrap
- **Login Page Stability**: Fixed hydration mismatch with suppressHydrationWarning and robust error handling with try/catch networking
- **Environment Configuration**: Added .env.local with NEXT_PUBLIC_API_URL for reliable BFF communication
- **Dev Auth Bootstrap**: Created /dev/auth page for quick token validation with production safety guards
- **Authentication Integration**: Complete REST login → JWT storage → Apollo Client headers → GraphQL currentUser flow
- **2025-08-15**: **ROADMAP RESTRUCTURED** - Added Big 3a (Web App Foundation) and Big 3b (SSO Foundation) milestones to context/ROADMAP.md
- **2025-08-15**: **ORGANIZATION SCOPE ENFORCEMENT IMPLEMENTED** - Created OrgScopeGuard to prevent cross-organization data leakage
- **Security Enhancement**: All GraphQL resolvers now enforce organization scope using JWT token orgId (never from client args)
- **Data Isolation**: Added comprehensive E2E tests proving no cross-org employee leakage and client tampering resistance
- **Performance Protection**: CI plan guard automatically validates composite index usage and prevents performance regressions
- **Production Readiness**: Guard validates INDEX_OK, NO_SORT, TIME_OK metrics on every build with configurable thresholds
- **Composite Index Validated**: EXPLAIN ANALYZE confirms 0.079ms execution with optimal index usage on production-scale datasets
- **2025-08-14**: **JEST E2E CONFIGURATION ALIGNMENT COMPLETE** - Tests now use identical GraphQL setup as production
- **Test Reliability**: E2E tests run flake-free with consistent authentication and error handling patterns  
- **Production Parity**: Jest apps use same SDL loader, path `/graphql`, validation rules, and error formatter as runtime
- **Authentication Testing**: Verified UNAUTHENTICATED error codes with "No authorization header" messages
- **Request Patterns**: All tests use `request(server)` with `.expect(200)` pattern for GraphQL responses
- **No 404 Errors**: GraphQL endpoint consistently responds with proper status codes in both test and runtime
- **Configuration Unity**: Test app relies on same AppModule configuration without separate GraphQL reconfiguration
- **Query Validation**: Depth and complexity limits enforced consistently across test and production environments
- **DATABASE PERFORMANCE**: O(log n) keyset pagination with composite index (organization_id, created_at, id)
- **Connection-Style Pagination**: Scalable employee pagination with proper Edge/Connection pattern
- **Error Formatting System**: Consistent GraphQL errors with extension codes (UNAUTHENTICATED, FORBIDDEN, BAD_REQUEST, INTERNAL_SERVER_ERROR)
- **Production Security**: Error masking in production environments, stack trace removal for security
- **Comprehensive Testing**: All pagination scenarios tested with invalid cursor and page size validation
- **Schema Evolution**: Contract-first approach with SDL updates in @thrivio/contracts package
