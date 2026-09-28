# Tasks: Phase 11 Reporting & Access Control

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), and [contracts](contracts/).

**Status**: Planning only. These are future implementation tasks mapped to the authoritative roadmap; none is claimed or started by this artifact.

## Phase 1: Reporting Contract Foundation

**Goal**: Freeze the KPI lineage contract before any reporting/UI change.

- [ ] T001 [US1] Implement roadmap F11-T01 by preserving the approved KPI/widget inventory in [contracts/kpi-inventory.md](contracts/kpi-inventory.md) and adding its owned response metadata only in `apps/api/src/modules/patients/admin/admin-patients.dto.ts`, `apps/api/src/modules/appointments/admin-appointments.dto.ts`, `apps/api/src/modules/assessments/admin/admin-assessment-submissions.dto.ts`, `apps/api/src/modules/clinical/treatment-plan-response.dto.ts`, `apps/api/src/modules/clinical/treatment-activity-response.dto.ts`, and `apps/api/src/modules/commerce/reporting/commerce-revenue.dto.ts`; verify every released widget has formula, owner, source, scope, timezone, zero/partial/stale rule and no mock source.

**Checkpoint**: T001 is the reporting contract baseline for F11-T02 through F11-T04.

## Phase 2: Trustworthy Reporting (User Story 1, P1)

**Goal**: Deliver bounded, real-source appointment, patient, assessment, treatment, and commerce reports.

- [ ] T002 [US1] Implement roadmap F11-T02 by adding clinic-scoped reporting reads to the existing domain owners: appointments in `apps/api/src/modules/appointments/admin-appointments.controller.ts`, `apps/api/src/modules/appointments/admin-appointments.service.ts`, and `apps/api/src/modules/appointments/admin-appointments.dto.ts`; patients in `apps/api/src/modules/patients/admin/admin-patients.controller.ts`, `apps/api/src/modules/patients/admin/admin-patients.service.ts`, and `apps/api/src/modules/patients/admin/admin-patients.dto.ts`; assessments in `apps/api/src/modules/assessments/admin/admin-assessment-submissions.controller.ts`, `apps/api/src/modules/assessments/admin/admin-assessment-submissions.service.ts`, and `apps/api/src/modules/assessments/admin/admin-assessment-submissions.dto.ts`; and treatments in `apps/api/src/modules/clinical/admin-treatment-plans.controller.ts`, `apps/api/src/modules/clinical/admin-treatment-tasks.controller.ts`, `apps/api/src/modules/clinical/treatment-plan.service.ts`, `apps/api/src/modules/clinical/treatment-activity.service.ts`, `apps/api/src/modules/clinical/treatment-plan-response.dto.ts`, and `apps/api/src/modules/clinical/treatment-activity-response.dto.ts`; add PostgreSQL integration coverage in `apps/api/test/reporting.integration.spec.ts` and verify every KPI-01–16 formula, Tehran period boundary, pagination, empty/zero/partial/stale/error states, and medical-data minimization without creating a central reporting module.
- [ ] T003 [US1] Implement roadmap F11-T03 by reconciling the existing commerce revenue route in `apps/api/src/modules/commerce/reporting/commerce-revenue.service.ts` and `apps/dashboard/src/features/revenue/` with [contracts/kpi-inventory.md](contracts/kpi-inventory.md); verify verified-payment minus completed-refund operational TOMAN revenue, no callback/attempt/unpaid-order inclusion, and no production-verified Sadad/settlement claim.
- [ ] T004 [US1] Implement roadmap F11-T04 by replacing Dashboard Home’s in-scope reporting widgets in `apps/dashboard/src/features/dashboard/dashboard-page.tsx` and `apps/dashboard/src/lib/` with ADMIN-authorized real report data; verify final inventory-only widgets and explicit loading/error/empty/zero/partial/stale states without a mock/fallback value.
- [ ] T005 [US1] Implement roadmap F11-T05 by capturing scoped report-query plans in `apps/api/test/reporting-query-plan.integration.spec.ts` and documenting evidence in `plan/logs/phase-11.md`; only if a measured bottleneck is reproduced, have the single schema owner add the smallest justified index/aggregate in `apps/api/prisma/schema.prisma` and an additive migration, then verify `EXPLAIN (ANALYZE, BUFFERS)`, replay, freshness, and ownership.

**Independent test**: An active ADMIN can select a valid permitted clinic and Tehran date range, reproduce aggregate values from real PostgreSQL records, and never receive a synthetic substitute.

## Phase 3: Safe Support and Access (User Stories 2–3, P1/P2)

**Goal**: Deliver redacted support inspection and prove backend-enforced ADMIN-only access.

- [ ] T006 [US3] Implement roadmap F11-T06 by delivering the minimum-necessary audit viewer in `apps/api/src/modules/identity/audit/` and `apps/dashboard/src/features/audit/` according to [contracts/audit-viewer.md](contracts/audit-viewer.md); verify authorization-before-filtering, cursor pagination, redaction, no raw metadata/export, and sensitive-access audit behavior.
- [ ] T007 [US2] Implement roadmap F11-T07 by freezing ADMIN-only dashboard/admin admission and the backend authorization matrix in `apps/api/src/common/auth/authorization.policy.ts` and `apps/api/src/common/auth/authorization.guard.ts`; verify ADMIN allow plus PATIENT/DOCTOR/STAFF deny, active-session, tenant/clinic, and medical-ownership controls against [contracts/authorization-matrix.md](contracts/authorization-matrix.md).
- [ ] T008 [US2] Implement roadmap F11-T08 by recording and proving the confirmed exclusion of staff membership/invitation in `apps/api/test/phase-11-exclusions.spec.ts`, `apps/dashboard/src/auth/session.test.ts`, and `plan/logs/phase-11.md`; verify no invitation/membership mutation, capability menu, endpoint, schema change, or export is introduced and STAFF remains denied.
- [ ] T009 [US2] Implement roadmap F11-T09 by adding backend authorization-matrix coverage in `apps/api/test/reporting-authorization.integration.spec.ts` and browser role E2E in `apps/dashboard/e2e/phase-11-access.spec.ts`; verify ADMIN allow; PATIENT/DOCTOR/STAFF deny; disabled/revoked ADMIN deny; tenant/clinic isolation; medical ownership; API/UI/no-export non-disclosure.

**Independent test**: The same protected route is permitted for an active scoped ADMIN and produces no protected response for every denied identity/scope case.

## Phase 4: Operational Customer CRM and Closure

**Goal**: Deliver the owner-approved operational store-customer CRM within the existing commerce domain, then complete evidence only after all preceding review gates pass.

- [ ] T010 [US4] Implement roadmap F11-T10 by adding the read-only, clinic-scoped operational customer CRM in the existing `apps/api/src/modules/commerce/reporting/` domain, its controller/DTO/service and single existing commerce-module wiring path, focused disposable-PostgreSQL integration test, generated `packages/api-client/{openapi.json,src/schema.generated.ts}`, `apps/dashboard/src/lib/commerce-customer-crm-api.{ts,spec.ts}`, `apps/dashboard/src/features/store-crm/`, the CRM case in `apps/dashboard/e2e/phase-11-access.spec.ts`, and the minimum `apps/dashboard/vitest.config.mts` collection boundary. Verify [customer-crm-api.md](contracts/customer-crm-api.md): pre-existing ADMIN `ClinicalClinicAccess` clinic allow; all denied roles/session/foreign-clinic cases; canonical non-medical projection; payment/refund math and segment boundaries; validated page/search/filter/sort; per-disclosed-patient audit; no CRM persistence/export/marketing actions; OpenAPI/client freshness; ordinary Vitest and independent Playwright pass. Do not modify `apps/dashboard/src/features/store-marketing/`.
- [ ] T011 [US3] Implement roadmap F11-T11 by running and recording final Phase 11 evidence in `plan/logs/phase-11.md`, synchronizing `plan/phases/11-REPORTING-ACCESS.md` and `plan/STATUS.md` only after review, and preserving `specs/009-reporting-access/`; verify all task-level checks, OpenAPI/client freshness where changed, clean migration smoke if applicable, no mock inventory widgets, full authorization matrix, browser E2E, and closure gate.

## Dependencies & Execution Order

`F11-T01 → F11-T02/F11-T03/F11-T04 → F11-T05 → F11-T06 → F11-T07 → F11-T09 → F11-T10 → F11-T11`

`F11-T08` depends on `F11-T07` only to prove the ADMIN-only/STAFF-deny boundary. `F11-T10` depends on `F11-T07` and `F11-T09`: it consumes frozen ADMIN/session enforcement and the completed browser/access isolation baseline before adding a new protected commerce route. T011 depends on every prior task passing review.

## Single-Writer and Parallel Rules

- T005 exclusively owns `apps/api/prisma/schema.prisma`, migrations, and query-plan evidence if a measured bottleneck requires a data-path change.
- T007 exclusively owns shared authorization policy/guard. T009 consumes the frozen policy and owns matrix tests/E2E only.
- The endpoint owner of T002/T003/T010 exclusively owns OpenAPI/client generation for its changed route; generated output is never manually edited.
- T004 and T006 may be parallel only after T001 and their route contracts are frozen, with separate dashboard paths. DB-integrated suites serialize unless disposable databases are isolated.
- T010 exclusively owns its commerce CRM endpoint/module wiring, CRM adapter/page, audit use in that endpoint, API-client generation, and the minimal Vitest E2E exclusion. It must not alter marketing, shared auth, schema/migrations, or infrastructure.

## Verification Baseline

Every implementation task must run its targeted type/lint checks and real PostgreSQL tests. T002/T003/T006/T010 require contract freshness when their endpoint changes. T009 is the initial browser/access baseline; T010 must re-run the phase browser suite after CRM integration. T011 is the only closure/evidence task; it must not mark any roadmap checkbox complete until coordinator review succeeds.

## Traceability

| Roadmap task | Spec requirements | Future task | Primary artifacts |
|---|---|---|---|
| F11-T01 | FR-001–007 | T001 | `contracts/kpi-inventory.md` |
| F11-T02 | FR-008–014 | T002 | `contracts/reporting-api.md` |
| F11-T03 | FR-005–006 | T003 | `research.md`, KPI inventory |
| F11-T04 | FR-002–003, FR-012–013 | T004 | dashboard contract/inventory |
| F11-T05 | FR-015 | T005 | `research.md`, `quickstart.md` |
| F11-T06 | FR-020–021 | T006 | `contracts/audit-viewer.md` |
| F11-T07 | FR-016–019 | T007 | `contracts/authorization-matrix.md` |
| F11-T08 | FR-024–025 | T008 | `contracts/conditional-exclusions.md` |
| F11-T09 | FR-017–022 | T009 | authorization contract, quickstart |
| F11-T10 | FR-023, FR-027–033, SC-008–010 | T010 | `contracts/customer-crm-api.md`, authorization matrix, conditional exclusions, quickstart |
| F11-T11 | FR-025–026 | T011 | formal reviewer gate/evidence |
