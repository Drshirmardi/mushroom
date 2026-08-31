# Phase 04 Validation Quickstart

This guide describes the validation expected after the relevant Phase 04 roadmap tasks are
separately claimed and implemented. Running it is not part of documentation adoption and does not
claim `F04-T01`.

## Prerequisites

- Node.js 24 and Corepack
- Dependencies installed with `corepack pnpm install`
- Local environment files based on the existing `apps/*/.env.example` files
- PostgreSQL started through the existing local compose configuration
- Dedicated local administrator and patient credentials; never commit passwords or session tokens
- Phase 04 migration and deterministic development seed completed under their owning tasks

## Task-Level Verification

Run only the checks owned by the active roadmap task and any focused spec files introduced by it.

### API, migration, and contract work (`F04-T02`–`F04-T07`, `F04-T10`)

```powershell
corepack pnpm --filter @sabz-zendegi/api prisma:generate
corepack pnpm --filter @sabz-zendegi/api typecheck
corepack pnpm --filter @sabz-zendegi/api test
corepack pnpm --filter @sabz-zendegi/api-client typecheck
```

Expected: the active task's focused tests pass; migration smoke, authorization/audit, overlap, and
contract drift checks run when their owning task requires them. Do not run unrelated suites merely
because this guide lists the package-level fallback.

### Dashboard integration (`F04-T08`)

```powershell
corepack pnpm --filter @sabz/dashboard test
corepack pnpm --filter @sabz/dashboard typecheck
```

Expected: settings forms and schedule-readiness views use generated-client data and preserve
distinct loading, empty, forbidden, validation, unavailable, and error states.

### Patient integration (`F04-T09`)

```powershell
corepack pnpm --filter @sabz/app test
corepack pnpm --filter @sabz/app typecheck
```

Expected: doctor detail and doctor/service/time selection use published active records, preserve
the Phase 03 eligibility gate, and contain no in-scope directory or availability mock.

## Migration Gate (`F04-T02` and `F04-T11`)

Use the repository's isolated test database process to verify:

1. all existing migrations plus the Phase 04 migration apply from an empty database;
2. persisted timestamps are timezone-aware and clinic-local intent is reproducible;
3. foreign keys, uniqueness, checks, and feasible overlap constraints reject invalid data;
4. representative directory and availability queries have recorded query-plan evidence.

The active task must record the exact commands and database target without exposing credentials.

## Phase-Level Browser Gate (`F04-T11`)

Start the existing services in separate terminals after applying migrations and seed data:

```powershell
corepack pnpm --filter @sabz-zendegi/api start:dev
corepack pnpm --filter @sabz/app dev
corepack pnpm --filter @sabz/dashboard dev
```

Use the administrator settings route at `http://localhost:3002/settings`, the patient doctor route
at `http://localhost:3001/doctors/{id}`, and the eligibility-protected selection flow beginning at
`http://localhost:3001/appointments/book`.

### Journey 1 — Administrator configures bookable capacity

1. Sign in as the dedicated administrator.
2. Create or update a doctor profile that has no login account.
3. Create or update a specialty and service, then assign the service to the doctor with an active
   visit mode, duration, buffer, integer price, and currency.
4. Publish the patient-visible records and configure regular working hours.
5. Add a clinic closure and a bounded doctor leave/exception.
6. Confirm invalid overlaps and invalid ranges are rejected with truthful feedback.
7. Confirm schedule readiness and next-day information display only sourced values.

**Pass criteria**: every in-scope settings card performs a real action; data persists after reload;
unauthorized mutation is rejected; schedule, price, and publication changes have audit evidence.

### Journey 2 — Patient sees current published availability

1. Sign in as a dedicated patient whose Phase 03 eligibility decision permits selection.
2. Open the configured doctor's detail and confirm the published doctor, specialty, service, mode,
   duration, and price agree with the administrator configuration.
3. Select the active doctor/service and inspect candidate times.
4. As administrator, change working hours or add/remove a closure, leave period, or exception.
5. Refresh the patient availability and confirm the result changes immediately.
6. Deactivate or unpublish the offering and confirm it is no longer selectable or bookable.

**Pass criteria**: patient-visible values match stored administrator-managed data; candidate times
are derived from current rules; inactive/unpublished combinations disappear; no appointment is
created because that belongs to Phase 05.

## Evidence and Phase Closure (`F04-T12`)

Record focused command outcomes, migration smoke results, authorization/audit cases, overlap and
timezone cases, query plans, browser timestamps, configured record identifiers, and screenshots in
the Phase 04 evidence locations defined by `plan/logs/README.md` and the active task handoff.

Do not mark Phase 04 complete until all four roadmap exit criteria are evidenced. Do not include
passwords, tokens, personal medical data, or unrelated mock cleanup.
