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

## F05-T08 — App appointment flow and MVP payment/wallet removal

Task ID: F05-T08
Completed at: 2026-09-02 19:05 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B08
Reviewed by: Codex /root
Changed files:
  - apps/app/src/app/(app)/appointments/page.tsx
  - apps/app/src/app/(app)/appointments/[id]/page.tsx
  - apps/app/src/app/(app)/appointments/book/confirm/page.tsx
  - apps/app/src/app/(app)/appointments/book/schedule/page.tsx
  - apps/app/src/app/(app)/appointments/book/success/page.tsx
  - apps/app/src/app/(app)/appointments/waiting-room/page.tsx
  - apps/app/src/app/(app)/appointments/summary/page.tsx
  - apps/app/src/lib/api.ts
  - apps/app/src/lib/appointment-api.ts
  - apps/app/src/lib/appointment-api.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None.
Tests run:
  - corepack pnpm --filter @sabz/app typecheck → PASS
  - corepack pnpm --filter @sabz/app test -- appointment-api.spec.ts → PASS (24 tests)
  - corepack pnpm --filter @sabz/app build → PASS
  - git diff --check → PASS
Result:
  - Patient appointment list/detail, create, cancellation, and reschedule use authenticated live `/v1/appointments` endpoints with explicit loading/error/retry states → PASS
  - Booking confirmation submits one idempotent create request or the authorized reschedule request; successful resource IDs are displayed without fixture identifiers → PASS
  - No wallet/card choice, payment simulation, price claim, or payment prerequisite remains in the patient booking flow → PASS
  - Legacy online waiting-room and consultation-summary fixtures are explicitly unavailable until their later-phase scope, rather than presenting false operational data → PASS
Known limitations:
  - Generated appointment endpoint types remain owned by F05-T11. The task uses a narrow local transport wrapper until that client synchronization occurs.
  - Cross-app browser E2E remains owned by F05-T13.
Next task:
  - F05-T09, eligible but not claimed.

## F05-T09 — Dashboard appointments, calendar, and queue

Task ID: F05-T09
Completed at: 2026-09-02 19:11 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B09
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/admin-appointments.controller.ts
  - apps/api/src/modules/appointments/admin-appointments.dto.ts
  - apps/api/src/modules/appointments/admin-appointments.service.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - apps/dashboard/src/features/appointments/appointments-page.tsx
  - apps/dashboard/src/features/calendar/calendar-page.tsx
  - apps/dashboard/src/features/queue/queue-page.tsx
  - apps/dashboard/src/lib/api.ts
  - apps/dashboard/src/lib/appointment-api.ts
  - apps/dashboard/src/lib/appointment-api.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None.
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm exec tsc -p tsconfig.test.json --noEmit → PASS
  - NODE_ENV=development DATABASE_URL=<repository local URL> corepack pnpm exec vitest run --no-file-parallelism test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (8 tests)
  - corepack pnpm --filter @sabz/dashboard typecheck → PASS
  - corepack pnpm --filter @sabz/dashboard test -- appointment-api.spec.ts → PASS (31 tests)
  - corepack pnpm --filter @sabz/dashboard build → PASS
  - git diff --check → PASS
Result:
  - Dashboard appointment list and calendar use authenticated, paginated clinic appointment data; no appointment fixture is consumed in these views → PASS
  - Dashboard exposes only state-machine operations already authorized by the API and refreshes from the persisted response → PASS
  - Read-only `/v1/admin/appointments/queue` derives from QueueEntry and orders by queuedAt/id, so the dashboard queue preserves the same source/order as call-next → PASS
  - Queue view displays only persisted queued/in-progress appointments and invokes the existing guarded start command → PASS
Known limitations:
  - Generated OpenAPI client synchronization remains F05-T11 ownership; dashboard uses a narrow local transport wrapper until then.
  - Dashboard Home V1 aggregation and activity widgets remain F05-T10 ownership.
Next task:
  - F05-T10, eligible but not claimed.

## F05-T10 — Dashboard Home V1

Task ID: F05-T10
Completed at: 2026-09-02
Agent/Thread: Codex /root
Batch ID: F05-B10
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/admin-appointments.controller.ts
  - apps/api/src/modules/appointments/admin-appointments.dto.ts
  - apps/api/src/modules/appointments/admin-appointments.service.ts
  - apps/api/test/patient-appointments.authorization.spec.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - apps/dashboard/src/features/dashboard/dashboard-page.tsx
  - apps/dashboard/src/lib/appointment-api.ts
  - apps/dashboard/src/lib/appointment-api.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
Migrations:
  - None.
Tests run:
  - NODE_ENV=development pnpm --filter @sabz-zendegi/api test -- --run test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (8 tests; real PostgreSQL).
  - pnpm --dir apps/dashboard test -- --run src/lib/appointment-api.spec.ts → PASS.
  - pnpm --dir apps/dashboard typecheck → PASS.
  - pnpm --filter @sabz-zendegi/api typecheck → PASS.
  - pnpm --dir apps/dashboard build → BLOCKED by an unrelated existing Next prerender failure in DashboardSessionGate on /_global-error and /discounts after compilation and TypeScript passed.
Result:
  - clinic-scoped dashboard summary provides clinic-local today bounds, visit-mode totals, pending requests, lifecycle counts, average checked-in-to-started wait, ordered today plan, and real appointment activity → PASS.
  - Dashboard Home renders only these sourced appointment widgets alongside pre-existing live patient/assessment widgets; no financial/order/treatment/common-disease/mezaj widget was introduced → PASS.
  - authorization and PostgreSQL summary integration cover administrator access, activity, and current queue state → PASS.
Known limitations:
  - Generated OpenAPI/client synchronization remains intentionally deferred to F05-T11.
  - Dashboard production build has an unrelated pre-existing session-gate prerender failure and is not treated as F05-T10 completion work.
Next task:
  - F05-T11, eligible but not claimed.

## F05-T11 — OpenAPI/client and mock removal

Task ID: F05-T11
Completed at: 2026-09-02
Agent/Thread: Codex /root
Batch ID: F05-B11
Reviewed by: Codex /root
Changed files:
  - packages/api-client/openapi.json
  - packages/api-client/src/schema.generated.ts
  - apps/dashboard/src/data/appointments.ts (removed)
  - apps/dashboard/src/lib/nav.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
Migrations:
  - None.
Tests run:
  - pnpm generate:api-client → PASS.
  - pnpm --filter @sabz-zendegi/api-client typecheck → PASS.
  - pnpm --filter @sabz-zendegi/api-client test → PASS.
  - pnpm --filter @sabz-zendegi/api test -- --run test/openapi-contract.spec.ts → PASS (5 tests).
  - pnpm --dir apps/dashboard test -- --run src/lib/appointment-api.spec.ts → PASS.
  - pnpm --dir apps/dashboard typecheck → PASS.
Result:
  - checked-in OpenAPI document equals the runtime Nest document and generated TypeScript includes all Phase 05 appointment/operations endpoints → PASS.
  - obsolete dashboard appointment fixture and static appointment/queue counters were removed; live appointment screens continue using the Phase 05 routes → PASS.
Known limitations:
  - None for this task.
Next task:
  - F05-T12, eligible but not claimed.

## F05-T12 — concurrency, idempotency, authorization and state-machine tests

Task ID: F05-T12
Completed at: 2026-09-02 19:29 +03:30
Agent/Thread: Codex /root
Batch ID: F05-B12
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/patient-appointments.service.ts
  - apps/api/test/patient-appointments.integration.spec.ts
  - plan/STATUS.md
  - plan/phases/05-APPOINTMENT-OPERATIONS.md
  - specs/003-adopt-phase-05/tasks.md
  - plan/logs/phase-05.md
Migrations:
  - None.
Tests run:
  - LOG_LEVEL=fatal pnpm --filter @sabz-zendegi/api test -- --run test/patient-appointments.integration.spec.ts --testNamePattern='100 concurrent' → PASS (1 test; real PostgreSQL).
  - LOG_LEVEL=fatal pnpm --filter @sabz-zendegi/api test -- --run test/patient-appointments.integration.spec.ts test/patient-appointments.authorization.spec.ts → PASS (9 tests; real PostgreSQL).
  - pnpm --filter @sabz-zendegi/api typecheck → PASS.
  - git diff --check → PASS.
Result:
  - 100 concurrent requests for one available slot yield exactly one 201 response, 99 APPOINTMENT_SLOT_CONFLICT responses, and one persisted appointment → PASS.
  - same-key replay/different-payload rejection, patient ownership authorization, and repeat-safe check-in/queue/call-next/complete/no-show transitions remain covered by the PostgreSQL/API suite → PASS.
  - booking preflight no longer pins interactive-transaction connections while querying authoritative eligibility and availability; the transaction serializes capacity with a transaction-scoped advisory lock and retains the exclusion constraint as final enforcement → PASS.
  - state-machine fixture selects a doctor without conflicting local seeded appointments at its exercised intervals → PASS.
Known limitations:
  - None for this task.
Next task:
  - F05-T13, eligible but not claimed.
