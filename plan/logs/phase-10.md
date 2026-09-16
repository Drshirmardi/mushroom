# Phase 10 Execution Evidence

## F10-T01 — freeze chat consultation contract

Task ID: F10-T01
Completed at: 2026-09-16 +03:30
Agent/Thread: Codex /root
Batch ID: F10-B01
Reviewed by: Codex /root
Changed files:
  - plan/contracts/chat-consultation-v1.md
  - plan/decisions/ADR-0010-chat-consultation-realtime.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/{spec.md,plan.md,research.md,data-model.md,contracts/chat-consultation-v1.md,quickstart.md,tasks.md,checklists/requirements.md}
  - plan/STATUS.md
Migrations:
  - none
Tests run:
  - SpecKit prerequisite check with required tasks → PASS
  - requirement identity scan: 54 FRs, 0 duplicate IDs, 0 unresolved clarification markers → PASS
  - roadmap/SpecKit trace scan: 11 official task lines, 11 trace rows → PASS
  - contract/ADR presence check → PASS
  - git diff --check → PASS
Result:
  - appointment-bound participant, retention/legal-hold, immutable moderation, report/block, waiting-room/presence, REST idempotency, sequence/cursor/reconnect, receipt, capacity, and text-only media policy → PASS
  - PostgreSQL/REST authoritative with pinned Socket.IO signaling-only architecture; Redis/Centrifugo/external messenger deferred → PASS
  - no product source, migration, generated client, dependency, lockfile, attachment, video, or user-owned file changed → PASS
Known limitations:
  - Runtime implementation and all dependency selection remain task-owned; F10-T04 must perform the required Socket.IO security-advisory/version review before adding pinned dependencies.
Next batch:
  - F10-B02 / F10-T02 only

## F10-T02 — persistence boundary (BLOCKED)

Task ID: F10-T02
Attempted at: 2026-09-16 +04:05
Agent/Thread: Codex /root
Batch ID: F10-B02
Status: BLOCKED — no task acceptance or commit
Pending owned files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260916034500_phase_10_chat_persistence/migration.sql
  - apps/api/test/chat-migrations.integration.spec.ts
  - plan/STATUS.md
Work completed but not accepted:
  - additive appointment-bound text-chat schema/migration design for conversation, participant, sequence/idempotency,
    receipt, report/decision, scoped block, immutable moderation, retention/legal-hold and safe audit records.
  - PostgreSQL constraints/triggers for ONLINE appointment binding, clinic/resource references, unique sequence and
    idempotency identity, 4,000-character text ceiling, moderation shape, immutable evidence, monotonic receipts,
    block lifecycle and legal-hold lifecycle.
  - a disposable real-PostgreSQL test for Phase 09 upgrade, idempotent seed and frozen persistence invariants.
Checks completed:
  - `prisma validate --config prisma.config.ts` → PASS
  - `prisma generate` → PASS
  - API TypeScript typecheck → PASS
  - `git diff --check` → PASS
Blocking checks:
  - targeted `chat-migrations.integration.spec.ts` could not connect to PostgreSQL at `localhost:5432`.
  - Docker Desktop engine was unavailable. Launching its existing desktop application showed that the backend crashes
    before starting an engine; its only displayed recovery is a destructive factory reset, which is not authorized.
Required safe next action:
  - repair or provide the repository PostgreSQL environment without deleting user data, then rerun migration replay,
    Phase 09 upgrade, seed idempotency, persistence constraints and schema-drift verification; only then review, mark
    DONE and create the isolated F10-T02 commit. Do not start F10-T03.

## F10-T02 — persist chat consultation records

Task ID: F10-T02
Completed at: 2026-09-16 +04:50
Agent/Thread: Codex /root
Batch ID: F10-B02
Reviewed by: Codex /root
Changed files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20260916034500_phase_10_chat_persistence/migration.sql
  - apps/api/test/chat-migrations.integration.spec.ts
  - plan/STATUS.md
  - plan/logs/phase-10.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/tasks.md
Persistence accepted:
  - conversation is one-to-one with an existing ONLINE appointment and copies its clinic/patient/doctor boundary.
  - participant, ordered immutable text message, idempotency identity, monotonic receipt, report/decision, scoped
    block, moderation action, retention/legal-hold and safe audit records are clinic-scoped with foreign keys,
    constraints and indexes.
  - PostgreSQL protects appointment binding, sequence/idempotency uniqueness, 4,000-character body ceiling,
    immutable evidence, restricted-message shape, receipt monotonicity, block lifecycle and legal-hold lifecycle.
  - attachment/video fields, object storage, media provider, realtime transport, REST endpoints and generated clients
    are intentionally absent from this persistence task.
Verification:
  - `vitest run test/migrations.integration.spec.ts test/chat-migrations.integration.spec.ts --no-file-parallelism` →
    PASS (2 files, 4 tests): clean replay, accepted Phase 09 upgrade, two idempotent seed runs and chat invariants.
  - `prisma migrate deploy` and `prisma migrate status` → PASS (31 migrations, database up to date).
  - migrations-to-schema and database-to-schema `prisma migrate diff` → empty migration / PASS.
  - development `prisma db seed` twice → PASS and idempotent.
  - Prisma validate/generate, API typecheck and `git diff --check` → PASS.
  - coordinator review confirmed no user-owned `.gitignore` or Phase 12 file was staged or included.
Next batch:
  - F10-B03 / F10-T03 only

## F10-T03 — appointment-bound REST chat boundary

Task ID: F10-T03
Completed at: 2026-09-17 +02:50
Agent/Thread: Codex /root
Batch ID: F10-B03
Status: ACCEPTED — isolated task commit pending
Changed files:
  - apps/api/src/app.module.ts
  - apps/api/src/common/auth/authorization.policy.ts
  - apps/api/src/common/errors/api-error.ts
  - apps/api/src/modules/communications/chat/**
  - apps/api/test/chat-test-support.ts
  - apps/api/test/chat-rest.integration.spec.ts
  - apps/api/test/chat-authorization.integration.spec.ts
  - apps/api/test/chat-moderation.integration.spec.ts
  - apps/api/test/openapi-contract.spec.ts
  - packages/api-client/openapi.json
  - packages/api-client/src/schema.generated.ts
  - plan/STATUS.md
  - plan/logs/phase-10.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/tasks.md
Accepted boundary:
  - REST-only chat endpoints enforce authenticated role permission plus active clinic, online Appointment and exact
    conversation membership server-side. STAFF and an assigned DoctorProfile without a linked User cannot access it;
    ADMIN acts only as clinic/operator and never as a doctor.
  - PostgreSQL remains authoritative: messages receive a transactional sequence, send retries use the frozen
    `(conversation, sender, clientMessageId)` identity, history uses an opaque validated cursor, and rate/window/block
    failures return stable API errors. This task emits no realtime or notification signal.
  - Immutable report, restricted-message tombstone/review, scoped pending block and ADMIN moderation paths are audited;
    ordinary history cannot reveal restricted body content.
  - OpenAPI and the generated client include the new REST slice. Socket.IO, receipt/outbox, presence/waiting room,
    app/dashboard UI, attachment and video remain expressly out of scope.
Verification:
  - `vitest run test/chat-rest.integration.spec.ts --no-file-parallelism` → PASS (1 file, 1 test).
  - `vitest run test/chat-authorization.integration.spec.ts --no-file-parallelism` → PASS (1 file, 2 tests).
  - `vitest run test/chat-moderation.integration.spec.ts --no-file-parallelism` → PASS (1 file, 1 test).
  - `vitest run test/openapi-contract.spec.ts` → PASS (1 file, 7 tests).
  - API production and test TypeScript typechecks → PASS.
  - OpenAPI export and generated API-client typecheck → PASS.
  - `git diff --check` → PASS.
  - Coordinator review confirmed `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are user-owned and excluded
    from the task stage/commit.
Next batch:
  - F10-B04 / F10-T04 only

## F10-T04 — Socket.IO authenticated recovery boundary

Task ID: F10-T04
Completed at: 2026-09-17 +03:10
Batch ID: F10-B04
Status: ACCEPTED — isolated task commit pending
Changed files:
  - apps/api/package.json
  - pnpm-lock.yaml
  - apps/api/src/modules/communications/chat/chat.module.ts
  - apps/api/src/modules/communications/chat/chat.service.ts
  - apps/api/src/modules/communications/chat/realtime/**
  - apps/api/test/chat-realtime.gateway.spec.ts
  - plan/STATUS.md
  - plan/logs/phase-10.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/tasks.md
Accepted boundary:
  - pinned NestJS Socket.IO gateway dependencies; no Redis, Centrifugo or external realtime service.
  - handshake accepts access token only in `auth`; token-like URL query is rejected and token is never logged.
  - each join/sync rechecks appointment-bound authorization, current eligibility and block state; the server alone joins
    the authorized room. Three live connections per user are enforced and token expiry closes the connection.
  - PostgreSQL high-water sync is bounded and authoritative. REST transaction completion triggers best-effort,
    at-least-once `message:committed`; signaling failure cannot roll back the durable message.
Verification:
  - `vitest run test/chat-realtime.gateway.spec.ts --no-file-parallelism` → PASS (3 tests), including live Socket.IO
    handshake/join and REST post-commit signal against PostgreSQL.
  - API production/test TypeScript typechecks and `git diff --check` → PASS.
  - `pnpm audit --prod --json` dependency review: no Socket.IO/Nest websocket advisory; existing unrelated findings
    remain outside this task's scope.
  - `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` excluded from stage/commit.
Next batch:
  - F10-B05 / F10-T05 only
