# review-checklist
Use this checklist **before approving any PR**. If any item doesn’t apply, mark **N/A** and say why in the PR.

## 1) Contracts & Schemas
- [ ] **OpenAPI/GraphQL/event schemas** updated in `/packages/contracts` first.
- [ ] **Generated clients** refreshed and committed (web, BFF, services).
- [ ] **Compat checks** pass: no breaking GraphQL or REST changes without a version bump.
- [ ] **Event schemas** are backward-compatible; consumers tolerate unknown fields.
- [ ] **Types** in `/packages/types` reflect the contracts (no drift).

## 2) Security & Privacy
- [ ] **AuthZ** enforced in **BFF** and **service** (defense in depth); deny by default.
- [ ] **Entitlements** checked for module/feature gates (e.g., Rewards OFF).
- [ ] **PII** not logged; structured logs only (include `trace_id`, `tenant_id`, `user_id` where available).
- [ ] **Secrets** come from env/Replit secrets; none committed.
- [ ] **Step-up auth** for risky ops wired (funding, refunds, PMV changes, support impersonation) where relevant.
- [ ] **Data residency** respected (no cross-pod PII); aggregation only across regions.
- [ ] **Threat model deltas** considered for money/ledger paths.

## 3) Idempotency & Reliability
- [ ] All mutating endpoints accept **idempotency keys** and are safe to retry.
- [ ] **Transactional Outbox** used for side-effecting events; consumers idempotent.
- [ ] **Ordering** guaranteed where needed (e.g., ledger/budgets via FIFO key).
- [ ] **Error handling** uses typed errors; no raw string throws.

## 4) Testing (gates)
- [ ] **Unit/integration tests** updated and green.
- [ ] **Coverage**: identity, ledger, recognition **100%** statements/branches; others **≥ 90%**.
- [ ] **Playwright** E2E smoke for affected flows (login, P2P, manager grant, where relevant).
- [ ] **k6** perf smoke on critical paths if touched (ledger write, order flow) with no p95 regression.
- [ ] Tests deterministic (no network to real providers; adapters mocked).

## 5) i18n & Accessibility
- [ ] All new UI strings use **i18n keys** (ICU); no hardcoded sentences.
- [ ] **RTL** verified for Arabic views (logical CSS properties used).
- [ ] **A11y**: keyboard reachable, visible focus, labels/roles present, WCAG **AA** contrast.

## 6) Code Quality & Limits
- [ ] ESLint/Prettier/TS strict pass; no `any` without justification.
- [ ] File/function size limits respected (src file ≤ **40 KB** hard; function ≤ **100** lines hard).
- [ ] No duplicates (`(1)`, `(2)`, `copy`, `- Copy`).
- [ ] Pagination on lists > 100 items; avoid N+1 (BFF DataLoader or batch endpoints).

## 7) Data & Migrations
- [ ] **Drizzle** migrations present, idempotent, and reversible; seed updated if needed.
- [ ] Forward & backward compatible migrations (zero-downtime friendly).
- [ ] Data backfills gated behind jobs/feature flags; retries safe.

## 8) Observability & Ops
- [ ] **OTel tracing** spans added for new flows; `trace_id` propagated.
- [ ] Logs at appropriate levels; no sensitive data.
- [ ] Alarms/dashboards updated if SLO-impacting code paths changed.
- [ ] Temporary files cleaned (`pnpm clean`); no build artifacts in git.

## 9) Docs & Change Management
- [ ] **ADR** added/updated for significant decisions.
- [ ] **README/replit.md** snippets updated if commands or rules changed.
- [ ] **Runbooks** touched if operational behavior changed.
- [ ] PR description includes: what/why, affected contracts, test evidence, rollback plan.

---

### Quick PR template (paste into your PR)
- **What changed / Why**:
- **Contracts touched**: (GraphQL/REST/events) — regen done? compat check?
- **Testing evidence**: unit/integration/E2E summaries; coverage %; k6 results
- **Security/Privacy**: authZ points, entitlements, PII/logging notes
- **Migrations**: forward/backward strategy; seed changes
- **Risk / Rollback plan**:
