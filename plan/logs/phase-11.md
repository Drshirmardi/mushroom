# Phase 11 Evidence

## F11-T10 — clinic-scoped operational store customer CRM

Task ID: F11-T10
Completed at: 2026-09-28 23:16 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B10
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/commerce/reporting/{admin-commerce-customer-crm.controller,commerce-customer-crm.dto,commerce-customer-crm.service}.ts`
  - `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts`
  - `apps/api/test/commerce-customer-crm.integration.spec.ts`
  - `packages/api-client/{openapi.json,src/schema.generated.ts}`
  - `apps/dashboard/src/lib/commerce-customer-crm-api.{ts,spec.ts}`
  - `apps/dashboard/src/features/store-crm/store-crm-page.tsx`
  - `apps/dashboard/e2e/phase-11-access.spec.ts`
  - `apps/dashboard/vitest.config.mts`
  - approved Phase 11 SpecKit change-control artifacts and coordinator-only phase/status evidence files
Migrations:
  - none — CRM is a read-only calculation over canonical records; no table, copied CRM record, retention policy,
    aggregate, schema, or migration was created.
Tests run:
  - migrated-and-seeded disposable PostgreSQL: `vitest run test/commerce-customer-crm.integration.spec.ts --no-file-parallelism`
    → PASS (1 file, 2 tests). The database was dropped in teardown. It covers canonical payment/refund arithmetic,
    POTENTIAL/ONE_TIME/RETURNING/VIP boundaries, top-product/last-purchase facts, bounded pagination/search/filter/sort,
    invalid query rejection, clinic denial, non-ADMIN/disabled/revoked/expired/unassigned session denial, and per-row
    redacted audit provenance.
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS.
  - `tsc -p apps/api/tsconfig.test.json --noEmit` → PASS.
  - `pnpm --filter @sabz-zendegi/api-client build` → PASS; checked generated OpenAPI/client output is fresh.
  - `pnpm --filter @sabz/dashboard typecheck` → PASS.
  - `pnpm --filter @sabz/dashboard test` → PASS (18 files, 61 tests); `e2e/**` is excluded from Vitest collection only.
  - `playwright test --config=playwright.phase11.config.ts` → PASS (7/7), including the real CRM route contract,
    no marketing/export controls, and the pre-existing ADMIN/session direct-navigation denials.
  - `git diff --check` → PASS.
Result:
  - `GET /v1/admin/commerce/customers` is an ADMIN-only commerce-domain API requiring a valid persisted session and
    explicit active-clinic `ClinicalClinicAccess`. Every data CTE is clinic-scoped; no caller-provided foreign scope,
    medical field, raw audit metadata, token, or payload is returned or recorded.
  - The dashboard CRM is connected to that API and has loading, empty, error, forbidden, filtering, sorting, and
    pagination states with no mock data or inert customer/marketing/export actions.
  - The release's canonical clinic model permits one active clinic; a syntactically valid inactive foreign clinic ID
    is denied before any row or derived summary disclosure. This preserves the same cross-clinic boundary without
    inventing a second active clinic.
Review:
  - PASS — all changes are within F11-T10-owned paths. `ClinicalClinicAccess` is read only; shared authorization,
    Prisma schema/migrations, dependency/lockfile, marketing, and every later task remain untouched.
Next eligible task:
  - `F11-T11` is eligible and unclaimed. Do not start it in this task.

## F11-T09 — authorization matrix and browser E2E

Task ID: F11-T09
Completed at: 2026-09-28 18:16 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B09
Reviewed by: Codex /root
Changed files:
  - `apps/api/test/reporting-authorization.integration.spec.ts`
  - `apps/dashboard/e2e/phase-11-access.spec.ts`
  - `playwright.phase11.config.ts`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none — this task adds verification only and leaves the canonical `User`, `Session`, clinic, clinical-audit,
    reporting, authorization, OpenAPI/client, schema, dependency, and runtime paths unchanged.
Tests run:
  - `vitest run test/reporting-authorization.integration.spec.ts --no-file-parallelism --reporter=dot` → PASS
    (1 file, 4 tests) on a migrated-and-seeded, run-owned PostgreSQL database dropped in teardown.
  - `vitest run test/reporting.integration.spec.ts test/audit-viewer.integration.spec.ts --no-file-parallelism` →
    PASS (2 files, 4 tests) on migrated-and-seeded, run-owned PostgreSQL databases dropped in teardown.
  - `tsc -p apps/api/tsconfig.test.json --noEmit` → PASS.
  - `pnpm typecheck` → PASS (all workspace typechecks; Prisma generation and API-client OpenAPI freshness checks
    report no generated-contract drift).
  - `playwright test --config=playwright.phase11.config.ts` → PASS (6/6): ADMIN allow; PATIENT, DOCTOR, STAFF,
    disabled ADMIN, and revoked ADMIN direct-route denial.
  - `git diff --check` → PASS.
Result:
  - The disposable backend matrix proves the frozen ADMIN-only policy for all four domain reports, operational
    revenue, and the redacted audit viewer. PATIENT, DOCTOR, and STAFF receive `403` before data disclosure;
    disabled and revoked ADMIN sessions receive `401`; no report/audit export route exists.
  - ADMIN can read only the active clinic-scoped reporting/audit paths. A foreign inactive clinic cannot be queried,
    and a foreign patient's clinical workspace remains denied by its separate medical-ownership permission; neither
    response exposes the fixture's private medical text or patient identity.
  - The browser suite checks direct dashboard navigation rather than menu visibility: only a refreshed ADMIN session
    renders protected dashboard UI; all denied identities redirect before it and make no admin request. It asserts no
    bearer token in a URL and no report/audit export UI or request.
Review:
  - PASS — the combined diff contains only T09-owned test/E2E harness paths and the required coordinator evidence.
    No shared auth policy, runtime route, dashboard session code, schema/migration, dependency/lockfile, generated
    output, staff membership/invitation, CRM/segmentation, or F11-T10/F11-T11 work changed. No blocker remains.
Next eligible task:
  - `F11-T10` is eligible and unclaimed; stop before starting it.

## F11-T08 — staff membership/invitation exclusion proof

Task ID: F11-T08
Completed at: 2026-09-28 17:26 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B08
Reviewed by: Codex /root
Changed files:
  - `apps/api/test/phase-11-exclusions.spec.ts`
  - `apps/dashboard/src/auth/session.test.ts`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none — this task proves the frozen conditional exclusion and does not create a membership, invitation, role,
    route, export, schema, dependency, OpenAPI, or generated-client surface.
Tests run:
  - `pnpm typecheck` → PASS (all workspace typechecks, including API-client OpenAPI generation freshness check).
  - `tsc -p apps/api/tsconfig.test.json --noEmit` → PASS.
  - `vitest run test/phase-11-exclusions.spec.ts test/authorization.guard.spec.ts test/release-admin-session.guard.spec.ts --no-file-parallelism` →
    PASS (3 files, 25 tests).
  - `pnpm --filter @sabz/dashboard test -- session.test.ts` → PASS (17 files, 59 tests).
  - `vitest run test/reporting.integration.spec.ts test/audit-viewer.integration.spec.ts --no-file-parallelism` →
    PASS (2 files, 4 tests) on migrated-and-seeded, run-owned PostgreSQL databases dropped in teardown.
  - `git diff --check` → PASS.
Result:
  - The API/dashboard source trees, canonical Prisma schema, migration names, and checked-in OpenAPI paths contain
    no staff membership/invitation runtime surface. The release has no role builder or capability menu, and the
    protected reporting/audit OpenAPI paths expose no export route.
  - Dashboard session refresh receiving a `STAFF` authentication response returns `forbidden`, clears the
    authentication snapshot, and retains no bearer token. Existing backend policy and persisted release-session
    guard tests remain green, so menu absence is not relied on as authorization.
  - Disposable reporting/audit regression preserved ADMIN-only admission before protected disclosure plus existing
    clinic scoping, audit redaction, and disabled/revoked-session denial. No runtime, schema, migration, dependency,
    generated artifact, or later-task path changed.
Review:
  - PASS — T08 is confined to its frozen proof/evidence paths. The final full authorization matrix and browser E2E
    remain owned by F11-T09; CRM/segmentation remains owned by F11-T10. No blocker remains for this task.
Next eligible tasks:
  - `F11-T09` and `F11-T10` are eligible and unclaimed; stop before starting either task.

## F11-T07 — ADMIN-only release admission and live session authorization

Task ID: F11-T07
Completed at: 2026-09-28 17:14 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B07
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/common/auth/{authorization.policy,authorization.guard,release-admin-session.guard,auth.module}.ts`
  - `apps/api/test/{authorization.guard,release-admin-session.guard}.spec.ts`
  - `apps/api/test/{reporting,commerce-revenue}.integration.spec.ts` (persisted active ADMIN fixtures for the shared guard)
  - `apps/dashboard/src/auth/{session,session.test}.ts`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none — the existing `User.status`, `Session.revokedAt`, `Session.expiresAt`, and user/session ownership relation
    are the canonical active-session source; no schema, dependency, or generated-client change is required.
Tests run:
  - `pnpm typecheck` → PASS (all workspace typechecks, including API-client generation freshness check).
  - `tsc -p apps/api/tsconfig.test.json --noEmit` → PASS.
  - `pnpm --filter @sabz/dashboard test -- session.test.ts` → PASS (17 files, 58 tests).
  - `vitest run test/authorization.guard.spec.ts test/release-admin-session.guard.spec.ts --no-file-parallelism` →
    PASS (2 files, 22 tests).
  - `vitest run test/reporting.integration.spec.ts test/audit-viewer.integration.spec.ts --no-file-parallelism` →
    PASS (2 files, 4 tests) on migrated-and-seeded, run-owned PostgreSQL databases dropped in teardown.
  - `vitest run test/commerce-revenue.integration.spec.ts --no-file-parallelism` → PASS (1 file, 2 tests).
  - `git diff --check` → PASS.
Result:
  - `ADMIN` is the sole release dashboard role at both boundaries: API policy gives `DASHBOARD_ACCESS` only to
    `ADMIN`, and dashboard refresh rejects `PATIENT`, `DOCTOR`, and `STAFF` before rendering dashboard content.
  - `ReleaseAdminSessionGuard` runs between JWT verification and authorization. It looks up the canonical persisted
    session by `sessionId` plus `userId`, requires `revokedAt=null`, a future `expiresAt`, and `User.status=ACTIVE`,
    and returns `401` before a controller can disclose data when that check fails.
  - The existing scoped report and audit services remain unchanged. Disposable API integration re-proved clinic
    scoping/redaction and ADMIN allow; PATIENT/DOCTOR/STAFF denial and revoked/disabled ADMIN denial occur before
    protected disclosure. Existing medical ownership controls remain domain-owned and unchanged.
Review:
  - PASS — scope is confined to T07 shared authorization/admission paths, their necessary persisted-session fixtures,
    and coordinator evidence/status. The final comprehensive matrix and browser E2E stay exclusively with F11-T09;
    staff membership/invitation remains excluded for F11-T08; CRM remains excluded for F11-T10.
Next eligible tasks:
  - `F11-T08`, `F11-T09`, and `F11-T10` are eligible and unclaimed; stop before starting them.

## F11-T06 — redacted clinic-scoped audit viewer

Task ID: F11-T06
Completed at: 2026-09-28 03:06 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B06
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/identity/audit/{audit-viewer.controller,audit-viewer.dto,audit-viewer-session.guard,audit-viewer.service}.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/test/audit-viewer.integration.spec.ts`
  - `apps/dashboard/src/app/(app)/audit/page.tsx`
  - `apps/dashboard/src/features/audit/audit-viewer-page.tsx`
  - `apps/dashboard/src/lib/audit-viewer-api.{ts,spec.ts}`
  - generated `packages/api-client/{openapi.json,src/schema.generated.ts}`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none — the existing clinic-provenanced `PatientAccessAudit` model and clinical audit writer satisfy the frozen
    minimum-necessary viewer contract. The generic `AuditEvent` table is excluded because it has no clinic provenance.
Tests run:
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS.
  - `pnpm exec tsc -p tsconfig.test.json --noEmit` → PASS.
  - `pnpm exec vitest run test/audit-viewer.integration.spec.ts --no-file-parallelism --reporter=dot` → PASS (3/3)
    on a migrated-and-seeded, run-owned PostgreSQL database that the test drops in teardown.
  - `pnpm generate:api-client` and `pnpm --filter @sabz-zendegi/api-client build` → PASS; OpenAPI/client refreshed
    for `GET /v1/admin/audit-events`.
  - `pnpm --filter @sabz/dashboard typecheck` → PASS.
  - `pnpm --filter @sabz/dashboard test -- audit-viewer-api.spec.ts` → PASS (2/2).
  - `pnpm --filter @sabz/dashboard lint` → PASS (0 errors; 3 pre-existing warnings outside this task).
  - `git diff --check` → PASS.
Result:
  - `GET /v1/admin/audit-events` is a backend-enforced ADMIN route with a route-local active/unrevoked-session check.
    The phase-wide shared authorization policy/guard remains exclusively owned by F11-T07.
  - The read path resolves an active clinic before filters, count, or page work; every returned row is a
    `PatientAccessAudit` row with that clinic predicate. It provides only a stable `createdAt,id` cursor page,
    local `Asia/Tehran` date range (1–366 days), action, clinical resource type, and actor identifier filters.
  - The response contains redacted actor/subject/request references and a fixed allow-listed metadata summary. It
    never returns raw patient/actor/resource identifiers, IP address, session data, clinical text, raw metadata,
    arbitrary JSON, or a raw/export endpoint. Each disclosed event produces a new existing-policy-compatible
    `AUDIT_VIEWER_READ` clinical audit event within the same transaction.
  - The direct `/audit` dashboard route uses the generated contract and provides loading, forbidden, error, empty,
    filters, and next-page states without a mock or synthetic fallback. It deliberately adds no navigation or role UI.
Review:
  - PASS — scope is confined to F11-T06 and its generated route contract/evidence. No database schema/migration,
    dependency, shared auth policy/guard, role/membership/CRM path, browser E2E, or later Phase 11 task changed.
Next eligible task:
  - `F11-T07` only, unclaimed; do not start it in this task.

## F11-T05 — scoped reporting query-plan baseline

Task ID: F11-T05
Completed at: 2026-09-28 02:42 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B05
Reviewed by: Codex /root
Changed files:
  - `apps/api/test/reporting-query-plan.integration.spec.ts`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none — the baseline did not reproduce a scoped bottleneck, so the F11-T05 conditional schema/index/aggregate
    owner path was intentionally not exercised.
Tests run:
  - `pnpm exec tsc -p tsconfig.test.json --noEmit` → PASS.
  - `pnpm exec vitest run test/reporting-query-plan.integration.spec.ts --no-file-parallelism --reporter=verbose`
    → PASS (1/1) on a migrated-and-seeded, run-owned PostgreSQL database that the test drops in teardown.
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS.
  - `git diff --check` → PASS.
Result:
  - The disposable integration test captures and replays `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, FORMAT JSON)` for
    18 real clinic-scoped query shapes: scheduled/completed/cancelled/no-show/wait/page appointments; new-patient
    and onboarding population; assessment start/completion cohort/completed; active-plan/due/completed/cohort
    treatment tasks; and operational payment/completed-refund/pending-refund commerce reads.
  - Every captured plan contains the active clinic predicate and replay preserves each query shape. The measured
    baseline was 0.049–0.304 ms execution time with 2–22 shared blocks on its run-owned dataset; the plan supplies
    no production-size performance target, and no actual bottleneck was reproduced.
  - Direct PostgreSQL queries remain the accepted source path. No index, aggregate, schema, migration, cache,
    warehouse, analytics service, API contract/client, or runtime behavior was added. The commerce queries retain
    the existing operational facts only and make no Sadad settlement or production-verification assertion.
Review:
  - PASS — task ownership is confined to its disposable PostgreSQL test and coordinator-only evidence/status files;
    it does not enter F11-T06 audit/support, F11-T07 authorization, or any later Phase 11 scope.
Next eligible task:
  - `F11-T06` only, unclaimed; do not start it in this task.

## F11-T04 — inventory-only Dashboard Home reporting

Task ID: F11-T04
Completed at: 2026-09-27 22:36 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B04
Reviewed by: Codex /root
Changed files:
  - `apps/dashboard/src/features/dashboard/dashboard-page.tsx`
  - `apps/dashboard/src/lib/dashboard-home-reporting.{ts,spec.ts}`
  - `apps/dashboard/src/lib/commerce-revenue-api.spec.ts`
  - `apps/api/src/modules/commerce/reporting/{commerce-revenue.dto,commerce-revenue.service}.ts`
  - `apps/api/test/commerce-revenue.integration.spec.ts`
  - `packages/api-client/{openapi.json,src/schema.generated.ts}`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none
Tests run:
  - `pnpm --filter dashboard lint` → PASS (0 errors; 3 pre-existing warnings outside this task).
  - `pnpm --filter dashboard typecheck` → PASS.
  - `pnpm --filter dashboard test` → PASS (16 files, 55 tests), including the Home reporting adapter’s
    approved-source, forbidden-without-fallback, and error-without-fallback cases.
  - `pnpm --filter api typecheck` → PASS with a disposable PostgreSQL configuration.
  - `pnpm exec vitest run test/commerce-revenue.integration.spec.ts --no-file-parallelism` → PASS (2/2), proving
    clinic-local `Refund.status in {REQUESTED, APPROVED}` snapshot semantics and no client-side inference.
  - `pnpm exec vitest run test/reminders.integration.spec.ts --no-file-parallelism` → PASS (3/3).
  - `pnpm exec vitest run --no-file-parallelism --exclude test/reminders.integration.spec.ts --exclude
    test/chat-capacity.load.spec.ts` → PASS on a migration-and-seed disposable PostgreSQL database (85 files,
    353 tests). The excluded Chat capacity load test is an unrelated 35-minute synthetic workload.
  - `pnpm generate:api-client` and `pnpm --filter api-client build` → PASS; OpenAPI/client refreshed for
    `CommerceRevenueDto.refundPending`.
  - `git diff --check` → PASS.
Result:
  - Dashboard Home now renders only the frozen final KPI inventory: KPI-01–05, KPI-09, KPI-11, KPI-14–15,
    KPI-19, and KPI-21; it also renders only the permitted limited today appointment list and limited recent
    `OperationalActivity` list. Removed legacy scheduling-readiness, assessment-activity, and commerce-operation
    widgets were not part of that inventory.
  - All Home KPI values are read from the already-authorized ADMIN reporting APIs. The page shows loading, error,
    forbidden, zero/empty, partial, and stale behavior explicitly and never substitutes a mock or fallback value.
  - The one required contract extension is `refundPending`: a direct clinic-scoped PostgreSQL count of
    `Refund` rows in `{REQUESTED, APPROVED}` at response `asOf`. This is KPI-21’s frozen formula; it excludes
    `MANUAL_EXECUTION_PENDING`, rejected and completed refunds, and makes no monetary or Sadad-settlement claim.
Known limitations:
  - `F11-T05` remains the exclusive owner of query-plan measurement and any index/aggregate decision; none was added.
  - `F11-T07` and `F11-T09` remain the owners of the phase-wide role/authorization matrix, active/revoked-session
    enforcement, and browser E2E. No shared authorization policy or guard changed here.
Next task:
  - `F11-T05` is eligible and unclaimed; do not start it in this task.

## F11-T03 — clinic-scoped commerce operational-revenue report

Task ID: F11-T03
Completed at: 2026-09-27 21:30 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B03
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/commerce/reporting/{commerce-revenue.dto,commerce-revenue.service}.ts`
  - `apps/api/test/commerce-revenue.integration.spec.ts`
  - `apps/dashboard/src/features/revenue/revenue-page.tsx`
  - `apps/dashboard/src/lib/commerce-revenue-api.{ts,spec.ts}`
  - `packages/api-client/{openapi.json,src/schema.generated.ts}`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none
Tests run:
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS.
  - `pnpm generate:api-client` → PASS; OpenAPI and generated client refreshed for the changed revenue contract.
  - `pnpm --filter @sabz-zendegi/api-client build` and `typecheck` → PASS.
  - `pnpm --filter @sabz/dashboard typecheck` → PASS.
  - `pnpm --filter @sabz/dashboard test -- commerce-revenue-api.spec.ts` → PASS (15 files, 52 tests).
  - `pnpm test:isolated` → PASS; official harness created a run-owned PostgreSQL database, replayed all 32
    migrations and seed, executed the workspace suite, and removed the disposable database.
  - `pnpm --filter @sabz/dashboard lint` → PASS.
  - `git diff --check` → PASS.
Result:
  - The ADMIN revenue response now returns explicit active `clinicId`, `Asia/Tehran` range, response `asOf`,
    `sourceStatus=current`, and the exact `operational revenue` label. Every payment/refund query remains scoped
    through its order's clinic predicate.
  - Gross captured, completed refunds, net revenue, and successful payment count continue to use only verified
    `Payment.commerceAmountToman` and completed `Refund.amountToman` facts. Callback, payment-attempt, unpaid-order,
    catalog, provider transport, and Sadad settlement data are not queried or represented as revenue.
  - The revenue view consumes the generated contract, adds the frozen `WEEK` series option, preserves real
    loading/error/forbidden/empty behavior, and explicitly says the value is not a production-verified Sadad
    settlement.
  - Disposable PostgreSQL coverage proves ADMIN denial for STAFF, exact verified-payment/completed-refund TOMAN
    totals across Tehran boundaries, clinic response scope, weekly/monthly buckets, empty zero result, invalid range,
    and rejected unsupported filters.
Known limitations:
  - `F11-T05` remains the exclusive owner of query-plan measurement and any index/aggregate decision; none was added.
  - `F11-T07` and `F11-T09` remain the owners of the phase-wide ADMIN-only role matrix, active/revoked-session
    enforcement, and browser E2E. No shared authorization policy or guard changed in this task.
Next batch:
  - `F11-B04 / F11-T04` is eligible and unclaimed; do not start it in this task.

## F11-T02 — clinic-scoped appointment, patient, assessment, and treatment reports

Task ID: F11-T02
Completed at: 2026-09-27 21:08 +03:30
Agent/Thread: Codex /root
Batch ID: F11-B02
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/appointments/admin-appointments.{controller,dto,service}.ts`
  - `apps/api/src/modules/appointments/patient-appointments.module.ts`
  - `apps/api/src/modules/patients/admin/admin-patients.{controller,dto,service,module}.ts`
  - `apps/api/src/modules/assessments/admin/admin-assessment-submissions.{controller,dto,service}.ts`
  - `apps/api/src/modules/assessments/admin/admin-assessments.module.ts`
  - `apps/api/src/modules/clinical/{admin-treatment-plans.controller,clinical.module,treatment-activity.service,treatment-plan-response.dto,treatment-plan.service}.ts`
  - `apps/api/test/reporting.integration.spec.ts`
  - `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts`
  - coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`
Migrations:
  - none
Tests run:
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS.
  - `apps/api/node_modules/.bin/tsc.cmd -p tsconfig.test.json --noEmit` → PASS.
  - `apps/api/node_modules/.bin/vitest.cmd run test/reporting.integration.spec.ts test/openapi-contract.spec.ts --no-file-parallelism --reporter=dot` → PASS (8/8).
  - `pnpm generate:api-client` → PASS; exported OpenAPI and generated client refreshed from the four runtime routes.
  - `git diff --check` → PASS.
Result:
  - KPI-01–16 are served only by the four existing domain modules through ADMIN routes; every source query has a clinic predicate and returns only the frozen aggregate/list allow-list.
  - Formula review confirms the frozen terminal appointment rate, canonical onboarding predicate, assessment `COMPLETE` cohort, ACTIVE treatment-plan snapshot, KPI-15 `completedAt` range, and KPI-16 subset cohort with null zero denominator.
  - Disposable PostgreSQL integration proves API connection to a run-owned database, precise `Asia/Tehran` midnight conversion, cross-clinic exclusion, pagination, empty/zero and validation error behavior, absence of patient/medical payloads, and non-ADMIN denial.
  - Direct PostgreSQL reporting emits `sourceStatus=current`; it never fabricates `partial` or `stale` results. A real source failure remains an API error rather than a substitute KPI value.
Known limitations:
  - T007/T009 remain the owners of active/revoked-session enforcement, the complete ADMIN/PATIENT/DOCTOR/STAFF authorization matrix, and browser E2E. No common authorization policy or guard changed here.
Next task:
  - F11-T03 or F11-T04 is eligible but unclaimed; F11-T05 remains serialized after both.

## F11-T01 — KPI/widget inventory response-metadata foundation

- **Status:** `DONE`
- **Scope:** Added the frozen 21-entry KPI/widget inventory as typed, exported response metadata in the six existing
  domain DTO modules. Each entry identifies its formula, domain data owner, PostgreSQL lineage, tenant/clinic scope,
  `Asia/Tehran` calendar, rounding/currency rule, and zero/not-applicable, partial, and stale-data behavior.
- **Boundary review:** No reporting endpoint, query, dashboard widget, authorization policy, schema/migration,
  dependency, OpenAPI output, generated client, aggregate, or central reporting module was added. The existing
  commerce operational-revenue route remains unchanged; its metadata explicitly remains operational and not Sadad
  settlement certification.
- **Verification:**
  - `pnpm --filter @sabz-zendegi/api typecheck` with a valid local `DATABASE_URL` → PASS.
  - `apps/api/node_modules/.bin/tsc.cmd -p tsconfig.test.json --noEmit` → PASS.
  - `apps/api/node_modules/.bin/vitest.cmd run test/reporting-kpi-metadata.contract.spec.ts --no-file-parallelism` → PASS (2/2).
  - `apps/api/node_modules/.bin/vitest.cmd run test/migrations.integration.spec.ts --no-file-parallelism` with an
    existing PostgreSQL service and disposable database → PASS (3/3); the test drops its run-owned database.
  - `git diff --check` → PASS.
- **Environment note:** The pre-existing shared local development database is behind the committed migration history
  (`refunds` and `payment_provider_configs` are absent), so the unchanged existing
  `commerce-revenue.integration.spec.ts` cannot run there. No migration, schema, or local database was changed for
  this task; the disposable migration smoke confirms the committed schema itself is valid.
- **Review result:** Formula/state checks cover `COMPLETE` assessments, the canonical onboarding relation, the
  active-plan enum set, non-over-100% rate cohorts, and operational (not settlement) commerce semantics. No blocker
  remains for F11-T01.
