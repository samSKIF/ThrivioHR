# guardrails
## Do
- Keep **Org** (Company→Department→Team) and **Location** (Country→City→Site) as separate trees; scope = intersection.
- Enforce RBAC + ABAC in **BFF** and **services**; deny by default.
- Contracts-first: OpenAPI (services), GraphQL schema (BFF), JSON Schemas (events). Backward-compatibility checks in CI.
- Money flows use **idempotency**, **transactional outbox**, and ordered consumers (FIFO keying).
- Recognition works without Rewards; Rewards toggled by Entitlements. **No backfill** when enabling Rewards.
- Build adapters for MessageBus, DB, BlobStore, AI, Payments, Provider connectors.
- Use structured logs with trace IDs; no PII in logs. Add audit events for all admin actions and money movements.

## Do NOT
- Commit large binaries or generated artifacts.
- Create duplicates (e.g., files ending with "(1)", "copy", "- Copy").
- Cross-import between services; only use `/packages/*` and generated clients.
- Bypass BFF authZ from web or call services directly from the browser.
- Store secrets in code; use env + Replit secrets only.

## Security hard rules
- Thrivio staff never log into client apps. Support is time-boxed "View/Act as" from **Thrivio Control**, requires **client SuperUser approval**, WebAuthn step-up, IP allowlist, and is fully audited.
- WebAuthn step-up for PMV changes, wallet funding, refunds, and support impersonation.
- PII redaction before any external LLM calls; do not train external models on customer data.