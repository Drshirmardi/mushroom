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

## F07-T06 — real progress calculation and timeline

Task ID: F07-T06
Completed at: 2026-09-04 17:02 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B06
Reviewed by: Codex /root
Contract baseline: [`../contracts/treatment-progress-v1.md`](../contracts/treatment-progress-v1.md)

Changed files:

- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/modules/clinical/{treatment-activity.service.ts,treatment-progress-response.dto.ts,treatment-progress.service.ts,admin-treatment-progress.controller.ts,patient-treatment-progress.controller.ts,clinical.module.ts}`
- `apps/api/test/treatment-progress.integration.spec.ts`
- `plan/contracts/treatment-progress-v1.md`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations: none; the accepted F07-T02 event and task persistence foundation is reused unchanged.

Tests run:

- `prisma validate`, `prisma generate`, and `prisma migrate status` → PASS (20 committed migrations; clean active development database).
- `tsc -p tsconfig.test.json --noEmit` → PASS.
- `vitest run test/treatment-progress.integration.spec.ts --no-file-parallelism` → PASS (1/1; accepted task/adherence actions append exactly two events despite retries, task state produces 50% for one of two tasks, patient/admin reads, and clinic-resource denial).
- `vitest run test/treatment-progress.integration.spec.ts test/treatment-activity.integration.spec.ts test/treatment-plan.integration.spec.ts test/prescription.integration.spec.ts test/clinical-notes.integration.spec.ts --no-file-parallelism` → PASS (14/14).
- `git diff --check` → PASS.

Result:

- `TASK_COMPLETED` and `MEDICATION_ADHERENCE_RECORDED` are append-only real event types written transactionally only when F07-T05 accepts the underlying action; completion/adherence retries write no duplicate event.
- Patient and authorized clinical reads return newest-first persisted timeline entries and task-state-derived percentage (`completed non-cancelled / all non-cancelled`, rounded; zero if none), never a fixed or manually edited value.
- No migration, session lifecycle, scheduling/recurrence/reminder behavior, appointment/encounter relation, backfill, background job, dashboard/app connection, generated-client synchronization, or Phase 08 work was introduced.

Next batch:

- `F07-B07` — `F07-T07` is eligible but unclaimed and not started.

## F07-T07 — prescription builder and dashboard patient-workspace connection

Task ID: F07-T07
Completed at: 2026-09-04 17:15 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B07
Reviewed by: Codex /root
Contract baseline: [`../contracts/prescription-dashboard-connection-v1.md`](../contracts/prescription-dashboard-connection-v1.md)

Changed files:

- `apps/dashboard/src/features/{prescriptions/prescriptions-page.tsx,patients/workspace/patient-workspace.tsx}`
- `apps/dashboard/src/lib/{prescription-treatment-api.ts,prescription-treatment-api.spec.ts}`
- `plan/contracts/prescription-dashboard-connection-v1.md`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations: none; this task connects accepted F07 APIs and does not modify persistence.

Tests run:

- `apps/dashboard: corepack pnpm vitest run` → PASS (10 files, 34 tests), including the selected-patient prescription/treatment adapter contract test.
- `apps/dashboard: corepack pnpm typecheck` → PASS.
- `apps/dashboard: corepack pnpm lint` → PASS with no errors; two pre-existing unused clinical-record-editor warnings remain outside this task's changes.
- `apps/dashboard: corepack pnpm build` → PASS.
- `apps/api: corepack pnpm vitest run test/prescription.integration.spec.ts test/treatment-plan.integration.spec.ts test/treatment-progress.integration.spec.ts --no-file-parallelism` → PASS (3 files, 6 tests; accepted API lifecycle, treatment-plan, real-progress, and clinic-resource regression).
- `git diff --check` → PASS.

Result:

- The dashboard patient workspace now opens the prescription builder with the selected real patient identity and renders server-sourced prescription history, treatment-plan definitions, and real derived progress in its treatment summary.
- The builder creates a draft, saves an append-only draft successor, and issues the exact current revision through accepted F07 APIs. It reloads the returned revision and preserves issued history instead of inventing a local success state.
- Missing patient selection, authorization denial, request failure, and empty states remain explicit; no fabricated patient, prescription, treatment, or progress data is substituted.
- The approved `TreatmentSessionPlan` boundary is unchanged. No patient-app connection, scheduling/execution behavior, authorization-policy expansion, generated-client synchronization, broad mock cleanup, browser E2E, or Phase 08 work was introduced. `F07-T08` remains unclaimed and owns the next patient-app connection.

Next batch:

- `F07-B08` — `F07-T08` is eligible but unclaimed and not started.

## F07-T08 — patient treatment application connection

Task ID: F07-T08
Completed at: 2026-09-04 17:22 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B08
Reviewed by: Codex /root
Contract baseline: [`../contracts/patient-treatment-app-connection-v1.md`](../contracts/patient-treatment-app-connection-v1.md)

Changed files:

- `apps/app/src/app/(app)/treatment/**`
- `apps/app/src/lib/{patient-treatment-api.ts,patient-treatment-api.spec.ts}`
- `plan/contracts/patient-treatment-app-connection-v1.md`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations: none; this task connects the accepted patient APIs without persistence changes.

Tests run:

- `apps/app: corepack pnpm vitest run` → PASS (9 files, 26 tests), including the patient treatment API adapter contract test.
- `apps/app: corepack pnpm typecheck` → PASS.
- `apps/app: corepack pnpm build` → PASS.
- `apps/api: corepack pnpm vitest run test/treatment-activity.integration.spec.ts test/treatment-plan.integration.spec.ts test/treatment-progress.integration.spec.ts --no-file-parallelism` → PASS (3 files, 7 tests).
- `git diff --check` → PASS.

Result:

- The patient treatment area displays only authenticated patient-owned plan definitions, medication/session/exercise/nutrition content, scheduled activity, and server-derived progress.
- Patient completion and medication-adherence buttons call the accepted repeat-safe/keyed APIs and reload persisted data. Loading, failure, and empty states never substitute demo treatment content.
- Legacy treatment detail routes now return to this real connected view rather than displaying their former fabricated detail screens. No scheduling creation, appointment/session execution, authorization-policy expansion, generated-client synchronization, browser E2E, or Phase 08 work was introduced.

Next batch:

- `F07-B09` — `F07-T09` is eligible, unclaimed, and not started.

## F07-T09 — explicit issuance authorization, audit, and safety-rule deferral

Task ID: F07-T09
Completed at: 2026-09-04 19:04 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B09
Reviewed by: Codex /root
Contract baseline: [`../contracts/prescription-treatment-policy-v1.md`](../contracts/prescription-treatment-policy-v1.md)

Changed files:

- `apps/api/prisma/{schema.prisma,migrations/20260904135520_phase_07_prescription_issue_capability/migration.sql,migrations/20260904174000_phase_07_doctor_prescription_issue_default/migration.sql}`
- `apps/api/src/common/auth/{authorization.policy.ts,clinical-permission.service.ts}`
- `apps/api/src/modules/clinical/{admin-prescriptions.controller.ts,prescription.service.ts}`
- `apps/api/test/{migrations.integration.spec.ts,prescription.integration.spec.ts}`
- `plan/contracts/prescription-treatment-policy-v1.md`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations:

- `20260904135520_phase_07_prescription_issue_capability` — reviewed generated enum addition for `PRESCRIPTION_ISSUE`.
- `20260904174000_phase_07_doctor_prescription_issue_default` — reviewed idempotent data migration that maps the new capability to `DOCTOR` only; `ADMIN` and `STAFF` receive no implicit mapping.

Tests run:

- reviewed both F07-T09 migration SQL files before deployment → PASS; only the capability enum and `DOCTOR` mapping are present, with no Phase 06, legacy, or earlier F07 mutation.
- `prisma migrate deploy`, `prisma migrate status`, `prisma validate`, and `prisma generate` → PASS (22 committed migrations; clean active development database).
- `tsc --noEmit` → PASS.
- migration-history → `schema.prisma` diff through a fresh disposable PostgreSQL shadow database → PASS (no difference; disposable shadow dropped after verification).
- `NODE_ENV=development node --env-file=.env node_modules/vitest/vitest.mjs run test/migrations.integration.spec.ts --no-file-parallelism` → PASS (2/2; fresh PostgreSQL replay, deterministic seed, and `DOCTOR`-only capability mapping).
- `vitest run test/prescription.integration.spec.ts --no-file-parallelism` → PASS (3/3; exact-revision issuance, immutable amendment history, `DOCTOR` capability, `ADMIN`/`STAFF` denial, clinic-resource denial, transactional audit, and zero active safety acknowledgements).
- `vitest run test/prescription.integration.spec.ts test/treatment-plan.integration.spec.ts test/treatment-activity.integration.spec.ts test/treatment-progress.integration.spec.ts test/clinical-notes.integration.spec.ts --no-file-parallelism` → PASS (5 files, 15 tests).
- `git diff --check` → PASS.

Result:

- Issuance requires the explicit database-backed `PRESCRIPTION_ISSUE` capability at both endpoint and service layers, then the existing tenant/clinic/patient resource check. The default mapping grants it only to `DOCTOR`; role-only `ADMIN` and `STAFF` access is denied.
- Issuing an exact current draft revision records a revision-scoped `SIGN` audit event in the same transaction. Missing or failed audit recording prevents issuance from committing; existing stale-revision, append-only amendment, and integrity-hash protections remain intact.
- The owner-approved clarification is recorded: current Phase 07 has no automated contraindication-rule evaluator, warning/acknowledgement flow, `NON_OVERRIDABLE` behavior, rule seed, hard-coded rule, or rule-management UI. Existing acknowledgement persistence is inactive and an issued revision creates no acknowledgement.
- No generated-client synchronization, dashboard/app UI change, scheduling/execution behavior, Phase 08 functionality, or completed-task rewrite was introduced.

Next batch:

- `F07-B10` — `F07-T10` is eligible but unclaimed and not started.

## F07-T10 — OpenAPI/client synchronization and in-scope transport cleanup

Task ID: F07-T10
Completed at: 2026-09-04 19:33 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B10
Reviewed by: Codex /root
Contract baseline: [`../contracts/prescription-dashboard-connection-v1.md`](../contracts/prescription-dashboard-connection-v1.md), [`../contracts/patient-treatment-app-connection-v1.md`](../contracts/patient-treatment-app-connection-v1.md), and [`../contracts/prescription-treatment-policy-v1.md`](../contracts/prescription-treatment-policy-v1.md)

Changed files:

- `packages/api-client/{openapi.json,src/schema.generated.ts}`
- `apps/dashboard/src/lib/{prescription-treatment-api.ts,prescription-treatment-api.spec.ts}`
- `apps/app/src/lib/{patient-treatment-api.ts,patient-treatment-api.spec.ts}`
- `plan/{STATUS.md,phases/07-PRESCRIPTION-TREATMENT.md,logs/phase-07.md}`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`

Tests run:

- `corepack pnpm generate:api-client` → PASS (runtime OpenAPI export and checked-in generated types are fresh).
- `corepack pnpm --filter @sabz-zendegi/api-client {build,test,typecheck}` → PASS (generated source freshness, package build/typecheck, 1 client test).
- `corepack pnpm --filter @sabz/dashboard test`, `typecheck`, `lint`, and `build` → PASS (10 files/34 tests; lint has only the two pre-existing unused clinical-editor warnings outside this task).
- `corepack pnpm --filter @sabz/app test`, `typecheck`, and `build` → PASS (9 files/26 tests).
- `corepack pnpm exec vitest run test/prescription.integration.spec.ts test/treatment-plan.integration.spec.ts test/treatment-activity.integration.spec.ts test/treatment-progress.integration.spec.ts --no-file-parallelism` from `apps/api` → PASS (4 files/10 real-PostgreSQL tests).
- `git diff --check` → PASS.

Result:

- The checked-in OpenAPI artifact now exposes the already accepted Phase 07 prescription, treatment-plan/session/definition, task/adherence, and progress operations; no new route, migration, service, authorization policy, or runtime behavior was introduced.
- Dashboard and patient treatment adapters now use generated paths, request bodies, and response types while retaining the existing bounded timeout and explicit API-error behavior. The generated adherence operation also verifies the required `Idempotency-Key` header at compile time.
- The completed F07 dashboard/app connections retain truthful selected-patient, authenticated-patient, loading, error, and empty states; no in-scope Phase 07 mock or local-only data fallback remains.
- The owner-approved Phase 07 boundary remains unchanged: no active contraindication-rule engine, warning/acknowledgement flow, `NON_OVERRIDABLE` behavior, rule-management UI, session scheduling/execution expansion, or Phase 08 work.

Next batch:

- `F07-B11` — `F07-T11` is eligible but unclaimed and not started.

## F07-T11 — immutability, amendment, ownership, and browser E2E

Task ID: F07-T11
Completed at: 2026-09-04 22:56 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B11
Reviewed by: Codex /root
Contract baseline: [`../contracts/prescription-treatment-policy-v1.md`](../contracts/prescription-treatment-policy-v1.md), [`../contracts/prescription-dashboard-connection-v1.md`](../contracts/prescription-dashboard-connection-v1.md), [`../contracts/patient-treatment-app-connection-v1.md`](../contracts/patient-treatment-app-connection-v1.md), and the browser gate in [`../../specs/005-adopt-phase-07/quickstart.md`](../../specs/005-adopt-phase-07/quickstart.md)

Verification:

- Local browser E2E with disposable synthetic clinician/patient accounts: issued a draft, created and issued one amendment successor, loaded permitted treatment definitions in the patient app, recorded one medication-adherence event, reloaded the app, and reviewed the effective revision and real treatment-plan progress in the dashboard → PASS.
- Synthetic issued history inspection: both revisions were `ISSUED`; revision 2 linked to revision 1; revision 1's item was unchanged; each revision retained issuer identity, issue timestamp, and integrity hash; two revision-linked, timestamped `SIGN` audit entries existed → PASS.
- Fresh second authenticated patient session read the persisted adherence event and the same 0% result. The percentage correctly remained task-state-derived because adherence is a timeline event, not completion of the outstanding scheduled task → PASS.
- `apps/api`: `vitest run test/prescription.integration.spec.ts test/treatment-plan.integration.spec.ts test/treatment-activity.integration.spec.ts test/treatment-progress.integration.spec.ts --no-file-parallelism` → PASS (4 files, 10 tests; immutable amendment chain, stale-revision/concurrency, explicit `DOCTOR` issuance capability, `ADMIN`/`STAFF` denial, tenant/resource denial, audit, idempotency, real-event timeline, and no active contraindication rules).
- `apps/api`: `prisma validate` and `prisma migrate status` → PASS (22 migrations; clean active development database).
- `apps/dashboard`: `test` and `typecheck` → PASS (10 files, 34 tests).
- `apps/app`: `test` and `typecheck` → PASS (9 files, 26 tests).
- `git diff --check` → PASS.

Result:

- The authorized synthetic clinician used the existing single dashboard. Its issue authority came from `DOCTOR` and `PRESCRIPTION_ISSUE`; the synthetic account additionally held `ADMIN` only for the pre-existing patient-workspace read permission. `ADMIN` alone remained denied by focused regression.
- Dashboard and app views used persisted, authorized F07 data with no fabricated fallback. The dashboard displayed the effective issued successor revision; the patient app displayed patient-owned treatment definitions and persisted activity; the dashboard displayed real task-derived progress.
- No active contraindication rule, warning, acknowledgement, `NON_OVERRIDABLE` behavior, role-management UI, migration, Phase 08 behavior, or change to F07-T01–T10 was introduced.
- All synthetic accounts, sessions, prescriptions, plans, tasks, activity/events, audits, and temporary clinical role grants used for this verification were removed after the checks. Preserved local-development data was not modified.

Next batch:

- `F07-B12` — `F07-T12` is eligible but unclaimed and not started.
