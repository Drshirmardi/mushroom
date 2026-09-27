# Phase 11 Evidence

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
