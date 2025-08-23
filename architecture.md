# architecture

## 1) Overview
ThrivioHR is a multi-region, multi-tenant Employee Engagement OS with Recognition + Rewards (monetary points) and an API-ready Marketplace. The platform is AI-first, privacy-first, and enterprise-ready from day one. Frontend = single web app (Workspace + Admin via role-aware nav) + mobile shell; Backend = microservices + GraphQL BFF.

### Core domains / services (logical)
- **identity**: authN (OIDC/SAML SSO), sessions, users
- **directory**: Company→Department→Team org tree, employment timeline; separate Location tree (Country→City→Site)
- **licensing**: plans, entitlements, feature flags per tenant/region
- **recognition**: P2P (monthly by count) & manager recognition; values/categories; moderation; AI assist
- **budgets**: top-down allocations (tenant→dept→team/manager), periods (month/quarter/year), approvals, overage=BLOCK by default
- **ledger**: double-entry accounting, wallets (tenant/department/team/user), PMV per region, FX-at-grant, reversals, liability aging
- **marketplace**: catalog, pricing, vouchers, orders, refunds; provider adapters (empty in MVP but API-ready)
- **notifications**: email/push/in-app, digests
- **insights**: event rules v0 (participation cliff, budget drift, fraud cues) + analytics bridge
- **bff**: GraphQL gateway (authZ/entitlements, stitching, caching)
- **admin surfaces**: Thrivio Control (staff), Admin Console (tenant admins), Merchant Center (sellers); Workspace (employees/managers)

## 2) Regions & residency
- **Pods:** EU (`eu-west-1`), GCC/UAE (`me-central-1`), Morocco via EU South (`eu-south-2`).
- PII **never crosses pods**. Only anonymized, aggregated analytics are shared cross-pod.
- Deployment modes per pod: **SaaS multi-tenant**, **Single-tenant VPC**, **BYOC/on-prem**.

## 3) Tenancy & isolation
- **Tiered data isolation** (paid upgrades):
  - **Pooled**: shared Postgres with `tenant_id` + RLS and per-tenant KMS keys.
  - **Schema-per-tenant**: same cluster, dedicated schema; easier backup/throttle.
  - **DB/VPC-per-tenant**: dedicated Postgres (Aurora/RDS), optional dedicated EKS/VPC (banks).
- **Migration path** exists between tiers with zero-downtime export/import.
- **Entitlements** gate modules (Rewards, Surveys, Missions, SSO/SCIM, White-label tier, Isolation tier).

## 4) Identity & access
- **Login options**: Email+Password (local), SSO (OIDC). Email is **globally unique** (one account → one organisation).
- **First login policy**: Admin/CSV/API-created users must change password on first login. Password policy: min 12 chars, zxcvbn ≥3, deny leaked/common; Argon2id + app pepper.
- **Org scoping**: Derive `org_id` from the user row; no org selector at login.
- **Roles**: Start with single role on `users` {`org_admin`,`employee`} (full RBAC later when needed).
- **SSO**: OIDC + SAML in MVP; **CSV/JIT** provisioning; **SCIM Phase 2**.
- **RBAC roles**: PlatformSuperAdmin (Thrivio staff), TenantSuperAdmin, LocationAdmin, DepartmentAdmin, DeptInCountryAdmin, Manager, Employee. **Finance** is a capability toggle assignable by TenantSuperAdmin.
- **Scope model**: RoleBinding with **org scopes** (Company/Department/Team) ∩ **location scopes** (Country/City/Site).
- **Policy engine**: ABAC on top of RBAC (Cerbos/OpenFGA). Deny by default.
- **Support access**: Staff cannot log into client apps. Only **time-boxed "View/Act as"** via Thrivio Control with **client approval**, WebAuthn, IP allowlist, full audit. Finance actions always blocked.

## 5) Org & location models
- **Org tree**: Company → Department → Team → Individual. One **primary Team** per user. Effective-dated **employment events** (hire, transfer, manager change, title, termination/re-hire).
- **Location tree**: Country → City → Site/Store. Separate from org; used for permissions, budgets, analytics.
- Managers see their **org subtree** (N+ levels), limited by RoleBinding scopes.

## 6) Budgets & allowances
- **Top-down allocations**: Tenant funds wallet → allocate Department (optionally by country) → allocate Team/Manager.
- **Periods**: month/quarter/year. **Default** = monthly; **carryover OFF**; **overage BLOCK** (manager can request top-up).
- **P2P**: monthly **by count** (e.g., 3 recognitions). **Fixed point tiers** per region; AI suggests tier; employee confirms. No P2P overage.
- All changes versioned; proration when changing mid-cycle.

## 7) Ledger & FX (audit-grade)
- **Double-entry ledger**; wallets at Tenant, Department, Team/Manager, User with immutable audit trail.
- **PMV per region** (point monetary value). **FX locked at grant**.
- **Cross-country recognition**: **monetary invariant at grant** → convert giver currency→recipient currency using FX and PMV; inter-region clearing accounts.
- **Controls**: idempotent writes, ordered processing (SQS FIFO key by account), reversals, liability aging, breakage reporting.

## 8) Recognition & Rewards
- Recognition works **with or without** Rewards.
  - **Rewards OFF**: non-monetary recognitions; no ledger writes; **Shop hidden**.
  - **Rewards ON**: wallets/budgets/Shop visible; recognitions hit ledger; marketplace enabled.
- **No backfill** on activation (clean accounting).
- **Moderation**: blocklist, simple toxicity; tenant policy driven.

## 9) Marketplace
- **Entities**: Products, Catalogs (per region), Providers/Adapters, Orders, Redemptions, Refunds, Fraud Flags.
- **Adapters**: provider-agnostic interface for gift cards/experiences; idempotent webhooks; retry & reconciliation jobs.
- **Payments**: points-only in MVP; **PaymentServiceAdapter** designed for split-pay later (authorize/capture/refund/void + 3DS hooks).
- **Merchant Center**: seller onboarding, catalog mgmt, order SLAs.
- **Abuse**: velocity limits, IP/device checks, manual review queue.

## 10) Integrations & automation
- **Slack app** and **Microsoft Teams bot**: `/recognize` modal, message actions, P2P limits shown, AI suggestions.
- **Zapier, Make, Power Automate** apps (MVP): triggers (`recognition.created`, `order.fulfilled`, `employee.added`, …) and actions.
- **Public OAuth2 API** + **HMAC webhooks**; per-tenant scopes; audit of token usage.

## 11) Analytics & AI
- **Telemetry**: OpenTelemetry everywhere. Events fan-out to S3 (raw).
- **Warehouse/Query**: ClickHouse (per region) + dbt models.
- **Insights Service v0**: rules-based nudges (participation cliffs, budget drift, fraud cues, streak breaks, absence patterns, login anomalies). Outputs digests to managers/HR.
- **AI Adapter**: provider-neutral; MVP uses OSS (Ollama + heuristics) for post writing help, value classification, tier suggestion; Phase 2 can route to Bedrock/Azure/OpenAI. PII redaction before external calls.

## 12) BFF & Web
- **GraphQL BFF**: single endpoint for web/mobile; handles authZ + entitlements and shapes responses. DataLoader to avoid N+1; per-tenant caching rules; response size budgets.
- **Web app**: **one** Next.js app for employees and admins; **role-aware nav** builds from server-side `NavConfig`. Step-up auth for risky actions. L3 white-labeling (design tokens, fonts, per-country sub-theme).
- **Mobile**: Expo shell for recognition, wallet, shop v1.

## 13) Reliability & security
- **SLO tiers**: A (99.9%, RPO≤5m, RTO≤60m), B (99.95%, RPO≤1m, RTO≤15m), C (99.99%, cross-region DR; single-tenant/BYOC only).
- **Secrets & crypto**: KMS, Secrets Manager; per-tenant DEKs; mTLS service-to-service; WAF; rate limits.
- **GDPR/DSR**: Privacy Center for user export & deletion requests (admin review, legal holds, retention policies).

## 14) Dev, CI/CD, environments
- **Dev**: Replit with **Neon Postgres** + **ClickHouse Cloud**; Drizzle migrations; seed scripts; adapters for S3/EventBridge/SQS (dev uses in-memory or local mocks).
- **CI/CD**: Nx affected graph; Jest/Playwright/k6; SBOM & image signing; Trivy/Snyk scans; coverage gates (100% core, 90% others); pre-commit hooks; Conventional Commits.
- **Previews** per PR; Staging & Prod per region when we deploy to AWS.

## 15) Messaging & async
- **Transactional Outbox** per service.
- **AWS-native first**: EventBridge (pub/sub business events) + SQS/SQS-FIFO (work queues & ordered domains like ledger/budgets).
- **MessageBusAdapter** allows swap-in **Kafka/MSK** for BYOC/banks or analytics streams.

## 16) i18n & branding
- Locales in MVP: **en, fr, es, de, it, nl, ar (RTL)**. ICU messages; lazy-loaded packs; tenant default + user override.
- L3 white-labeling: logo, colors, fonts, design tokens; custom domain; branded emails/exports; optional per-country sub-branding.

## 17) Admin surfaces
- **Thrivio Control** (staff): client creation, subscription management, credit allocation/refunds, feature toggles, marketplace provider onboarding, catalog/product management, order handling, vouchers, refunds and SLAs, entitlements, wallet funding/refunds (FinanceOps), KYC/AML, recon, support sessions, audit.
- **Admin Console** (tenant): people/org/location, budgets, values/categories, recognition policies, branding, SSO, integrations, analytics, Rewards setup.
- **Workspace** (employee/manager): feed, recognition, missions (light), awards/wallet/shop (if Rewards ON), insights, org chart.
- **Merchant Center** (sellers): merchant onboarding with KYC/AML, catalog/product management including self‑service creation, order and refund handling, voucher issuance, catalog, orders, vouchers, SLAs.

## 18) Organisation Social Presence
- Org fields: `website_url`, `instagram_url`, `x_url` (normalize `twitter.com` → `x.com`), `linkedin_url` (company page only).
- Employee profile: `linkedin_url` on user profile.
- **URL-only**, `https://` required. Normalization and domain allow-lists enforced in BFF. Events emitted on change.

## 19) Bulk User Import & Domain Mismatch
- Two-step flow for CSV and API:
  1) **Validate** (no write): parse file/payload, check global email uniqueness, seat check (warn by default), **domain mismatches** vs `organization_domains`, duplicates.
  2) **Commit**: requires a **batch-level decision**: `acceptMismatches=true` to proceed; else 409 with preview summary.
- Persist an `import_jobs` record for audit; emit events (`user_bulk_preview`, `user_bulk_committed`, `domain_mismatch_accepted`).

## 20) User Profile & Completion
- PII in `user_profiles`: phone (E.164), birth date, home address (json), emergency contact (name/phone/relation), avatar, cover, interests (json), LinkedIn.
- **Profile completion**: server computes via rubric; cache % in profile; checklist UI in `/me`.

## 21) Tracking & Insights (Seed)
- Minimal `events` stream in OLTP (auth/admin/profile/import events). Warehouse/AI later.

## 22) Tenancy (Confirmed)
- Pooled Postgres today; every tenant row has `org_id`. Service-enforced scoping; DB RLS to roll out later.
- Upgrade paths: schema-per-tenant / DB-per-tenant for high-isolation customers.

## 23) Non-goals in MVP (explicit)
- Split-pay (cards) — adapter designed, not enabled.
- Full surveys engine (pulses/eNPS template only).
- Deep "Performance/Competencies" — planned for Phase 3 with HR module.
- Kafka everywhere — only via adapter if mandated.