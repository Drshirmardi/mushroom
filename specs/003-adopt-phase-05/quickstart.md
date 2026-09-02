# Phase 05 Validation Quickstart

This is a future-task validation guide only; it does not claim or start `F05-T01`.

## Prerequisites

- Phase 03/04 remain complete and supply eligibility/directory/availability.
- A future coordinator has claimed a batch and assigned one writer for migrations, shared
  contracts, generated client, and other shared paths.
- Existing Node/Corepack, environment, PostgreSQL, and non-secret administrator/patient setup are
  available.

## Task-Level Verification

- `F05-T01`–`F05-T07`: targeted API/typecheck and real PostgreSQL integration where relevant.
- `F05-T08`: focused patient-app/typecheck; confirm no mandatory wallet/payment confirmation.
- `F05-T09`–`F05-T10`: focused dashboard/typecheck and truthful states/widgets.
- `F05-T11`: regenerate/typecheck client and remove only in-scope mocks.
- `F05-T12`: concurrency, idempotency, authorization, state-machine checks.

## Phase Browser Gate (`F05-T13`)

1. Register/authenticate a patient; complete profile and conditional assessment.
2. Select Phase 04-derived availability and create an appointment.
3. Retry safely; assert no duplicate.
4. Locate it in dashboard appointments/calendar/queue and perform operational actions.
5. Compare Home V1 with sourced operations data and confirm future-source widgets are hidden.

**Pass criteria**: the required browser journey passes; one of 100 concurrent attempts succeeds;
changed eligibility is rejected; same-key retries do not duplicate; repeated operations remain
consistent; views agree; query/load baseline is recorded.

## Evidence (`F05-T14`)

Record accepted evidence in `plan/logs/phase-05.md` under `plan/logs/README.md`, then synchronize
authoritative status only after review. Never record credentials, tokens, or patient data.
