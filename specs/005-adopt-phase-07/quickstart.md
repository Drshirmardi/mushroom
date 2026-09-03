# Phase 07 Validation Quickstart

This guide preserves Phase 07 validation gates. Live execution state is authoritative in [`plan/STATUS.md`](../../plan/STATUS.md); the adoption does not claim or start `F07-T01`.

## Prerequisites

- Phase 06 remains `DONE (CLOSED)`.
- A future coordinator has claimed a batch and assigned one writer for migrations, shared contracts, generated client, authentication, and other shared paths.
- Existing Node/Corepack, environment, PostgreSQL, and non-secret authorized dashboard user and patient setup are available.

## Task-level verification

- `F07-T01`: focused lifecycle and safety-rule review for immutable issue and revision amendment.
- `F07-T02`: migration smoke and focused real-PostgreSQL integration evidence.
- `F07-T03`–`F07-T06`: targeted domain/API/type checks for prescription lifecycle, treatment plans, idempotent patient activity, and real-event progress/timeline as applicable.
- `F07-T07`–`F07-T08`: focused dashboard/app type checks and truthful in-scope mock/local-state removal only after the real source and contract are ready.
- `F07-T09`: authorization matrix, audit, and contraindication-warning coverage.
- `F07-T10`: regenerate/typecheck the client and review in-scope connection removal.

## Phase browser gate (`F07-T11`)

1. As an authorized dashboard user, prepare and issue a prescription, then exercise amendment as a revision rather than an issued-content overwrite.
2. Connect the issued treatment to the app and display the permitted patient treatment details.
3. Record permitted patient medication/adherence or treatment-task activity, then refresh and repeat from another device context.
4. Confirm progress and timeline use real progress events rather than a fixed UI value.
5. Review the resulting patient activity in the dashboard; exercise required ownership, authorization, audit, and contraindication-warning boundaries.

**Pass criteria**: the dashboard issue → app display → patient log → dashboard review journey passes; issued prescriptions remain immutable; correction is revision-based; schedules are the future reminder source; patient activity persists across refresh/devices; progress is real-event derived; and required safety boundaries hold.

## Evidence (`F07-T12`)

Record accepted evidence in `plan/logs/phase-07.md` under `plan/logs/README.md`, then synchronize authoritative status only after review. Never record credentials, tokens, medical content, or PII.
