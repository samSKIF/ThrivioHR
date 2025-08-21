## Overview
This project aims to deliver a robust, scalable, and secure platform for enterprise HR solutions. The core vision is to provide a comprehensive suite of tools, starting with an Employee Directory and persistent navigation, focusing on strong authentication, data security, and a seamless user experience. Key capabilities include a monorepo architecture for efficient development, adherence to strict code quality and performance standards, and a contracts-first approach for API development. The platform is designed for mid-market and enterprise clients, supporting internationalization and accessibility requirements, with a strong emphasis on production readiness and maintainability.

## User Preferences
- This doc is the **contract** the Replit Agent must follow. If any prompt conflicts with this file, **STOP and ask**.
- Prefer small, reversible changes with explicit acceptance checks.
- Do **not** create files with suffixes like `(1)`, `(2)`, `copy`, `- Copy`.
- If a new file is required, list it in the plan **before** writing.
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

## System Architecture
The system employs a monorepo structure managed by `pnpm` and orchestrated by `Nx`, utilizing `TypeScript`. It comprises two main applications: `/apps/web` (Next.js) for the frontend and `/apps/bff` (NestJS GraphQL) as the Backend-for-Frontend. Microservices are located under `/services/*` (NestJS), and shared libraries are in `/packages/*` (including `types`, `config`, `ui`, `contracts`, `testing`).

**Key Architectural Decisions:**
- **Contracts-first Development**: All APIs (OpenAPI for services, GraphQL for BFF, JSON Schemas for events) are defined in `/packages/contracts` first, with generated clients.
- **Authentication & Authorization**: The web application communicates exclusively with the GraphQL BFF. The BFF enforces RBAC/ABAC and entitlements, with services re-checking authorization for defense in depth. Step-up authentication (WebAuthn) is implemented for sensitive operations.
- **Internationalization & Accessibility**: All UI strings use ICU i18n keys, and layouts are RTL-safe with logical CSS properties. WCAG AA contrast and visible keyboard focus are mandated.
- **Logging, Tracing, Errors**: Structured logging (pino) without PII, including `trace_id`, `tenant_id`, and `user_id`. End-to-end tracing is implemented with OpenTelemetry. Typed error classes map to GraphQL codes, never raw strings.
- **Security**: Secrets are sourced only from environment variables or Replit Secrets. All inputs are validated (zod/DTOs), rejecting unknown fields. Data residency is respected.
- **Performance & Pagination**: BFF uses DataLoader to prevent N+1 issues, and services provide batch endpoints. Pagination (cursor/keyset preferred) is required for lists exceeding 100 items. Response size budgets are enforced in BFF, with compression where appropriate.
- **UI/UX Decisions**: The login interface features a modern split-screen design with a clean form and engaging illustration. A token-based theming system with reversible design tokens and utility classes is used. A persistent global header navigation for employee directory and profile links is implemented.
- **Code Quality & Standards**: Strict file and function length limits are enforced via CI. Core services aim for 100% test coverage, while others target ≥ 90%. Conventional Commits, short-lived branches, and `CODEOWNERS` for reviews are standard. PR descriptions must include what/why, affected contracts, test evidence, and rollback plans.
- **Monorepo Structure**: Projects are strictly confined to defined roots (`/apps`, `/services`, `/packages`). Duplicate file basenames in the same folder are prohibited.
- **Temporary/Build Artifacts**: All build outputs and temporary files are git-ignored and automatically cleaned up after tests.

## External Dependencies
- **Next.js**: Frontend web application development.
- **NestJS**: Backend-for-Frontend (BFF) and microservices development.
- **GraphQL**: API layer for BFF.
- **OpenAPI**: API definitions for services.
- **JSON Schemas**: Event definitions.
- **Playwright**: End-to-end testing.
- **k6**: Performance testing.
- **pino**: Structured logging.
- **OpenTelemetry**: End-to-end tracing.
- **zod**: Input validation.
- **DataLoader**: N+1 problem mitigation in GraphQL BFF.
- **openid-client**: OIDC integration for enterprise SSO.
- **Apollo Client**: GraphQL client for the frontend.
- **Nx**: Monorepo orchestration.
- **pnpm**: Package manager.
- **TypeScript**: Primary programming language.