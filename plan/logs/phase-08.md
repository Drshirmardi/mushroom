# Phase 08 Execution Evidence

## F08-T01 — metric/unit/range and health-observation query contract

Task ID: F08-T01
Completed at: 2026-09-05 09:31 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B01
Reviewed by: Codex /root
Changed files:
  - plan/contracts/health-observation-v1.md
  - plan/STATUS.md
  - plan/phases/08-FOLLOWUP-CONTENT.md
  - specs/006-adopt-phase-08/contracts/phase-08-adoption.md
  - specs/006-adopt-phase-08/tasks.md
  - plan/logs/phase-08.md
Migrations:
  - none
Tests run:
  - metric/range reconciliation against the existing pain, mood, and onboarding UI sources → PASS
  - contract ownership and non-goal review → PASS
  - git diff --check → PASS
Result:
  - PAIN, MOOD, SLEEP_HOURS, STRESS, ENERGY, and WEIGHT have fixed units and accepted ranges → PASS
  - patient and authorized dashboard cursor-query contract, ordering, pagination, resource scope, and truthful-empty-result rules are frozen → PASS
  - no persistence, write API, UI integration, notification, reminder, outbox, worker, or generated-client work was added → PASS
Known limitations:
  - F08-T02 owns the implementation and verification of the frozen contract.
Next batch:
  - F08-B02 — F08-T02

## F08-T02 — tracker write/query and dashboard health views

Task ID: F08-T02
Completed at: 2026-09-05 09:41 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B02
Reviewed by: Codex /root
Changed files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260905093300_phase_08_health_observations/migration.sql
  - apps/api/src/modules/assessments/health/*
  - apps/api/src/app.module.ts
  - apps/api/test/health-observations.integration.spec.ts
  - apps/dashboard/src/features/health-tracking/health-tracking-page.tsx
  - apps/dashboard/src/lib/health-observations-api.ts
  - packages/api-client/openapi.json
  - packages/api-client/src/schema.generated.ts
  - plan/STATUS.md
  - plan/phases/08-FOLLOWUP-CONTENT.md
  - specs/006-adopt-phase-08/tasks.md
  - plan/logs/phase-08.md
Migrations:
  - 20260905093300_phase_08_health_observations → PASS (local PostgreSQL deploy)
Tests run:
  - pnpm --filter @sabz-zendegi/api test -- health-observations.integration.spec.ts → PASS
  - pnpm --filter @sabz-zendegi/api typecheck → PASS
  - pnpm --filter @sabz-zendegi/api-client build → PASS
  - pnpm --filter @sabz/dashboard typecheck → PASS
  - Prisma validate/generate, OpenAPI export/client generation, and git diff --check → PASS
Result:
  - contract-scoped patient tracker writes and own/authorized dashboard reads, UTC filters, stable cursor ordering, audit events, and resource authorization are implemented → PASS
  - dashboard health tracking reads authorized patient observations through the generated API client; fabricated dashboard trends are removed from this view → PASS
Known limitations:
  - app tracker connection is owned by F08-T08; notification/content/reminder work remains out of scope.
Next batch:
  - F08-T03 after normal prerequisite and ownership review.

## F08-T03 — Mezaj result from a versioned assessment

Task ID: F08-T03
Completed at: 2026-09-05 09:47 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B03
Reviewed by: Codex /root
Changed files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260905094500_phase_08_mezaj_results/migration.sql
  - apps/api/src/modules/assessments/application/assessment-audit.ts
  - apps/api/src/modules/assessments/patient/patient-assessments.{service,controller,dto}.ts
  - apps/api/test/mezaj-results.integration.spec.ts
  - packages/api-client/openapi.json
  - packages/api-client/src/schema.generated.ts
  - plan/STATUS.md
  - plan/phases/08-FOLLOWUP-CONTENT.md
  - specs/006-adopt-phase-08/tasks.md
  - plan/logs/phase-08.md
Migrations:
  - 20260905094500_phase_08_mezaj_results → PASS (local PostgreSQL deploy)
Tests run:
  - pnpm --filter @sabz-zendegi/api test -- mezaj-results.integration.spec.ts → PASS
  - pnpm --filter @sabz-zendegi/api typecheck → PASS
  - pnpm generate:api-client and pnpm --filter @sabz-zendegi/api-client build → PASS
  - git diff --check → PASS
Result:
  - a MEZAJ-keyed assessment completion transaction persists one immutable source-linked MezajResult with its frozen result-band snapshot → PASS
  - patient-only latest-result API is authorized and audited; app rendering remains owned by F08-T08 → PASS
Next batch:
  - F08-T04 after normal prerequisite and ownership review.

## F08-T04 — notification preferences and in-app read state

Task ID: F08-T04
Batch ID: F08-B04
Result: notification, in-app delivery, and patient preference persistence plus patient-owned list/read/read-all/preference APIs are implemented.
Tests run: notification PostgreSQL authorization/read-state integration test, Prisma migration deploy/typecheck, generated OpenAPI client build, and diff check → PASS.
Next batch: F08-T05 after prerequisite review.
## F08-T05 — content publication lifecycle و media policy

Task ID: F08-T05
Completed at: 2026-09-05 10:01 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B05
Reviewed by: Codex /root
Changed files:
  - apps/api/prisma/schema.prisma and migration 20260905062736_phase_08_content_publication
  - apps/api/src/modules/content/** and authorization policy
  - apps/api/test/content-publication.integration.spec.ts
  - packages/api-client/openapi.json and generated schema
Migrations:
  - Content lifecycle migration applied to the local PostgreSQL rehearsal database.
Tests run:
  - apps/api node_modules/.bin/vitest.cmd run --no-file-parallelism test/content-publication.integration.spec.ts → PASS
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - corepack pnpm generate:api-client → PASS
  - git diff --check → PASS
Result:
  - ArticleCategory, Article, and Banner persist DRAFT/PUBLISHED/ARCHIVED lifecycle state; patient routes expose only published records.
  - Content updates are admin-authorized and audited; media stays external metadata only, with opaque-key, type, and size validation.
Known limitations:
  - Upload implementation and interface connections remain owned by later Phase 08 tasks; no binary media is persisted.
Next task:
  - F08-T06
## F08-T06 — ADR و bootstrap outbox/worker فقط برای reminder واقعی

Task ID: F08-T06
Completed at: 2026-09-05 10:04 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B06
Reviewed by: Codex /root
Tests run:
  - clean PostgreSQL migration replay and deploy → PASS
  - outbox.integration.spec.ts → PASS
Result:
  - Durable uniquely keyed outbox and retrying worker bootstrap added; F08-T07 retains reminder event and delivery ownership.
Next task:
  - F08-T07

## F08-T07 — appointment و treatment reminders idempotent

Task ID: F08-T07
Completed at: 2026-09-05 10:57 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B07
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/appointments/{admin-appointments.service,patient-appointments.module,patient-appointments.service}.ts
  - apps/api/src/modules/assessments/notifications/notifications.service.ts
  - apps/api/src/modules/clinical/{clinical.module,treatment-activity.service}.ts
  - apps/api/src/modules/outbox/{outbox.module,outbox.service,outbox.worker,reminder.service}.ts
  - apps/api/test/{patient-appointments.integration,treatment-activity.integration,reminders.integration}.spec.ts
  - plan/{STATUS.md,phases/08-FOLLOWUP-CONTENT.md,logs/phase-08.md}
  - specs/006-adopt-phase-08/{spec.md,plan.md,quickstart.md,tasks.md,checklists/requirements.md,contracts/phase-08-adoption.md}
Migrations:
  - existing 20260905063352_phase_08_outbox_bootstrap deployed to the local PostgreSQL rehearsal database → PASS
Tests run:
  - corepack pnpm --filter @sabz-zendegi/api typecheck → PASS
  - apps/api/node_modules/.bin/tsc.cmd -p tsconfig.test.json --noEmit → PASS
  - apps/api/node_modules/.bin/vitest.cmd run --no-file-parallelism test/reminders.integration.spec.ts → PASS (2 tests)
  - focused appointment create/reschedule/cancel and treatment schedule/reschedule/complete/cancel PostgreSQL integrations → PASS
  - git diff --check → PASS
Result:
  - patient and administrator appointment creation/rescheduling, plus treatment task creation/rescheduling, create one uniquely keyed outbox reminder per current UTC schedule → PASS
  - rescheduled, cancelled, and early-completed schedule sources suppress stale pending reminders → PASS
  - notification creation and outbox acknowledgement share one transaction; transient delivery failure retries once and never duplicates the in-app notification → PASS
  - notification preferences suppress in-app output while recording the outbox event as delivered → PASS
Known limitations:
  - Phase 08 restart/timezone/browser end-to-end validation remains owned by F08-T10.
Next task:
  - F08-T08 (eligible but not started)

## F08-T08 — اتصال app tracker/notification/article

Task ID: F08-T08
Completed at: 2026-09-05 11:15 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B08
Reviewed by: Codex /root
Changed files:
  - apps/app/src/lib/follow-up-api.{ts,spec.ts}
  - apps/app/src/app/(app)/{trackers/pain,trackers/mood,mezaj,notifications,profile/notifications,articles,articles/[title]}/page.tsx
  - plan/{STATUS.md,phases/08-FOLLOWUP-CONTENT.md,logs/phase-08.md}
  - specs/006-adopt-phase-08/{spec.md,plan.md,quickstart.md,tasks.md}
Migrations:
  - none
Tests run:
  - apps/app/node_modules/.bin/vitest.cmd run src/lib/follow-up-api.spec.ts → PASS (3 tests)
  - corepack pnpm --filter @sabz/app typecheck → PASS
  - git diff --check → PASS
Result:
  - Pain and mood trackers persist and render contract-scoped HealthObservation records rather than local chart fixtures.
  - Mezaj reads the assessment-derived result; notification list/read/read-all/preferences use persisted APIs and update UI only after request success.
  - Article list/detail use patient published-content APIs, with loading, error, empty, and access-denied states rendered without a local fallback.
Known limitations:
  - Integrated restart/retry/idempotency, timezone, and browser validation remains F08-T10; in-scope mock-scope review remains F08-T11.
Next batch:
  - F08-B09 — F08-T09 (eligible but not started)

## F08-T09 — اتصال dashboard health/notification/content

Task ID: F08-T09
Completed at: 2026-09-05 11:25 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B09
Reviewed by: Codex /root
Changed files:
  - apps/dashboard/src/{features/{health-tracking,notifications,content},lib/phase-08-api.{ts,spec.ts}}
  - apps/api/src/modules/assessments/notifications/* and apps/api/test/notifications.integration.spec.ts
  - packages/api-client/{openapi.json,src/schema.generated.ts}
  - plan/{STATUS.md,phases/08-FOLLOWUP-CONTENT.md,logs/phase-08.md} and specs/006-adopt-phase-08/*
Migrations:
  - none
Tests run:
  - API typecheck and notification PostgreSQL authorization integration → PASS
  - API OpenAPI export, generated-client build, dashboard typecheck, focused dashboard adapter test, and git diff --check → PASS
Result:
  - Dashboard health chart uses persisted observation timestamps; notification and content screens use authorized clinic APIs with truthful loading, error, empty, and forbidden states.
  - An administrator-only clinic notification list completes the previously missing dashboard read boundary; patient access is rejected.
Next batch:
  - F08-B10 — F08-T10 (eligible but not started)

## F08-T10 — restart/retry/idempotency، timezone و browser E2E

Task ID: F08-T10
Completed at: 2026-09-05 11:35 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B10
Reviewed by: Codex /root
Changed files:
  - plan/{STATUS.md,phases/08-FOLLOWUP-CONTENT.md,logs/phase-08.md}
  - specs/006-adopt-phase-08/{spec.md,plan.md,quickstart.md,tasks.md}
Migrations:
  - none
Tests run:
  - reminders and patient-appointment PostgreSQL integrations → PASS (8 tests): retry/idempotency, restart-safe delivery, appointment idempotency, and Tehran timezone boundary
  - health-observation and treatment-activity PostgreSQL integrations → PASS (4 tests): persisted patient-to-authorized-dashboard observation source and repeat-safe treatment activity
  - local browser journey → PASS: authenticated dashboard notifications/content render truthful empty states; health tracking renders its authorization boundary; patient app renders the corresponding authorization state without a mock fallback
  - git diff --check → PASS
Result:
  - Accepted Phase 08 resilience and browser gate: no demonstrated restart, retry, idempotency, timezone, shared-source, or truthful UI-state defect required a repair.
Next batch:
  - F08-B11 — F08-T11 (eligible but not started)

## F08-T11 — حذف mock scope و review Milestone C

Task ID: F08-T11
Completed at: 2026-09-05 11:50 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B11
Reviewed by: Codex /root
Changed files:
  - apps/dashboard/src/components/layout/{header,notif-panel}.tsx
  - apps/dashboard/src/lib/nav.ts
  - apps/dashboard/src/data/notifications.ts (removed)
  - plan/{STATUS.md,phases/08-FOLLOWUP-CONTENT.md,logs/phase-08.md}
  - specs/006-adopt-phase-08/{spec.md,plan.md,quickstart.md,tasks.md,contracts/phase-08-adoption.md}
Migrations:
  - none
Tests run:
  - dashboard typecheck and focused Phase 08 adapter test → PASS
  - runtime OpenAPI export/generated-client freshness → PASS (no drift)
  - scoped app/dashboard mock and browser-local-state review → PASS; the assessment submission idempotency key uses session storage but is outside the Phase 08 UI scope and is not a data fallback
  - local browser dashboard notification panel → PASS; it renders the live empty state without a static badge, dot, or fixture
  - `git diff --check` → PASS
  - Spec Kit cross-artifact analysis and convergence → PASS; all 11 requirements map to the completed roadmap tasks, no constitution conflict or implementation gap, and no convergence task appended
Result:
  - Removed the remaining in-scope dashboard notification fixture, static notification badge, and fabricated unread dot. The panel now reads the authorized clinic notification source and renders truthful loading, error, and empty states.
  - Phase 08 is `READY_FOR_REVIEW`; independent closure review remains required and Phase 09 has not been started.

## Independent Phase 08 closure review — BLOCKED

Reviewed at: 2026-09-05 12:00 +03:30
Reviewer: Codex /root
Finding:
  - HIGH — `F08-T10` / Phase 08 exit criterion “reminder work is retryable after restart”: `OutboxService.claim()` only selects `PENDING` events, while `OutboxWorker` has no startup or lease-expiry recovery for `PROCESSING` rows. If the process stops after a claim and before its delivery transaction commits, the row remains `PROCESSING` and is never selected again. The existing retry test covers a caught delivery failure, not an interrupted claimed event.
Evidence:
  - apps/api/src/modules/outbox/outbox.service.ts: `claim()` filters on `status: PENDING` only.
  - apps/api/src/modules/outbox/outbox.worker.ts: startup schedules `tick()` but performs no stale-claim recovery.
  - apps/api/test/reminders.integration.spec.ts: retry is induced by a caught mock rejection and returns the row to `PENDING`; it does not simulate process loss after claim.
Safe remediation:
  - Rework `F08-T10` only: reclaim lease-expired/stale `PROCESSING` rows to `PENDING` (or atomically claim them), preserve the existing idempotency key and notification-plus-delivery transaction, and add a PostgreSQL regression that claims an event, simulates restart, and proves exactly one eventual notification.
Closure result:
  - Phase 08 is `BLOCKED`; no closure commit was created and Phase 09 remains `NOT_STARTED`.

Closure verification re-run:
  - Focused Phase 08 PostgreSQL integrations: 6 files / 15 tests passed; 2 files / 2 tests failed.
  - `mezaj-results.integration.spec.ts` attempts to create a fixed `MEZAJ` version 1 and clears only its in-memory tracking sets, so repeated execution encounters the persisted `(clinic_id, assessment_key, locale, version_number)` uniqueness constraint. This is a repeatability gap for the F08-T03 verification fixture, not evidence that the immutable result contract itself is false.
  - `patient-appointments.integration.spec.ts` hit the existing active-doctor overlap exclusion constraint while exercising the Tehran-day state-machine fixture. Its time-slot fixture must be isolated from persistent/local concurrent appointment state before it can serve as independent F08-T10 timezone evidence.
  - These test-fixture gaps reinforce that F08-T10 cannot pass its independent restart/timezone gate. Safe repair stays within F08-T10 verification ownership: use unique/cleaned Phase 08 test fixtures and then rerun the affected focused tests after the stale-claim fix.

## F08-T10 rework — stale claim recovery accepted

Task ID: F08-T10
Completed at: 2026-09-05 12:20 +03:30
Agent/Thread: Codex /root
Batch ID: F08-B10R
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/outbox/outbox.service.ts
  - apps/api/test/{outbox,reminders,mezaj-results,patient-appointments}.integration.spec.ts
  - plan/{STATUS.md,phases/08-FOLLOWUP-CONTENT.md,logs/phase-08.md}
  - specs/006-adopt-phase-08/{spec.md,plan.md,quickstart.md,tasks.md,contracts/phase-08-adoption.md}
Migrations:
  - none; existing OutboxEvent `status`, `lockedAt`, `availableAt`, and idempotency key provide the required lease decision and transaction boundary.
Tests run:
  - Phase 08 PostgreSQL integrations: outbox, reminders, patient appointments, treatment activity, Mezaj, notifications, health observations → PASS (7 files, 18 tests)
  - content-publication PostgreSQL integration → PASS (1 file, 1 test)
  - API typecheck, test TypeScript configuration, Prisma schema validation, and `git diff --check` → PASS
Result:
  - Normal outbox claim now atomically returns `PROCESSING` rows whose `lockedAt` is older than the defined 60-second lease to `PENDING`, then reclaims them. Fresh claims are not eligible for recovery.
  - PostgreSQL restart regression simulates a claimed reminder whose worker disappears, deterministically ages the claim, and proves exactly one notification and a `DELIVERED` terminal event after recovery; a subsequent worker tick does not duplicate delivery. Existing idempotency and notification-plus-delivery transaction remain unchanged.
  - Mezaj verification uses unique locale/version fixture identifiers because completed/published records are immutable. Tehran state-machine verification creates and cleans an isolated published doctor, specialty, and service so existing active scheduling cannot collide.
  - This explicitly remediates the independent closure-review HIGH finding. Phase 08 is restored to `READY_FOR_REVIEW`; no closure review was performed in this batch and Phase 09 remains `NOT_STARTED`.

## Independent Phase 08 closure review — PASSED / CLOSED

Reviewed at: 2026-09-05 12:25 +03:30
Reviewer: Codex /root
Scope:
  - Independent review of the authoritative Phase 08 roadmap, all F08-T01 through F08-T11 acceptance criteria, task evidence, STATUS/checklist state, and Spec Kit artifacts.
Verification:
  - Focused Phase 08 PostgreSQL integrations (outbox, reminders, patient appointments, treatment activity, Mezaj, notifications, health observations, and content publication) → PASS (8 files, 19 tests).
  - Repeatability rerun of Mezaj and Tehran appointment fixtures → PASS (2 files, 7 tests).
  - API, API-test, patient-app, and dashboard typechecks; Prisma schema validation and migration status → PASS; the rehearsal database is current across 27 migrations.
  - Runtime OpenAPI export, generated API-client build, and generated-artifact diff → PASS with no drift.
  - Diff/whitespace validation → PASS.
  - Browser recheck → PASS: the authorized dashboard notification surface renders the live empty state, and an unauthorized patient notification surface renders its authorization boundary without fabricated fallback data. The recorded F08-T10 authenticated browser journey remains applicable because the stale-claim remediation changed only backend outbox code.
Review findings:
  - F08-T10 stale `PROCESSING` rows are recovered only after the 60-second lease; fresh claims remain unavailable to other workers. The PostgreSQL interruption regression proves one eventual notification, `DELIVERED` terminal state, and no duplicate after a further worker/restart attempt. The existing idempotency key and notification-plus-delivery transaction remain intact.
  - Reminder preferences, recipient/resource authorization, metadata-only audit behavior, Tehran timezone boundaries, shared patient/dashboard observation source, and published-only content visibility are covered by the accepted targeted integrations and adapters.
  - Spec Kit analysis maps every Phase 08 requirement and success criterion to F08-T01 through F08-T11 with no inconsistency; convergence found no implementation gap and appended no task.
  - No Phase 08 changes introduce AI/LLM behavior, a second reminder scheduler/outbox, stale notification mocks/local-state fallbacks, generated-contract drift, unrelated changes, or Phase 09 implementation.
Closure result:
  - Phase 08 is `DONE (CLOSED)`. Phase 09 remains `NOT_STARTED`; no Phase 09 task has been claimed or started.
