# Phase 07 Execution Evidence

## F07-T01 — lifecycle draft/issue/amend و قواعد ایمنی نسخه

Task ID: F07-T01
Completed at: 2026-09-03 22:08 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B01
Reviewed by: Codex /root
Changed files:

- `plan/contracts/prescription-treatment-policy-v1.md`
- `plan/STATUS.md`
- `plan/phases/07-PRESCRIPTION-TREATMENT.md`
- `plan/logs/phase-07.md`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,checklists/requirements.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations: none.

Tests run:

- Policy traceability script against the owner-approved F07-T01 issuer, acknowledgement, immutability, audit/privacy, and legal-boundary requirements → PASS
- `git diff --check` → PASS
- Coordinator review of roadmap, engineering standards, approved F07-T01 policy, and Phase 06 clinical-policy boundary → PASS

Result:

- Existing single-dashboard scope is preserved; no role-management UI, additional dashboard, or Phase 08 work is introduced → PASS
- Drafts are editable, issued revisions are immutable, and corrections are append-only successor revisions with preserved issuance evidence → PASS
- Issuance requires `PRESCRIPTION_ISSUE` plus tenant/resource authorization; `DOCTOR` is the default issuer and `ADMIN`/`STAFF` receive no implicit authority → PASS
- Advisory warnings require exact-revision acknowledgement; only an approved `NON_OVERRIDABLE` rule blocks issuance, and no such rule is invented → PASS
- Safety acknowledgement, audit/privacy, AI prohibition, and unresolved jurisdiction-specific legal boundary are frozen without claiming compliance → PASS

Known limitations:

- This policy task adds no prescription persistence, API, UI, generated client, RBAC-management infrastructure, warning evaluator, or audit implementation. Those remain owned by `F07-T02`–`F07-T11`.

Next batch:

- `F07-B02` — `F07-T02` (unclaimed).

## F07-T02 — migration prescription/treatment/task/adherence

Task ID: F07-T02
Completed at: 2026-09-04 03:18 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B02
Reviewed by: Codex /root
Changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260903234156_phase_07_prescription_treatment_foundation/migration.sql`
- `apps/api/test/migrations.integration.spec.ts`
- `plan/STATUS.md`
- `plan/phases/07-PRESCRIPTION-TREATMENT.md`
- `plan/logs/phase-07.md`
- `specs/005-adopt-phase-07/{spec.md,tasks.md}`

Migrations:

- `20260903234156_phase_07_prescription_treatment_foundation` — generated from the reviewed F07-T02 Prisma schema against the repository-supported isolated shadow database; applied successfully only to the clean reconstructed local development database.

Tests run:

- preservation-safe source/candidate comparison before switchover: 42 shared application tables, row counts and content fingerprints equal → PASS
- clean active migration ledger: 18 committed migration checksums matched before F07-T02; Prisma validate/generate, migrate status, and migration-history → committed-schema diff → PASS
- `prisma migrate dev --create-only --name phase_07_prescription_treatment_foundation` with isolated shadow → PASS
- generated SQL review: only F07-T02 enums, persistence tables, indexes, and foreign keys; no Phase 06/legacy mutations → PASS
- `prisma migrate deploy`, `prisma migrate status`, `prisma validate`, `prisma generate`, and migration-history → current-schema diff → PASS
- `tsc -p tsconfig.test.json --noEmit` → PASS
- `vitest run test/migrations.integration.spec.ts --no-file-parallelism` → PASS (2/2; empty PostgreSQL migration and deterministic seed smoke, including F07-T02 persistence constraints)
- real PostgreSQL persistence/constraint exercise on the active clean database inside a rolled-back transaction → PASS (revision-item and safety-acknowledgement uniqueness, adherence idempotency, and progress-event foreign key)
- `vitest run test/clinical-notes.integration.spec.ts test/health.integration.spec.ts --no-file-parallelism` → PASS (7/7)
- local API development boot with `GET /v1/health/live` and `GET /v1/health/ready` against the switched database → PASS
- post-verification preservation comparison: all 42 shared application tables still match the original; Phase 07 tables are empty → PASS
- `git diff --check` → PASS

Result:

- Prescription, revision/item, safety-acknowledgement, treatment plan/medication/exercise/nutrition/task, adherence, and progress-event persistence foundations exist with their generated indexes and foreign keys → PASS
- Fresh PostgreSQL migration and deterministic seed remain operational and idempotent for the existing development setup → PASS
- The local development URL now targets the clean reconstructed database; the original `sabz_zendegi` database remains unchanged with its historical 14 legacy constraint names and 19 migration rows, and both verified backup archives remain intact as rollback protection → PASS
- No implementation from `F07-T03` or later was started → PASS

Known limitations:

- F07-T02 provides persistence only. Prescription lifecycle API, treatment APIs, patient recording, progress calculation, authorization/audit enforcement, generated client/UI wiring, and browser verification remain owned by F07-T03 through F07-T11.

Next batch:

- `F07-B03` — `F07-T03` is eligible but not claimed or started.

## F07-T03 — prescription create/draft/issue/revision API

Task ID: F07-T03
Completed at: 2026-09-04 03:42 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B03
Reviewed by: Codex /root
Changed files:

- `apps/api/src/modules/clinical/{admin-prescriptions.controller.ts,prescription.dto.ts,prescription-response.dto.ts,prescription.service.ts,clinical.module.ts}`
- `apps/api/test/prescription.integration.spec.ts`
- `plan/STATUS.md`
- `plan/phases/07-PRESCRIPTION-TREATMENT.md`
- `plan/logs/phase-07.md`
- `specs/005-adopt-phase-07/{spec.md,quickstart.md,tasks.md}`

Migrations: none; F07-T02 persistence foundation is reused unchanged.

Tests run:

- `prisma validate` and `prisma generate` → PASS
- `tsc -p tsconfig.test.json --noEmit` → PASS
- `vitest run test/prescription.integration.spec.ts test/health.integration.spec.ts --no-file-parallelism` → PASS (4/4)
- real PostgreSQL lifecycle coverage: concurrent stale draft rejection, exact current-revision issue, immutable issued history, required amendment reason, integrity hash, and clinic-resource denial → PASS
- generated runtime OpenAPI document exposes the new protected prescription routes → PASS
- `git diff --check` → PASS

Result:

- Authorized clinical users can list/get, create, save append-only drafts, and issue the exact current prescription revision through validated `/v1/admin/patients/:patientId/prescriptions` routes → PASS
- Current clinic-resource grants and configurable clinical read/edit/sign capabilities are enforced before the corresponding prescription operation → PASS
- Issued revisions preserve issuer identity, timestamp, ordered item content, predecessor link, and deterministic integrity evidence; correction creates a successor draft instead of overwriting issued content → PASS
- No treatment-plan, adherence, progress, UI, client-generation, migration, or Phase 08 work was introduced → PASS

Known limitations:

- The frozen explicit `PRESCRIPTION_ISSUE` capability, transactional audit, warning evaluation/acknowledgement, and `NON_OVERRIDABLE` enforcement remain exclusively owned by `F07-T09`; this task retains the existing configurable clinical capability and clinic-resource boundary without adding RBAC infrastructure.
- Checked-in generated API client synchronization intentionally remains with `F07-T10`; the current OpenAPI client-synchronization test therefore reports the expected future-task diff and is not a F07-T03 completion gate.

Next batch:

- `F07-B04` — `F07-T04` is eligible but not claimed or started.

## F07-T04 — treatment medication/session/exercise/nutrition plan API

Task ID: F07-T04
Completed at: 2026-09-04 16:32 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B04
Reviewed by: Codex /root
Owner-approved boundary: [`../contracts/treatment-session-plan-v1.md`](../contracts/treatment-session-plan-v1.md)

Changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260904124643_phase_07_treatment_session_plan/migration.sql`
- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/modules/clinical/{treatment-plan.dto.ts,treatment-plan-response.dto.ts,treatment-plan.service.ts,admin-treatment-plans.controller.ts,patient-treatment-plans.controller.ts,clinical.module.ts}`
- `apps/api/test/{migrations.integration.spec.ts,treatment-plan.integration.spec.ts}`
- `plan/contracts/treatment-session-plan-v1.md`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Migration review:

- Previewed `20260904124643_phase_07_treatment_session_plan` before deployment. It contains only `CREATE TABLE treatment_session_plans`, unique `(treatment_plan_id, position)`, and a `RESTRICT` foreign key to `treatment_plans` → PASS.
- No Phase 06, legacy, or F07-T02 table, index, constraint, or migration mutation appears in the reviewed SQL → PASS.

Tests run:

- `prisma validate`, `prisma generate`, and `prisma migrate status` → PASS (20 committed migrations; clean active development database).
- migration-history → `schema.prisma` diff using the isolated disposable shadow database → PASS (empty migration).
- `tsc -p tsconfig.test.json --noEmit` → PASS.
- `vitest run test/migrations.integration.spec.ts --no-file-parallelism` with the repository’s development seed setting → PASS (2/2; fresh PostgreSQL replay, seed, new table, unique-position, and foreign-key constraints).
- `vitest run test/treatment-plan.integration.spec.ts --no-file-parallelism` → PASS (3/3; plan and definition CRUD, ordering, duplicate rejection, schedule-field rejection, plan editability, patient read, clinic-resource denial, audit, and runtime OpenAPI declarations).
- `vitest run test/prescription.integration.spec.ts --no-file-parallelism` → PASS (4/4).
- `vitest run test/clinical-notes.integration.spec.ts --no-file-parallelism` → PASS (5/5).
- `git diff --check` → PASS.

Result:

- `TreatmentSessionPlan` is an ordered clinical definition attached to one `TreatmentPlan`, with only the approved fields, unique plan/position constraint, restrictive owner-plan foreign key, timestamps, and no independent session lifecycle.
- Authorized dashboard users can create/read/update treatment plans plus medication, session, exercise, and nutrition definitions; authorized patients can read active/completed treatment plans. Existing clinical capability, clinic-resource authorization, and audit conventions apply.
- No scheduled occurrence, recurrence, reminder, attendance, completion state, appointment/encounter/task relation, media/modality model, per-session exercise/diet/video relation, revision infrastructure, dashboard UI, patient-app UI, or generated client synchronization was added. F07-T05 remains unclaimed and owns scheduling/execution/adherence semantics; F07-T10 retains checked-in generated-client synchronization.

Next batch:

- `F07-B05` — `F07-T05` is eligible but unclaimed and not started.

## F07-T05 — task schedule and idempotent medication/task recording

Task ID: F07-T05
Completed at: 2026-09-04 16:55 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B05
Reviewed by: Codex /root
Contract baseline: [`../contracts/treatment-task-activity-v1.md`](../contracts/treatment-task-activity-v1.md)

Changed files:

- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/modules/clinical/{treatment-activity.dto.ts,treatment-activity-response.dto.ts,treatment-activity.service.ts,admin-treatment-tasks.controller.ts,patient-treatment-activity.controller.ts,clinical.module.ts}`
- `apps/api/test/treatment-activity.integration.spec.ts`
- `plan/contracts/treatment-task-activity-v1.md`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations: none; the accepted F07-T02 `TreatmentTask` and `MedicationAdherenceLog` persistence foundation is reused unchanged.

Tests run:

- `prisma validate`, `prisma generate`, and `prisma migrate status` → PASS (20 committed migrations; clean active development database).
- `tsc -p tsconfig.test.json --noEmit` → PASS.
- `vitest run test/treatment-activity.integration.spec.ts --no-file-parallelism` → PASS (3/3; one-off medication/exercise schedule, future-time validation, reschedule/cancel, patient-owned task reads, repeat-safe completion with one audit state transition, keyed adherence replay/reuse rejection, optional matching task validation, clinic-resource denial, and runtime OpenAPI declarations).
- `vitest run test/treatment-activity.integration.spec.ts test/treatment-plan.integration.spec.ts test/prescription.integration.spec.ts test/clinical-notes.integration.spec.ts --no-file-parallelism` → PASS (13/13).
- `vitest run test/migrations.integration.spec.ts --no-file-parallelism` with the repository development seed setting → PASS (2/2; fresh PostgreSQL migration replay and deterministic seed smoke).
- `git diff --check` → PASS.

Result:

- Authorized clinical users can list, create, reschedule, and cancel one-off `MEDICATION`/`EXERCISE` `TreatmentTask` occurrences for an active treatment plan in their granted clinic. `scheduledFor` is the persisted future reminder source.
- Patients can read only their own non-cancelled active/completed-plan tasks and repeat-safely complete only an owned scheduled task; the state transition and `completedAt` are server controlled and a repeated completion does not create a second audit transition.
- Medication adherence requires `Idempotency-Key`; an optional task must be a non-cancelled matching medication task in the same active plan. A matching retry returns the first record; reuse for another medication or task is rejected by the existing unique-key authority.
- Existing audit and authorization conventions apply. No schema/migration change, `TreatmentSessionPlan` relationship, session scheduling, appointment/encounter behavior, recurrence engine, reminder dispatch, progress event/calculation, UI/client connection, generated-client synchronization, RBAC-management infrastructure, or Phase 08 behavior was introduced.

Next batch:

- `F07-B06` — `F07-T06` is eligible but unclaimed and not started.
