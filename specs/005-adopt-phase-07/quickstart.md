# Phase 07 Validation Quickstart

This guide preserves Phase 07 validation gates. Live execution state is authoritative in [`plan/STATUS.md`](../../plan/STATUS.md); `F07-T01` through `F07-T12` are complete and Phase 07 is `DONE (CLOSED)` after independent closure review. This guide does not authorize Phase 08 work.

## Prerequisites

- Phase 06 remains `DONE (CLOSED)`.
- A future coordinator has claimed a batch and assigned one writer for migrations, shared contracts, generated client, authentication, and other shared paths.
- Existing Node/Corepack, environment, PostgreSQL, and non-secret authorized dashboard user and patient setup are available.

## Task-level verification

- `F07-T01`: focused lifecycle and safety-rule review for immutable issue and revision amendment.
- `F07-T02`: migration smoke and focused real-PostgreSQL integration evidence.
- `F07-T04`: reviewed additive `TreatmentSessionPlan` migration SQL; fresh PostgreSQL migration/constraint smoke; Prisma validation/generation and migration-history/schema diff; and focused treatment-plan API coverage for tenant/resource access, ordered session definitions, patient reads, audit, and exclusion of schedule/execution fields.
- `F07-T05`: targeted PostgreSQL/API/type checks for one-off medication/exercise scheduling, repeat-safe owned task completion, keyed medication-adherence replay, clinic-resource authorization, audit, and runtime OpenAPI declarations. No migration is expected because the F07-T02 persistence foundation is reused.
- `F07-T06`: targeted PostgreSQL/API/type checks for transactional real-event append, retry deduplication, task-state-derived percentage, patient/clinic-resource authorization, audit, and runtime OpenAPI declarations. No migration, UI connection, or client synchronization is expected.
- `F07-T07`: selected-patient dashboard adapter contract tests; dashboard test/type/lint/build; focused accepted prescription/treatment/progress API regression; and truthful missing-selection/error states. Checked-in generated-client synchronization remains out of scope.
- `F07-T08`: patient treatment adapter contract tests; app test/type/build; focused accepted plan/activity/progress API regression; and truthful loading/error/empty states without fabricated treatment data.
- `F07-T09`: explicit-issuance authorization matrix, audit, revision-integrity, and automated-safety-rule deferral coverage.
- `F07-T10`: exported the accepted F07 runtime OpenAPI surface, regenerated and typechecked `@sabz-zendegi/api-client`, and converted both completed F07 frontend transport adapters to generated-client wrappers. Contract tests, app/dashboard type/build checks, focused real-PostgreSQL API regression, and no-fallback review passed.

## Phase browser gate (`F07-T11`)

1. As an authorized dashboard user, prepare and issue a prescription, then exercise amendment as a revision rather than an issued-content overwrite.
2. Connect the issued treatment to the app and display the permitted patient treatment details.
3. Record permitted patient medication/adherence or treatment-task activity, then refresh and repeat from another device context.
4. Confirm progress and timeline use real progress events rather than a fixed UI value.
5. Review the resulting patient activity in the dashboard; exercise required ownership, authorization, audit, and the approved no-active-rule boundary.

**Pass criteria**: the dashboard issue → app display → patient log → dashboard review journey passes; issued prescriptions remain immutable; correction is revision-based; schedules are the future reminder source; patient activity persists across refresh/devices; progress is real-event derived; explicit issuance authorization/audit holds; and no automated clinical rule behavior is claimed or activated.

`F07-T11` result: passed locally with disposable synthetic accounts and records. The dashboard issued a revision, the patient app displayed the persisted treatment definitions and recorded one adherence event, a fresh page and separate authenticated session observed that event, and dashboard review showed the effective issued successor revision and real 0% task-derived progress. Both issued revisions, audit links, issuer identities, timestamps, and integrity hashes were inspected before the synthetic data was removed.

## Evidence (`F07-T12`)

Record accepted evidence in `plan/logs/phase-07.md` under `plan/logs/README.md`, then synchronize authoritative status only after review. Never record credentials, tokens, medical content, or PII.

`F07-T12` result: passed. The clean active PostgreSQL migration ledger and Prisma validation are clean; runtime OpenAPI/client regeneration has no checked-in drift; API, client, dashboard, and app verification passed; the F07 source scan found no mock or local-state fallback and no Phase 08 behavior; and Spec Kit prerequisite, requirement-coverage, consistency, and convergence checks found no unresolved implementation gap. Independent closure review then revalidated the focused F07 PostgreSQL suite, migration-history/schema diff, client, frontend, browser evidence, and product boundaries. Phase 07 is `DONE (CLOSED)`; Phase 08 remains `NOT_STARTED`.
