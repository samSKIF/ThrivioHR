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