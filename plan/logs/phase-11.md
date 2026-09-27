# Phase 11 Evidence

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
