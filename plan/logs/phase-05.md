# Phase 05 Execution Evidence

## F05-T01 — State machine, cancellation/reschedule policy, and price snapshot

Task ID: F05-T01
Completed at: 2026-09-02 16:27 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B01
Reviewed by: Codex /root
Changed files:
  - plan/contracts/appointment-operations-v1.md
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None; F05-T02 owns persistence and migration work.
Tests run:
  - git diff --check → PASS
  - Contract coverage review against Phase 05 roadmap, engineering standards, Phase 03 eligibility,
    and Phase 04 availability/pricing contracts → PASS
  - Changed-path scope audit → PASS; no implementation, migration, generated-client, app, or
    dashboard path changed.
Result:
  - State values, terminal states, legal transitions, repeat behavior, and day-of-visit operations → PASS
  - Patient/admin cancellation and reschedule policy, including policy-change rejection → PASS
  - Immutable price snapshot timing and reschedule-history behavior → PASS
  - Authoritative Phase 03 eligibility and Phase 04 availability/pricing handoff → PASS
  - Idempotency, active-overlap, authorization, audit, and later-task ownership boundaries → PASS
Known limitations:
  - No persistence, API, client, frontend, or tests were implemented; F05-T02 through F05-T13 own them.
Next batch:
  - F05-B02: F05-T02 only, subject to migration/shared-path claim.

## F05-T02 — Appointment persistence, indexes, and active-doctor overlap constraint

Task ID: F05-T02
Completed at: 2026-09-02 18:16 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B02
Reviewed by: Codex /root
Changed files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260902163100_appointment_operations_persistence/migration.sql
  - apps/api/test/migrations.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - 20260902163100_appointment_operations_persistence
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api prisma:generate → PASS
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/migrations.integration.spec.ts → PASS (2 tests)
  - git diff --check → PASS
Result:
  - Appointment, hold, history, queue, and operational-activity persistence with tenant-scoped foreign keys and task-owned indexes → PASS
  - Empty-database smoke created and dropped isolated PostgreSQL databases, deployed every migration, and seeded idempotently → PASS
  - Real PostgreSQL exclusion constraint permits adjacent active appointments, rejects overlapping active appointments with 23P01, and permits an overlapping CANCELLED appointment → PASS
  - Phase 05 appointment enums and the active-doctor exclusion constraint are asserted by the empty-database smoke suite → PASS
Known limitations:
  - F05-T03 owns appointment create eligibility and idempotency behavior; no API or UI behavior was added here.
Next task:
  - F05-T03, eligible but not claimed.

## F05-T03 — Create appointment with authoritative eligibility and idempotency

Task ID: F05-T03
Completed at: 2026-09-02 18:32 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B03
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/patient-appointments.controller.ts
  - apps/api/src/modules/appointments/patient-appointments.dto.ts
  - apps/api/src/modules/appointments/patient-appointments.module.ts
  - apps/api/src/modules/appointments/patient-appointments.service.ts
  - apps/api/src/modules/scheduling/patient-availability.service.ts
  - apps/api/src/modules/scheduling/admin-scheduling.module.ts
  - apps/api/src/modules/assessments/patient/patient-assessments.module.ts
  - apps/api/src/common/auth/authorization.policy.ts
  - apps/api/src/common/errors/api-error.ts
  - apps/api/src/app.module.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None; the previously committed F05-T02 migration was deployed to the local development database before integration verification.
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm exec tsc -p tsconfig.test.json --noEmit → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (4 tests)
  - git diff --check → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/openapi-contract.spec.ts → expected deferred failure: runtime document includes F05-T03 endpoint while checked-in generated client remains owned by F05-T11.
Result:
  - Patient-only POST /v1/appointments requires an idempotency key and validates the normalized request binding → PASS
  - The use case rechecks Phase 03 eligibility and Phase 04 patient-visible availability at its commit boundary → PASS
  - A successful create atomically persists PENDING state, immutable price snapshot, CREATED history, and a released short-lived hold → PASS
  - Same key/same request returns the original resource; changed request returns IDEMPOTENCY_KEY_REUSED → PASS
  - The active-doctor PostgreSQL exclusion violation maps to APPOINTMENT_SLOT_CONFLICT → PASS
Known limitations:
  - Generated OpenAPI client synchronization is intentionally deferred to F05-T11; this task did not alter generated client files or mock-removal scope.
Next task:
  - F05-T04, eligible but not claimed.

## F05-T04 — Patient appointment list, detail, cancel, and reschedule

Task ID: F05-T04
Completed at: 2026-09-02 18:36 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B04
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/patient-appointments.controller.ts
  - apps/api/src/modules/appointments/patient-appointments.dto.ts
  - apps/api/src/modules/appointments/patient-appointments.service.ts
  - apps/api/src/common/auth/authorization.policy.ts
  - apps/api/src/common/errors/api-error.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None.
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm exec tsc -p tsconfig.test.json --noEmit → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (4 tests)
  - git diff --check → PASS
Result:
  - Patient-scoped list/detail access has pagination, deterministic ordering, and resource ownership enforcement → PASS
  - Patient future PENDING/CONFIRMED cancellation records a CANCELLED transition and optional reason → PASS
  - Reschedule rechecks Phase 03 eligibility and Phase 04 availability, captures a new price snapshot, preserves identity, and writes RESCHEDULED history metadata → PASS
  - Patient read/change permissions reject non-patient roles → PASS
Known limitations:
  - Generated OpenAPI client synchronization remains owned by F05-T11.
Next task:
  - F05-T05, eligible but not claimed.

## F05-T05 — Administrator appointment operations

Task ID: F05-T05
Completed at: 2026-09-02 18:43 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B05
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/admin-appointments.controller.ts
  - apps/api/src/modules/appointments/admin-appointments.dto.ts
  - apps/api/src/modules/appointments/admin-appointments.service.ts
  - apps/api/src/modules/appointments/patient-appointments.module.ts
  - apps/api/src/common/auth/authorization.policy.ts
  - apps/api/src/common/errors/api-error.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None.
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm exec tsc -p tsconfig.test.json --noEmit → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (7 tests)
  - git diff --check → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/openapi-contract.spec.ts → expected deferred failure: runtime document includes Phase 05 appointment routes while checked-in generated client remains owned by F05-T11.
Result:
  - Administrator create-on-behalf requires idempotency, clinic-scoped target patient and offering, authoritative eligibility/availability recheck, price snapshot, released hold, and conflict-safe persistence → PASS
  - Clinic-scoped operational listing supports patient, doctor, status, time-range, and pagination filters with deterministic ordering → PASS
  - Administrator confirm, cancel, and reschedule enforce frozen lifecycle and cancellation policy, record immutable transition history, and preserve reschedule identity/snapshots → PASS
  - Administrator cancellation after scheduled start rejects a blank reason and accepts a non-blank reason → PASS
  - Fixed appointment-management permission permits only ADMIN; appointment resources remain scoped to the active clinic → PASS
Known limitations:
  - Generated OpenAPI client synchronization and appointment mock removal remain owned by F05-T11; no generated client artifact was changed here.
Next task:
  - F05-T06, eligible but not claimed.

## F05-T06 — Daily clinic operations and queue

Task ID: F05-T06
Completed at: 2026-09-02 18:49 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B06
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/admin-appointments.controller.ts
  - apps/api/src/modules/appointments/admin-appointments.service.ts
  - apps/api/src/common/errors/api-error.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None; F05-T02 already owns the QueueEntry persistence and indexes used here.
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm exec tsc -p tsconfig.test.json --noEmit → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (8 tests)
  - git diff --check → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/openapi-contract.spec.ts → expected deferred failure: runtime document includes Phase 05 appointment routes while checked-in generated client remains owned by F05-T11.
Result:
  - Admin check-in and queue transitions enforce the scheduled clinic-local date, persist timestamps/history, and safely return the current resource on repeat → PASS
  - Queue persistence is one entry per appointment; call-next starts the earliest queued appointment and returns QUEUE_EMPTY when no eligible queue entry exists → PASS
  - Start and call-next acquire a transaction-scoped PostgreSQL advisory lock per clinic/doctor and reject a competing in-progress visit with APPOINTMENT_DOCTOR_BUSY → PASS
  - Complete verifies the doctor's current appointment; no-show requires a past scheduled start; both preserve repeat-operation semantics and immutable history → PASS
  - All operations remain fixed-permission ADMIN routes with active-clinic resource scoping → PASS
Known limitations:
  - Generated OpenAPI client synchronization and appointment mock removal remain owned by F05-T11; no generated client artifact was changed here.
Next task:
  - F05-T07, eligible but not claimed.

## F05-T07 — Status history, reason, and operational activity

Task ID: F05-T07
Completed at: 2026-09-02 18:57 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B07
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/admin-appointments.controller.ts
  - apps/api/src/modules/appointments/admin-appointments.dto.ts
  - apps/api/src/modules/appointments/admin-appointments.service.ts
  - apps/api/src/modules/appointments/patient-appointments.controller.ts
  - apps/api/src/modules/appointments/patient-appointments.dto.ts
  - apps/api/src/modules/appointments/patient-appointments.service.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None; F05-T02 already owns AppointmentStatusHistory and OperationalActivity persistence.
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm exec tsc -p tsconfig.test.json --noEmit → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (8 tests)
  - git diff --check → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/openapi-contract.spec.ts → expected deferred failure: runtime document now includes F05-T07 endpoints while checked-in generated client remains owned by F05-T11.
Result:
  - Patient and administrator status-history timelines are paginated, deterministically ordered, and constrained to the authorized appointment resource → PASS
  - Cancellation reason is visible only through the owning patient history or the active-clinic administrator history; actor identifiers are not exposed → PASS
  - Accepted appointment operations atomically create a clinic-scoped operational activity without reason or other patient-sensitive metadata; repeated commands create none → PASS
  - Administrator operational activity feed supports clinic-scoped appointment/patient filters, deterministic pagination, and fixed ADMIN authorization → PASS
Known limitations:
  - Existing historical appointment transitions are not backfilled into OperationalActivity; this task writes the audit projection for accepted operations going forward.
  - Generated OpenAPI client synchronization and mock removal remain owned by F05-T11.
Next task:
  - F05-T08, eligible but not claimed.
