# ThrivioHR — End-to-End Development Plan (Keep-Forever Version)

Rule of the road: we do not move to the next step until the previous step's acceptance checks are green and stable. Every task ships with a surgical Agent prompt and a Definition of Done (DoD).

## Big 0 — Operating Principles (how we work)

**Technical:** Single repo (pnpm+Nx+TS), strict linting/format, 100% coverage on core domains, ephemeral DB tests, reproducible prompts.

**Plain English:** We build in tiny, testable slices. Each slice has a checklist. We only proceed when green.

**DoD (global):**
- Lint clean, tests green, build passes, CI passes on PR.
- Docs updated (roadmap + any touched READMEs).
- No "TODO later" debt; if deferred, tracked in /docs/adr or /docs/todo.md.

### Surgical Prompt Template (pinned)
```
Execute this EXACT task. Do not touch anything beyond what's listed.
If any command fails, PRINT the error and STOP. Do not "fix" or scaffold.

GOAL
<1–2 lines>

TOUCH ONLY
<explicit files>

CHANGES
<precise edits or full replacements>

RUN & PRINT
<commands + what to print>

STOP.
```

Multi-tenant, org-isolated by design. Status labels: **DONE**, **IN PROGRESS**, **NEXT**, **PHASE 2**.

## Modules (overview)
Identity & Access · Directory · Org Chart · Profiles & Media · Social Feed · Engagement · Recognition · HR Core · Analytics & Reporting · Integrations & SSO · Leave Management (Phase 2) · Performance Management (Phase 2)

## Big 1 — Infrastructure & Repo **DONE**

### Sub-features
- Monorepo setup, CI scripts, local dev runners, logging scaffolds.
- Environment config, secrets, shared utils.

### DoD
- Repo boots locally with one command; CI green on main.
- Linting/formatting/typecheck enforced in CI.
- Envs documented; logs visible for all services.

## Big 2 — Database & Migrations **DONE**

### Sub-features
- Postgres + Drizzle ORM baseline; migration pipeline.
- Core tables: organizations, users, roles, sessions (baseline).

### DoD
- One-shot migration command sets up a clean DB.
- Roll forward/backward works; schema doc generated.

## Big 3 — Identity & JWT Auth **DONE**

### Sub-features
- Login by org/email; sessions persisted.
- JWT access/refresh; guard-protected routes.
- HS256 signing; 15m access / 7d refresh.

### DoD
- /auth/login, /auth/refresh, /auth/me pass smoke tests.
- Guarded endpoints reject anonymous calls.
- Tokens scoped to org; sessions recorded.

## Big 3a — Web App (Next.js) Foundation **DONE**

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

## Big 3b — SSO (OIDC/SAML) Foundation **NEXT**

### Sub-features
- OIDC (Auth Code + PKCE): provider config (issuer, client, scopes), nonce/state, token exchange → BFF JWT.
- SAML 2.0: IdP metadata upload/URL, ACS endpoint, signature validation, attribute mapping (email/name).
- Multi-tenant: org-scoped IdP configs; per-org login discovery.
- Frontend wiring: Next.js login screen with "Sign in with SSO"; error and fallback paths.
- Session model: refresh/rotation rules, logout, and clock-skew handling.
- E2E smoke: Okta/Auth0/Azure AD dev tenant supported via env-config.

### DoD
- From a clean env: configure one OIDC IdP and complete login → `currentUser` in the web app.
- Optional: configure one SAML IdP and complete login → `currentUser`.
- BFF issues first-party JWT after IdP callback; org scoping enforced (guards + RLS backstop).
- Failure paths covered (invalid metadata, bad signature, expired code).
- Tests: one e2e OIDC login, one unit for SAML assertion validation utility.

### Acceptance Checks (Big 3b - OIDC Foundation)
- ✓ OIDC Authorization Code + PKCE service implemented with openid-client v6.x
- ✓ Unit tests pass for callback parsing and profile extraction
- ✓ Route smoke tests confirm /sso/oidc/start returns 302 to IdP authorize endpoint
- ✓ Login page shows SSO integration with configuration instructions
- ✓ OIDC documentation created for Okta/Auth0 setup
- Pending: Okta e2e flow test (requires OIDC credentials configuration)

## Big 4 — Directory & Org Structure **IN PROGRESS**

### Sub-features
- CSV import pipeline: validate → plan → dry-run → approval session → approve (writes).
- User create/update; department creation via org_units (type department); membership linking via org_membership.
- Location detection/creation via locations (user link planned).
- Manager resolution (by managerEmail) validation (**NEXT**).
- 3 creation paths for departments & locations: Manage screen · Mass upload · Single employee create.

### DoD
- Protected endpoints for validate/plan/commit/session.
- Dry-run returns creates/updates/skips, newDepartments/newLocations, duplicates, manager resolution notes.
- Approve creates/updates users; creates departments; links memberships; creates locations.
- Idempotent on re-approve (no dupes); counters accurate; audit log entry added.

## Big 4b — Org Chart **NEXT**

### Sub-features
- Read-only Org Chart built from org_units + org_membership.
- Search/jump; expand/collapse; lazy rendering for 1k+ users.
- Optional manager overlay (from CSV manager resolution; later users.managerId).
- Filters (department/location); PNG/PDF export.

### DoD
- Loads 1k+ nodes in <2s with virtualization.
- Permissioning: HR full org; managers see their subtree; members see public org view.
- Export works; no PII leaks across orgs.

## Big 5 — Profiles & Media **NEXT**

### Sub-features
- FB-style profile header: avatar + cover.
- Defaults: gender-based avatar; org-themed cover.
- Uploads from device or mobile camera (presigned PUT).
- Private storage; versioned cache-busting; EXIF strip; thumbnails.
- Data model: user_media (one row per user × {avatar|cover}).

### DoD
- New user shows defaults; upload replaces with user media.
- Signed URLs (read/write) expire; originals private; thumbs generated.
- Multi-tenant isolation in object keys; rate limits & size/type caps enforced.

## Big 6 — Social Feed **NEXT**

### Sub-features
- Posts: text, photo, video (single media per post v1).
- Likes & comments; basic moderation (author delete, admin hide/restore).
- In-app notifications for likes/comments; keyset pagination.
- Media storage via presigned URLs; poster image for video.

### DoD
- Create/list/delete post; like/unlike; add/delete comment.
- Media uploads succeed; playback via signed URLs.
- Feed scoped to org; pagination stable; moderation actions audited.

## Big 7 — Engagement **NEXT**

### Sub-features
- Pulses (1–3 Q check-ins) with scheduler & templates.
- Quick polls; instant results.
- Announcements pinned to feed; read receipts.
- Celebrations (birthdays/anniversaries) surfaced in feed/profile badges.

### DoD
- Pulse send/collect; exports; response rate visible.
- Poll create/vote/results; no duplicate votes.
- Announcement reach/ack metrics; celebrations auto-generated.

## Big 8 — Recognition (Peer-to-Peer tied to Company Values) **NEXT**

### Sub-features
- Company-values-tagged kudos (employee → employee).
- Points per kudos; monthly leaderboard.
- Optional manager approval toggle (per org).
- Feed cards for kudos; export/audit.

### DoD
- HR CRUD for Company Values (name/color/weight/order/status).
- Kudos create/list; points ledger updates; leaderboard accurate.
- Approval flow (if enabled) gates visibility.
- Exports available; audit trail complete.

## Big 9 — HR Core **NEXT**

### Sub-features
- Company Values management (feeds Recognition & onboarding).
- Org Settings (media limits, cover theme, approvals).
- Policies/handbook repository (uploads/links).
- Departments/Teams CRUD; Locations CRUD.
- Single employee create (with default avatar/cover, dept, location).
- Audit log for sensitive actions and imports.

### DoD
- Values available system-wide; changes reflected in Recognition UI.
- Settings enforced on uploads; policy docs accessible with permissions.
- Admin can create/edit/delete departments, teams, locations.
- Single create writes user, links department/location, assigns defaults.
- Audits list who/when/what for org-level changes.

## Big 10 — Analytics & Reporting **NEXT**

### Sub-features
- Adoption: profile completion, active users, upload rates.
- Feed: posts/user, comments/post, like rates.
- Engagement: pulse results, eNPS (if enabled), celebrations reach.
- Recognition: kudos volume/spread; value distribution; leaderboards.
- Exports (CSV); org/department/location breakdowns.

### DoD
- Dashboards load under 2s on 12-month windows.
- Key metrics accurate vs sample datasets; CSV export works.
- Access restricted by role; no cross-org leakage.

## Big 11 — Integrations & SSO **NEXT**

### Sub-features
- OIDC + SAML SSO; optional JIT user provision.
- Slack/Teams webhooks for kudos/announcements.
- Pluggable S3-compatible storage.

### DoD
- At least one OIDC & one SAML provider verified.
- Webhook toggle per org; messages post correctly.
- Storage adapter passes upload/download/rotate tests.

## Big 12 — Leave Management **PHASE 2**

### Sub-features (MVP)
- Leave types/policies: accrual, carry-over, proration.
- Balances per user/type; opening balances import.
- Requests/approvals: employee → manager; HR override.
- Holidays by org/location; team calendar; ICS export.
- Blackouts & rules; notifications; full audit; CSV export.

### DoD
- Policy engine passes unit tests for common rules.
- Request → approve/deny lifecycle works; balances adjust; calendar updates.
- Holiday calendars by location; ICS subscribable.
- All actions audited; exports correct.

## Big 13 — Performance Management **PHASE 2**

### Sub-features (MVP)
- Review cycles (e.g., H1/H2); participant scoping; timelines.
- Templates (ratings/rubrics/free-text); per-role variants.
- Self + manager reviews; confidential manager notes.
- Calibration view; lock/freeze; sign-off & PDF record.

### DoD
- Cycle creation & launch works; participants notified.
- Reviewer UIs save/submit; rubric scoring consistent.
- Calibration changes tracked; sign-off locks packets; PDFs generated.
- History retained per employee/cycle.

## Cross-cutting: Locations Linking **NEXT decision**

### Sub-features
- Model: one primary location per user (users.locationId) for v1. (Multi-location via join table in future.)
- CSV approve creates missing locations and links users.

### DoD
- Migration adds users.locationId; approve path links users; UI shows location on profile/org chart.
- Idempotent relinking; permissions enforced.

## Cross-cutting: Manager Resolution (Directory) **NEXT**

### Sub-features
- Resolve managerEmail in CSV to user; detect missing/cyclic relationships.
- (Future) add users.managerId and keep in sync with CSV.

### DoD
- Planner flags unresolved managers & cycles; approve rejects unsafe sets (configurable).
- When enabled, writes users.managerId; org chart overlay shows manager lines.

## KPIs (selected)
- % profiles with custom avatar/cover in 14 days.
- Feed DAU/WAU; posts/user; comments/post; like rate.
- Kudos/month; value distribution; leaderboard participation.
- Pulse response rate; announcement reach; celebrations engagement.
- Import approval throughput; error rates.

## Big 3c — Local Auth & User Management **NEXT**

### Sub-features
- Email/password login endpoints; unique email per org; admin-managed users; CSV import for local users; and security policies.

### DoD
- Smoke tests, Argon2 hashing, uniqueness enforcement, CSV idempotency and an end‑to‑end registration/login test.

## Big X — Admin Platform & Merchant Center **PHASE 2**

### Sub-features
- **Thrivio Control**: client/org creation and admin account management, subscription and entitlement management, credit funding/refunds, feature toggles, provider onboarding and reconciliation, support sessions and audit trail.
- **Merchant Center**: merchant onboarding with KYC/AML, catalog/product management including self‑service creation, order and refund handling, voucher issuance.

### DoD
- Full admin platform functionality with secure access controls, audit trails, and merchant self-service capabilities.

## Notes
- Multi-tenant isolation: all data & storage keys scoped by orgId.
- 3 creation paths for departments/locations: manage screen, CSV, single employee create.
- Media: private storage, presigned URLs, EXIF strip, size/type caps.
- Video: store originals + poster in v1; background transcode later.