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
