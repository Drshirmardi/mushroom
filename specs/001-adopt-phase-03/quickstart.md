# Phase 03 Validation Quickstart

## Prerequisites

- Node.js 24 and Corepack
- Dependencies installed with `corepack pnpm install`
- Local environment files based on the existing `apps/*/.env.example` files
- `DEV_DASHBOARD_ADMIN_PHONE` and `DEV_DASHBOARD_ADMIN_PASSWORD` set to dedicated local E2E
  credentials in `apps/api/.env`
- One dedicated patient account created through the existing `/signup` flow and completed through
  the existing onboarding flow; reuse it across runs and never commit its password

## Task-Level Verification

Run only the checks owned by the active task.

### Dashboard integration (`F03-T09` or `F03-T11`)

```powershell
corepack pnpm --filter @sabz/dashboard exec vitest run assessment
corepack pnpm --filter @sabz/dashboard typecheck
```

Expected: focused specs pass; assessment views use real data and preserve distinct loading,
empty, forbidden, unavailable, and error states.

### Patient integration (`F03-T10`)

```powershell
corepack pnpm --filter @sabz/app exec vitest run assessment booking-eligibility
corepack pnpm --filter @sabz/app typecheck
```

Expected: published assessments, persisted attempts, immutable results, and booking blocker
navigation come from the existing generated contract.

### Contract or backend correction (only when those paths change)

```powershell
corepack pnpm --filter @sabz-zendegi/api exec vitest run test/admin-assessments.authorization.spec.ts test/admin-assessment-submissions.authorization.spec.ts test/patient-assessments.authorization.spec.ts test/patient-booking-eligibility.spec.ts test/assessment-booking-contract.spec.ts --no-file-parallelism
corepack pnpm --filter @sabz-zendegi/api typecheck
corepack pnpm --filter @sabz-zendegi/api-client typecheck
```

Expected: authorization, clinic/patient ownership, version immutability, idempotency, and generated
contract drift checks pass.

## Phase-Level Browser Gate (`F03-T12`)

No repository browser-test framework is installed. Use the existing Codex in-app Browser against
the local applications; do not add a browser dependency for this phase gate.

### Deterministic environment

Run once before both journeys:

```powershell
docker compose up -d postgres
corepack pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
corepack pnpm --filter @sabz-zendegi/api prisma:seed
```

Start these existing services in separate terminals:

```powershell
corepack pnpm --filter @sabz-zendegi/api start:dev
corepack pnpm --filter @sabz/web dev
corepack pnpm --filter @sabz/app dev
corepack pnpm --filter @sabz/dashboard dev
```

Use `http://localhost:3000/login` for both dedicated accounts,
`http://localhost:3002/assessments` for administrator actions,
`http://localhost:3001/assessment` for patient assessment, and
`http://localhost:3001/appointments/book` for the booking gate.

At the start of each run, duplicate the current main assessment, give the draft a unique title
containing the run timestamp, publish it, and select that exact version in policy. This makes the
required journey deterministic even when the dedicated patient completed an earlier version.

### Journey 1 — Requirement enabled

1. Sign in as the seeded administrator, publish the timestamped main version, and enable the
   prerequisite for that exact version.
2. Sign in as the dedicated patient and open the booking URL directly.
3. Confirm booking is blocked by `MAIN_ASSESSMENT_REQUIRED` or `LATEST_VERSION_REQUIRED` and the
   displayed next action opens the assessment flow.
4. Answer at least one question, leave the route, return, and confirm the same attempt and answers
   resume.
5. Submit once, repeat the same submit action, and confirm one immutable result is shown.
6. Reopen booking and confirm the doctor-selection step is available.
7. In the dashboard patient workspace, confirm assessment title, version, score, and result band
   match the patient's stored result.

**Pass criteria**: every step succeeds; the direct booking URL cannot bypass server eligibility;
the repeated submit creates no second completion; patient and dashboard results agree.

### Journey 2 — Requirement disabled

1. Sign in as the administrator and disable the assessment prerequisite without changing or
   deleting the completed submission.
2. Sign in as the same patient and open the booking URL directly.
3. Confirm the doctor-selection step is immediately available.
4. Confirm the historical assessment result remains visible in both patient and dashboard views.

**Pass criteria**: booking is available with `ELIGIBLE`; historical data remains unchanged; no
score or result band is used as a booking condition.

### Evidence

Record the run timestamp, browser used, assessment title/version, observed blocker reasons,
result agreement, screenshots for the blocked/eligible/result states, and all command outcomes in
`specs/001-adopt-phase-03/evidence.md`. Do not record passwords or session tokens.

## Phase Closure (`F03-T13`)

- Search only Phase 03 assessment paths for reachable mock records.
- Record the focused command results and both browser journey outcomes.
- Close Phase 03 only when every roadmap exit criterion has evidence.

Do not run the full repository suite unless a cross-module change or failure demonstrates that it
is necessary.
