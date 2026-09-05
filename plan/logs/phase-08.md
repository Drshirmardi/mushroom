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
