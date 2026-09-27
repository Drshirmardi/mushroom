# Implementation Plan: Phase 11 Reporting & Access Control

**Branch**: `codex/phase-11-reporting-access` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

## Summary

Freeze and implement a PostgreSQL-backed reporting slice for the existing NestJS API and Next.js dashboard. The authoritative KPI inventory, reporting contract, scope predicates, and release authorization matrix are established before implementation. The release permits only active `ADMIN` identities to dashboard/admin reporting and support operations; existing patient self-service remains unchanged, while `DOCTOR` and `STAFF` dashboard/admin access is removed. No new role system, membership/invitation, CRM, export, analytics platform, cache, or aggregate is assumed.

## Technical Context

**Language/Version**: TypeScript in the existing pnpm monorepo.

**Primary Dependencies**: Existing NestJS API, Prisma, PostgreSQL, generated OpenAPI client, Next.js dashboard, and Playwright/Vitest test tooling. No dependency addition is planned.

**Storage**: PostgreSQL is the source of truth. Existing `Clinic`, `PatientProfile`, its canonical `User → UserProfile` relation for onboarding name fields, `Appointment`, `PatientAssessmentSubmission`, `TreatmentPlan`, `TreatmentTask`, `Payment`, `Refund`, and `AuditEvent` records are reused. New persistence is conditional on an accepted, measured bottleneck or a required audit field; neither is assumed.

**Testing**: Existing unit/type/lint checks; real PostgreSQL integration and authorization-matrix tests; generated OpenAPI/client freshness when endpoints change; browser E2E for ADMIN allow and PATIENT/DOCTOR/STAFF denial.

**Target Platform**: Existing web dashboard and API deployment.

**Project Type**: Monorepo web application with API and dashboard surfaces.

**Performance Goals**: The initial direct, tenant/clinic-scoped report queries must be bounded by the contract’s date range and list pagination. A query plan and measured reproduction are required before an index or aggregate is accepted; no speculative latency target or infrastructure is introduced.

**Constraints**: UTC persistence; `Asia/Tehran` business reporting calendar; `TOMAN` integer monetary facts; active ADMIN session required; every query has tenant/clinic scope; medical ownership and audit redaction remain enforced server-side.

**Scale/Scope**: One clinic-scoped operational dashboard and report set; one fixed release admin capability; eleven roadmap tasks serialized around contracts, authorization, OpenAPI/client, and any evidence-driven data-path work.

## Constitution Check

| Principle | Plan result |
|---|---|
| I. Scope discipline | PASS — only Phase 11 reporting/access scope; confirmed exclusions are explicit. |
| II. Existing architecture | PASS — reuses existing API, Prisma, dashboard, auth, and audit patterns. |
| III. Phase-driven development | PASS — retains `F11-T01`–`F11-T11`; no task status/claim is created by this plan. |
| V–VI. Risk/testing | PASS — requires real PostgreSQL, authorization matrix, API contract, and browser evidence proportionate to medical/reporting exposure. |
| VIII. Contract/domain integrity | PASS — backend authorization, tenant/clinic predicates, ownership and audit are first-class contract requirements. |
| X. Proportionate SpecKit | PASS — feature artifacts clarify the roadmap without replacing it. |

**Post-design check**: PASS. The design introduces no constitution exception, new architectural service, dependency, warehouse, cache, or aggregate. Any later measured bottleneck is a gated `F11-T05` decision, not an assumed design.

## Design Decisions

1. **Direct scoped reporting first**: Use existing PostgreSQL facts and authorized API contracts. `F11-T05` may add only an evidence-backed index or aggregate with a named owner/freshness rule.
2. **One business calendar**: Convert inclusive local ISO-day filters to `[local midnight, following local midnight)` in `Asia/Tehran`; persist/query timestamps in UTC.
3. **Money is operational, not settlement certification**: Revenue = verified `Payment.commerceAmountToman` minus `Refund.amountToman` whose `status=COMPLETED`, using `verifiedAt` and `completedAt`; it is labelled operational revenue. Sadad acceptance/settlement remains unverified and out of scope.
4. **ADMIN-only release capability**: All dashboard/admin reporting, audit viewer, and support operations are ADMIN-only at backend and UI boundaries. The existing role records are retained for compatibility; no membership or role mutation is in scope.
5. **No implied disclosure/export**: Audit/report payloads are minimum necessary, paginated where lists exist, and unexportable unless a later approved requirement explicitly changes the frozen scope.

## Serialized Batches and Single-Writer Paths

| Sequence | Roadmap tasks | Why serialized / exclusive owner |
|---|---|---|
| 1 | F11-T01 → F11-T02/F11-T03/F11-T04 | KPI and report contract must freeze before reporting/UI work. |
| 2 | F11-T05 | Query/index or aggregate decision follows real report queries and is the sole Prisma/migration owner if evidence requires a change. |
| 3 | F11-T06 → F11-T07 → F11-T09 | Audit-viewer contract and role matrix precede authorization/E2E evidence. |
| 4 | F11-T08, F11-T10 | Exclusion evidence only; may run after their relevant contracts but must not create membership/CRM runtime. |
| 5 | F11-T11 | Evidence/closure only after every prior task review gate. |

Single-writer paths: Prisma schema/migrations, shared authorization policy/guards, OpenAPI/client output, dashboard routing/session gate, and phase status/evidence each have one coordinator-selected writer in the implementation batch. No active batch is claimed by this document.

## Project Structure

```text
apps/api/
├── src/common/auth/                    # existing backend authorization enforcement
├── src/modules/appointments/           # appointment reporting source and admin endpoints
├── src/modules/assessments/            # assessment reporting source and admin endpoints
├── src/modules/clinical/               # treatment/medical ownership source and endpoints
├── src/modules/commerce/reporting/     # existing commerce operational-revenue source
├── src/modules/identity/               # active-session/revocation enforcement
├── prisma/schema.prisma                # only F11-T05 owner may change if proved
└── test/                               # PostgreSQL integration/authorization/contract tests

apps/dashboard/
├── src/auth/                           # dashboard admission/capability UI only
├── src/features/dashboard/             # final Dashboard Home
├── src/features/{patients,assessments,orders,revenue}/
└── src/lib/                            # generated-client/report adapters

packages/api-client/                   # generated only by its assigned endpoint owner
specs/009-reporting-access/             # this feature’s frozen SpecKit artifacts
```

**Structure Decision**: keep reporting in existing domain modules rather than add a cross-cutting analytics service. Contracts define cross-module aggregation and authorization rules; implementation retains existing source ownership.

## Complexity Tracking

No constitution violation or complexity exception exists.
