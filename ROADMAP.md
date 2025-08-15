# ThrivioHR Development Roadmap

## Big 1b — Web App (Next.js) **IN PROGRESS**

### Sub-features
- Single Next.js app (Workspace + Admin via role-aware nav)
- Auth wiring to BFF (JWT) + protected routes; org scoping from token
- GraphQL client setup (codegen, error & retry policy, caching)
- UI kit baseline (Tailwind + shadcn/ui), i18n (incl. RTL), theming
- SSR/ISR where needed; route-level loading/error boundaries
- E2E smoke: login → fetch currentUser → directory page with cursor pagination

### DoD
- `pnpm dev` runs web+BFF locally; pages render without hydration errors
- Protected pages redirect when unauthenticated; authorized flow green
- Directory list uses connection pagination and matches GraphQL schema
- Lint/typecheck/test in CI; Lighthouse ≥90 perf/accessibility on key pages

## Big 3a — Web App (Next.js) Foundation **NEXT**

### Sub-features
- Next.js 14 app scaffold in monorepo (App Router, TypeScript, ESLint/Prettier).
- Auth wiring: JWT from BFF; role-aware nav (Workspace/Admin).
- GraphQL client (urql or Apollo) with auth link + error handling.
- Layout/shell: header/nav, toasts, error boundary, loading states.
- Basic pages: Login, Me/Profile (read-only), 404.
- CI: build, type-check, and e2e smoke (login → `currentUser`).

### DoD
- `pnpm dev` boots web + BFF; `pnpm build` green in CI.
- Unauth users redirected to login; auth users see role-aware shell.
- `{ currentUser { id email displayName } }` renders in UI via GraphQL client.
- Error/empty/loading states covered; Lighthouse perf ≥ 90 on shell page.
- Tests: one e2e smoke for login + `currentUser`; one unit for auth link.

_Note: Big 4 anchor not found; 3a appended at end to keep SSO (Big 11) unchanged._