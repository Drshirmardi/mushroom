# Phase 10 Execution Evidence

## F10-T11 REVALIDATION — failed-join revocation closure gates

Task ID: F10-T11 REVALIDATION
Completed at: 2026-09-22 00:05 +03:30

- PostgreSQL migration status (31 applied), Prisma validation, API OpenAPI export, generated-client freshness, and
  API/app/dashboard typechecks — PASS.
- App tests (12 files, 40 tests), dashboard tests (15 files, 47 tests), and both production builds — PASS.
- Playwright discovery retains both Phase 09 and Phase 10 suites; real Chrome Phase 10 text-chat E2E — PASS (1 test).
- Deferred-media and scoped source-secret scans, `git diff --check`, and Phase 10 commit-isolation review — PASS.
  `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned, unstaged, and absent from Phase 10 commits.

Result: Phase 10 returns to `READY_FOR_REVIEW`. A new independent security/closure review is required; it is not
`DONE (CLOSED)` and Phase 11 is not claimed.

## F10-T09 REVALIDATION — join revocation regression

Task ID: F10-T09 REVALIDATION
Completed at: 2026-09-22 00:02 +03:30

- PostgreSQL authorization/moderation plus real Socket.IO failed-join revocation regression passed: 3 files, 13 tests.

Next task: F10-T11 REVALIDATION

## F10-T04 REWORK — revoke failed reauthorization join

Task ID: F10-T04 REWORK
Completed at: 2026-09-22 00:01 +03:30

- `conversation:join` now invokes standard `revoke(client)` before returning its forbidden failure path.
- Real PostgreSQL + Socket.IO regression: authorized socket joins, account is disabled, repeated join fails by disconnect,
  and a later room `message:committed` fan-out is not received.
- `pnpm --filter @sabz-zendegi/api exec vitest run test/chat-realtime.gateway.spec.ts --no-file-parallelism` — PASS (7 tests).

Next task: F10-T09 REVALIDATION

## F10-T11 REVALIDATION — final four-P1 closure gates

Task ID: F10-T11 REVALIDATION
Completed at: 2026-09-21 23:52 +03:30

- Minimal test-discovery repair: Playwright `testDir` now covers retained `tests/e2e/phase-09` and Phase 10; test listing confirms both suites are discovered.
- Chrome Phase 10 E2E: `pnpm exec playwright test phase-10/chat-browser.spec.ts` — PASS (1 test, real text-chat flow; no media or token URL leakage).
- Prisma deploy/validate, API/client/app/dashboard typechecks, app/dashboard tests (12/40 and 15/47), and both app/dashboard production builds passed in this closure-gate run.
- Deferred-media/external-messenger and secret scans, `git diff --check`, and commit isolation passed. `.gitignore` and Phase 12 remain user-owned and absent from staged/Phase 10 task commits.

Result: Phase 10 returns to READY_FOR_REVIEW. A new independent security/closure review is required; it is not DONE (CLOSED).

## F10-T09 REVALIDATION — four-P1 PostgreSQL and Socket.IO proof

Task ID: F10-T09 REVALIDATION
Completed at: 2026-09-21 23:48 +03:30

- PostgreSQL ordering/idempotency passed (1 file, 1 test).
- PostgreSQL authorization, moderation, send-only block/read-sync-receipt regression passed (3 files, 8 tests).
- Rate-limit, receipt, Socket.IO deactivation revocation, missed visibility publication recovery, and reconnect-load passed (4 files, 11 tests; 74.38s).
- All four P1 paths therefore have real PostgreSQL/Socket.IO coverage; no new capacity claim is made beyond the existing frozen evidence.

Next task: F10-T11 REVALIDATION

## F10-T08 REWORK — client cursor pagination and durable visibility recovery

Task ID: F10-T08 REWORK
Completed at: 2026-09-21 23:20 +03:30

- App and dashboard load authorized history in deduplicated pages of 100 (bounded at 100 pages), covering conversations beyond 150 messages.
- Reconnect consumes bounded history backlog and the durable authorized visibility-reconciliation REST endpoint; async responses are discarded when the socket generation changes.
- Socket.IO visibility payloads remain signaling only; rendered message content comes from authorized REST.
- `pnpm --filter @sabz-zendegi/api-client build`, app/dashboard typechecks, and focused app/dashboard chat adapter tests — PASS.

Next task: F10-T09 REVALIDATION

## F10-T04 REWORK — Socket.IO revocation and missed-signal recovery

Task ID: F10-T04 REWORK
Completed at: 2026-09-21 23:10 +03:30
Agent/Thread: Codex /root
Batch ID: F10-R13-SOCKET-REVOCATION

- Failed current authorization during realtime sync, receipt acknowledgement or heartbeat now disconnects the socket,
  removing all protected-room memberships before subsequent room fan-out.
- Real PostgreSQL/Socket.IO tests prove a deactivated joined user receives no later `message:committed` event, and that
  an intentional disconnect between committed restriction and publish recovers the body-free tombstone after reconnect
  only from authorized PostgreSQL reconciliation.
- `pnpm --filter @sabz-zendegi/api exec vitest run test/chat-realtime.gateway.spec.ts --no-file-parallelism` — PASS (1 file, 7 tests)
- `pnpm --filter @sabz-zendegi/api typecheck` and `git diff --check` — PASS.

Next task: F10-T08 REWORK

## F10-T03 REWORK — durable visibility reconciliation and send-only block policy

Task ID: F10-T03 REWORK
Completed at: 2026-09-21 23:05 +03:30
Agent/Thread: Codex /root
Batch ID: F10-R12-VISIBILITY-RECONCILIATION
Reviewed by: Codex /root

Changed files:

- `apps/api/src/modules/communications/chat/chat.service.ts`
- `apps/api/src/modules/communications/chat/chat.controller.ts`
- `apps/api/src/modules/communications/chat/chat.dto.ts`
- `apps/api/test/chat-moderation.integration.spec.ts`
- `apps/api/test/chat-abuse-authorization.integration.spec.ts`
- `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts`

Result:

- No F10-T02 migration was necessary: immutable PostgreSQL `ChatMessageModerationAction` records the durable
  `RESTRICT_MESSAGE` and `RESTORE_MESSAGE` facts. The authorized endpoint pages those facts with a server-bound
  timestamp/id cursor and checkpoint independent of immutable message sequence.
- A restricted transition reconciles only a tombstone; a later restore reconciles the currently authorized REST message.
  Foreign accounts fail without content disclosure.
- `assertNotBlocked` remains only in human `send`; history, realtime sync/subscription and receipt acknowledgement
  retain their current authorization and appointment-window checks but are no longer blocked.

Tests run:

- `pnpm --filter @sabz-zendegi/api exec vitest run test/chat-moderation.integration.spec.ts test/chat-abuse-authorization.integration.spec.ts --no-file-parallelism` — PASS (2 files, 6 PostgreSQL integration tests)
- `pnpm --filter @sabz-zendegi/api openapi:export` — PASS
- `pnpm --filter @sabz-zendegi/api typecheck` — PASS
- `pnpm --filter @sabz-zendegi/api-client generate && pnpm --filter @sabz-zendegi/api-client typecheck` — PASS
- `git diff --check` — PASS

Known limitations:

- Socket authorization revocation and disconnect-between-commit-and-publish proof remain F10-T04 REWORK. Client pagination remains F10-T08 REWORK.

Next task: F10-T04 REWORK

## F10-CLOSE — formal Phase 10 closure

Task ID: F10-CLOSE
Status: DONE (CLOSED)
Completed at: 2026-09-21 21:51 +03:30
Closure authority:
  - Independent Phase 10 closure review #5 → PASS (user-provided review result).
Accepted scope:
  - `F10-T01` through `F10-T11`, plus all accepted restricted-content, sync-fence, restore-visibility and
    paginated-restore remediation/revalidation commits.
Final evidence summary:
  - PostgreSQL persistence, ordered/idempotent REST history, authorization, moderation/audit, block/rate-limit,
    cursor/reconnect and sequence-101 paginated restore correctness → PASS.
  - Socket.IO post-commit, authorized-room and body-free restore signaling, plus frozen 100 consultation / 300
    participant / 600 connection capacity and reconnect-storm evidence → PASS.
  - App/dashboard authorized REST reconciliation, Chrome text-chat E2E, Prisma/OpenAPI/client freshness, typechecks,
    tests and production builds → PASS.
  - Attachment/video/media provider, Redis/Centrifugo and external-messenger MVP surface remains deferred/absent;
    scoped secret and deferred-media scans → PASS.
  - `git diff --check` and task-commit isolation → PASS. User-owned `.gitignore` and
    `plan/phases/12-PRODUCTION-HARDENING.md` were never staged or included in any Phase 10 commit.
Result:
  - Phase 10 is `DONE (CLOSED)` and Milestone D is complete. Phase 11 is next eligible work only; it remains
    `NOT_STARTED` and unclaimed.

## F10-T11 REVALIDATION — paginated restore closure gates

Task ID: F10-T11 REVALIDATION
Status: ACCEPTED — isolated task commit pending
Verification:
  - PostgreSQL Prisma migration status (31 applied) and schema validation → PASS.
  - API OpenAPI export, generated-client refresh/typecheck, and API/app/dashboard typechecks → PASS.
  - App tests (12 files, 40 tests), dashboard tests (15 files, 47 tests), and both production builds → PASS.
  - Chrome Phase 10 browser E2E → PASS (1 test): authenticated text-chat flow with no media control, external request
    or token URL leakage.
  - Scoped deferred-media/external-messenger and source-secret scans → PASS; `git diff --check` and commit isolation
    review → PASS. User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are modified but unstaged
    and excluded from this commit.
Result:
  - Phase 10 remains `READY_FOR_REVIEW`, not `DONE (CLOSED)`. Only a fifth independent closure review may make the
    formal closure decision; Phase 11 remains `NOT_STARTED`.

## F10-T09 REVALIDATION — paginated restore correctness

Task ID: F10-T09 REVALIDATION
Status: ACCEPTED — isolated task commit pending
Verification:
  - PostgreSQL/Socket.IO → PASS (6 files, 13 tests): ordering/idempotency, authorization, direct and
    report-resolution moderation, reconnect/history, and an actual sequence-101 `VISIBLE → RESTRICTED → VISIBLE`
    path. The connected participant receives the exact body-free restore event, while cursor page two supplies the
    authorized restored body; an outsider receives 403 without body.
  - App adapter → PASS (6 tests); dashboard adapter → PASS (3 tests). API/app/dashboard typechecks and
    `git diff --check` → PASS.
  - The frozen F10-T09 capacity evidence remains applicable: this task changes neither gateway/send/rate-limit nor
    performance-sensitive realtime behavior.
Result:
  - Restore pagination, restricted-content safety, authorization, history/cursor and reconnect behavior are accepted
    for final F10-T11 closure revalidation.

## F10-T08 REWORK — paginated restore reconciliation

Task ID: F10-T08 REWORK
Status: ACCEPTED — isolated task commit pending
Verification:
  - App adapter → PASS (6 tests); dashboard adapter → PASS (3 tests). Each regression puts the restored message at
    sequence 101, follows the opaque cursor from the first 100-record page, and replaces the tombstone only with the
    authorized REST payload.
  - Both adapters verify that a stale REST response after disconnect does not replace the safe cache state.
  - App/dashboard typechecks and `git diff --check` → PASS.
Result:
  - Restore events remain body-free. Pagination is bounded by the server-issued message sequence, coalesced by
    message ID, and resumes only through an authorized reconnect; failed or unavailable REST history leaves the
    tombstone untouched.

## F10-T11 REVALIDATION — restore visibility closure gates

Task ID: F10-T11 REVALIDATION
Status: ACCEPTED — isolated task commit pending
Verification:
  - PostgreSQL Prisma migration status (31 applied) and schema validation → PASS.
  - API OpenAPI export, generated-client refresh and API-client typecheck → PASS.
  - App tests (12 files, 39 tests), dashboard tests (15 files, 46 tests), and app/dashboard production builds → PASS.
  - Live Chrome Phase 10 browser E2E → PASS (1 test), after all three local origins were available.
  - Scoped deferred-media and committed-secret-literal source scans → PASS; no WebRTC/STUN/TURN/provider runtime
    references or apparent source secret literals found.
  - `git diff --check` and rework commit-isolation review → PASS. User-owned `.gitignore` and
    `plan/phases/12-PRODUCTION-HARDENING.md` remain modified but unstaged, outside this commit.
Result:
  - Phase 10 remains `READY_FOR_REVIEW`; it is not `DONE (CLOSED)`. Only a fourth independent closure review may
    make a closure decision, and Phase 11 remains `NOT_STARTED`.

## F10-T09 REVALIDATION — restore visibility path

Task ID: F10-T09 REVALIDATION
Status: ACCEPTED — isolated task commit pending
Verification:
  - PostgreSQL/Socket.IO suite → PASS (6 files, 12 tests): REST, ordering/idempotency, authorization, moderation
    restore persistence, connected restore event, history/sync/reconnect and restriction→restore transition.
  - API typecheck and `git diff --check` → PASS.

## F10-T08 REWORK — reconcile restored visibility from REST

Task ID: F10-T08 REWORK
Status: ACCEPTED — isolated task commit pending
Verification:
  - App adapter tests → PASS (5), dashboard adapter tests → PASS (2); both prove VISIBLE visibility event triggers
    authorized REST history retrieval and restored body is never accepted from Socket.IO.
  - App/dashboard typechecks and `git diff --check` → PASS.

## F10-T04 REWORK — restore visibility realtime event

Task ID: F10-T04 REWORK
Status: ACCEPTED — isolated task commit pending
Verification:
  - PostgreSQL/Socket.IO gateway integration → PASS (5 tests). A connected recipient receives the direct restriction
    tombstone, then restore event `{ conversationId, messageId, sequence, visibility: VISIBLE }` with no body/preview.
  - API typecheck and `git diff --check` → PASS.

## F10-T03 REWORK — restore visibility publication fact

Task ID: F10-T03 REWORK
Status: ACCEPTED — isolated task commit pending
Verification:
  - PostgreSQL moderation integration → PASS (2 tests), including `RESTRICTED → VISIBLE` persistence,
    `RESTORE_MESSAGE` moderation action and `MESSAGE_RESTORED` audit.
  - API typecheck and `git diff --check` → PASS.
Result:
  - Restore retains authorization and audit while yielding an opaque post-commit transition boundary with no body or preview.

## F10-T10 — video deferral

Task ID: F10-T10
Completed at: 2026-09-20 +03:30
Agent/Thread: Codex /root
Batch ID: F10-B10
Verification:
  - scoped runtime and manifest scan for WebRTC/STUN/TURN, video provider/SDK, token/room/join URL/callback,
    credential/environment and external messenger infrastructure → PASS.
  - scoped app/dashboard source scan found no audio/video join control → PASS.
  - `git diff --check` → PASS.
Result: `DEFERRED / NOT_APPLICABLE FOR MVP`; text-only waiting room/chat has no video provider, SDK, token, room,
join URL, callback, credential, environment, migration or external request. `.gitignore` and Phase 12 plan are excluded.

## F10-T09 — security and capacity proof

Task ID: F10-T09
Completed at: 2026-09-20 +03:30
Agent/Thread: Codex /root
Batch ID: F10-B09
Verification:
  - Docker PostgreSQL healthy; disposable database create/connect/cleanup → PASS.
  - ordering, idempotency, authorization, moderation, block, rate-limit and reconnect suites → PASS (4 files, 6 tests).
  - `chat-capacity.load.spec.ts` → PASS (2 tests, 2203.32s): 100 consultations, 300 participants, 600 connections,
    95% realtime signal within two seconds, 300 reconnects under 60 seconds, 20 committed messages/second for 30 minutes
    and 50 committed messages/second for five minutes; PostgreSQL count/sequence reconciliation found no durable gap or duplicate.
  - API typecheck and `git diff --check` → PASS.
Result:
  - Prisma Pg uses a bounded 20-connection pool for the single-instance MVP acceptance boundary; no new dependency,
    datastore or distributed topology was introduced.
  - All test data is synthetic and each disposable database was cleaned. User-owned `.gitignore` and Phase 12 plan
    remain excluded from the task commit.

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

## F10-T05 — receipts and safe chat outbox

Task ID: F10-T05
Completed at: 2026-09-17 +03:30
Batch ID: F10-B05
Status: ACCEPTED — isolated task commit pending
Changed files:
  - apps/api/src/modules/communications/chat/chat.service.ts
  - apps/api/src/modules/communications/chat/realtime/**
  - apps/api/src/modules/outbox/outbox.worker.ts
  - apps/api/test/chat-realtime.gateway.spec.ts
  - apps/api/test/chat-receipts-notifications.integration.spec.ts
  - plan/STATUS.md
  - plan/logs/phase-10.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/tasks.md
Accepted boundary:
  - authenticated receipt acknowledgements are participant-scoped, never move high-water marks backward, cannot exceed
    committed sequence and recheck current membership, block and appointment eligibility.
  - chat commit writes an idempotent durable outbox event in the same PostgreSQL transaction. The event includes only
    identifiers; no body, preview, restricted text or medical content is retained or emitted by the worker.
  - worker failure or realtime fan-out failure cannot roll back the committed message. Current notification categories
    do not invent a chat notification; a future user-visible channel requires a separate frozen contract.
Verification:
  - `vitest run test/chat-receipts-notifications.integration.spec.ts test/chat-realtime.gateway.spec.ts --no-file-parallelism` → PASS (2 files, 4 tests).
  - API production/test typechecks and `git diff --check` → PASS.
  - `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` excluded from stage/commit.
Next batch:
  - F10-B06 / F10-T06 only

## F10-T06 — attachment deferred MVP boundary

Task ID: F10-T06
Completed at: 2026-09-19 +09:10
Batch ID: F10-B06
Status: ACCEPTED — intentionally DEFERRED / NOT_APPLICABLE FOR MVP
Changed files:
  - apps/app/src/app/(app)/chat/page.tsx
  - apps/dashboard/src/features/messages/messages-page.tsx
  - apps/dashboard/src/data/messages.ts
  - plan/STATUS.md
  - plan/logs/phase-10.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/tasks.md
Accepted absence:
  - app and dashboard chat composition are text-only; attachment, file, image and audio controls are hidden/removed.
  - in-scope fake upload language and a fake PDF conversation entry are removed. No attachment storage, upload API,
    attachment model, object key, scanner/quarantine pipeline, lifecycle job or dependency is added.
  - future attachment activation remains contingent on an independently approved contract for file policy, scanning,
    private access, retention/legal hold and cleanup.
Verification:
  - scoped source absence scan for attachment/file/image/audio controls and mock filenames → PASS.
  - `pnpm --filter @sabz/app typecheck` and `pnpm --filter @sabz/dashboard typecheck` → PASS.
  - `git diff --check` → PASS.
  - `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` excluded from stage/commit.
Next batch:
  - F10-B07 / F10-T07 only

## F10-T07 — appointment waiting room and presence

Task ID: F10-T07
Completed at: 2026-09-19 +03:30
Agent/Thread: Codex /root
Batch ID: F10-B07
Reviewed by: Codex /root
Changed files:
  - apps/api/src/modules/communications/chat/{chat.module.ts,chat.service.ts,realtime/chat-realtime.gateway.ts,waiting-room/waiting-room.controller.ts}
  - apps/api/test/{chat-realtime.gateway.spec.ts,chat-presence.gateway.spec.ts,waiting-room.integration.spec.ts}
  - plan/STATUS.md
  - plan/logs/phase-10.md
  - plan/phases/10-CHAT-CONSULTATION.md
  - specs/008-adopt-phase-10/tasks.md
Verification:
  - `vitest run test/waiting-room.integration.spec.ts test/chat-presence.gateway.spec.ts test/chat-realtime.gateway.spec.ts --no-file-parallelism` → PASS (3 files, 6 tests) against PostgreSQL.
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS.
  - `git diff --check` → PASS.
Result:
  - Waiting-room readiness is authenticated and appointment/resource scoped; it re-evaluates ONLINE lifecycle and UTC window on every request without changing Appointment or Encounter.
  - PENDING, terminal, out-of-window confirmed, and operational appointments beyond the four-hour hard cap fail closed; CHECKED_IN/QUEUED/IN_PROGRESS retain only the permitted delayed-operation extension.
  - Presence is ephemeral: gateway join and every heartbeat re-run authoritative eligibility, renew a 45-second lease, emit online/offline state, and clean up on disconnect. No lease state is persisted.
  - `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned and excluded from the task commit.
Next batch:
  - F10-B08 / F10-T08 only

## F10-T08 — app/dashboard chat integration and mock removal

Task ID: F10-T08
Completed at: 2026-09-19 23:15 +03:30
Agent/Thread: Codex /root
Batch ID: F10-B08
Reviewed by: Codex /root
Changed files:
  - apps/app/{package.json,src/app/(app)/{chat,appointments/waiting-room}/page.tsx,src/lib/chat-api.ts,src/lib/chat-api.spec.ts}
  - apps/dashboard/{package.json,src/{features/messages/messages-page.tsx,lib/chat-api.ts}}
  - apps/dashboard/src/data/messages.ts (removed mock source)
  - pnpm-lock.yaml
  - plan/{STATUS.md,logs/phase-10.md,phases/10-CHAT-CONSULTATION.md}
  - specs/008-adopt-phase-10/tasks.md
Verification:
  - `pnpm --filter @sabz/app typecheck` → PASS.
  - `pnpm --filter @sabz/dashboard typecheck` → PASS.
  - `pnpm --filter @sabz/app test` → PASS (12 files, 36 tests), including generated REST and Socket.IO auth/reconnect adapter coverage.
  - `pnpm --filter @sabz/dashboard test` → PASS (14 files, 44 tests).
  - `pnpm --filter @sabz/app build` → PASS.
  - `pnpm --filter @sabz/dashboard build` → PASS.
  - scoped source absence scan for legacy mock conversation, phone/video and attachment/upload controls → PASS.
  - `git diff --check` → PASS.
Result:
  - Both UIs use generated REST operations for conversation/history/send; send remains REST-only and retains client message idempotency.
  - The pinned `socket.io-client` 4.8.1 consumer uses handshake auth (not URL token), websocket transport, bounded jittered reconnect and latest-sequence join; UI explicitly reports loading, offline/reconnecting and read-only states.
  - Restricted messages use their server-provided tombstone; patient, linked doctor and clinic operator scopes remain server-authorized, while STAFF has no dashboard chat route.
  - Waiting room truthfully exposes text-chat access only; attachment and video controls/mock sources are absent.
  - `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned and excluded from the task commit.
Next batch:
  - F10-B09 / F10-T09 only

## F10-T11 — final Phase 10 cross-surface evidence

Task ID: F10-T11
Completed at: 2026-09-20 +03:30
Batch ID: F10-B11
Status: ACCEPTED — Phase 10 `READY_FOR_REVIEW`
Changed files:
  - playwright.phase10.config.ts
  - tests/e2e/phase-10/{chat-browser.fixture.ts,chat-browser.spec.ts}
  - plan/{STATUS.md,logs/phase-10.md,phases/10-CHAT-CONSULTATION.md}
  - specs/008-adopt-phase-10/{spec.md,tasks.md,checklists/requirements.md}
Verification:
  - `prisma migrate status --config prisma.config.ts` → PASS (31 migrations applied); `prisma validate` and generated API typecheck → PASS.
  - targeted authoritative PostgreSQL suite for migrations, REST, authorization, moderation, gateway, presence, waiting room, ordering, reconnect, abuse authorization and rate limit → PASS (11 files, 17 tests).
  - `pnpm --filter @sabz/app test` → PASS (12 files, 36 tests); `pnpm --filter @sabz/dashboard test` → PASS (14 files, 44 tests); both typechecks and production builds → PASS.
  - Phase 10 Chrome browser E2E → PASS (1 test): synthetic registration/login, session bootstrap, eligible appointment chat, persisted text send, no audio/video controls, no external request, and no token in a request URL.
  - F10-T09 PostgreSQL capacity evidence remains accepted: 100 consultations, 300 participants, 600 connections, 20 committed messages/second for 30 minutes, 50/second for five minutes, and 300-participant reconnect storm under 60 seconds with gap-free, no-durable-duplicate reconciliation.
  - scoped attachment/video/runtime/provider/token URL scan and `git diff --check` → PASS.
  - review preserved user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md`; neither is staged or committed.
Result:
  - PostgreSQL/history remains authoritative; REST is the idempotent write path and Socket.IO is authenticated,
    post-commit, at-least-once signaling only. Text-only chat, appointment window, resource-scoped authorization,
    receipts, moderation, blocks and lease presence are covered by the relevant accepted task evidence.
  - Attachments (`F10-T06`) and video (`F10-T10`) remain intentionally `DEFERRED / NOT_APPLICABLE FOR MVP`; no
    storage, upload, media provider, SDK, token, room or simulated media control was introduced.
Next eligible action:
  - independent Phase 10 closure review; do not begin Phase 11 from this task.

## F10-T03 REWORK — durable safe visibility transition

Task ID: F10-T03 REWORK
Completed at: 2026-09-21 +03:45
Batch ID: F10-R03-VISIBILITY
Status: ACCEPTED — isolated remediation commit pending
Changed files:
  - apps/api/src/modules/communications/chat/chat.service.ts
  - apps/api/test/chat-moderation.integration.spec.ts
  - plan/{STATUS.md,logs/phase-10.md}
Verification:
  - Real PostgreSQL API integration → PASS (1 file, 1 test). It persists two separate doctor messages, restricts one
    through direct ADMIN moderation and the other through report resolution, and proves ordinary history and
    cursor/realtime sync for patient, doctor and ADMIN contain only tombstones—never either original body.
  - The only body-returning route remained explicit ADMIN restricted-content review; each review wrote precisely one
    `RESTRICTED_CONTENT_REVIEWED` audit event. Outbox and audit serializations contain neither source body.
  - `pnpm --filter api typecheck` (including Prisma generate) and `git diff --check` → PASS.
  - User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were not edited or staged.
Result:
  - Direct restriction and report-resolution restriction now use one canonical persisted transition builder. Its
    post-commit fact carries only identity, sequence, sender role, timestamp, restricted visibility, broad category
    and tombstone; it deliberately cannot carry message body. `F10-T04 REWORK` owns publishing that safe fact.
Next eligible action:
  - F10-T04 REWORK only, after this task's isolated commit; do not start Phase 11.

## F10-T04 REWORK — publish safe visibility tombstones

Task ID: F10-T04 REWORK
Completed at: 2026-09-21 +04:00
Batch ID: F10-R04-VISIBILITY-EVENT
Status: ACCEPTED — isolated remediation commit pending
Changed files:
  - apps/api/src/modules/communications/chat/chat.service.ts
  - apps/api/src/modules/communications/chat/realtime/chat-realtime.publisher.ts
  - apps/api/test/chat-realtime.gateway.spec.ts
  - plan/{STATUS.md,logs/phase-10.md}
Verification:
  - Real PostgreSQL and Socket.IO gateway integration → PASS (1 file, 5 tests). A joined patient first receives each
    visible doctor message, then receives `message:visibility-changed` after direct ADMIN restriction and separately
    after report resolution. Each event preserves ID/sequence/sender/timestamp/category and tombstone but contains no
    body or preview and does not serialize either source body.
  - Existing gateway authorization-before-room-join and join-before-sync fence coverage remains green; publication is
    to the already authorized `conversation:<id>` room only.
  - `pnpm --filter api typecheck` (including Prisma generate) and `git diff --check` → PASS.
  - User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were not edited or staged.
Result:
  - The authoritative PostgreSQL transaction remains the state transition. Socket.IO merely signals the durable,
    body-free replacement after commit; it neither stores messages nor makes moderation decisions.
Next eligible action:
  - F10-T08 REWORK only, after this task's isolated commit; do not start Phase 11.

## F10-T08 REWORK — reconcile visibility tombstones in clients

Task ID: F10-T08 REWORK
Completed at: 2026-09-21 +04:15
Batch ID: F10-R08-VISIBILITY-CACHE
Status: ACCEPTED — isolated remediation commit pending
Changed files:
  - apps/app/src/lib/{chat-api.ts,chat-api.spec.ts}
  - apps/dashboard/src/lib/{chat-api.ts,chat-api.spec.ts}
  - apps/dashboard/src/features/messages/messages-page.tsx
  - plan/{STATUS.md,logs/phase-10.md}
Verification:
  - App adapter test → PASS (4 tests), and dashboard adapter test → PASS (1 test). Both subscribe to the new event,
    apply a direct-moderation tombstone and a report-resolution tombstone by message ID/sequence, and prove the
    replaced cache object contains no former visible body.
  - Normal app/dashboard rendering already selects `body` only when it exists and otherwise selects `tombstone`; the
    replacement invariant therefore prevents the former message text from rendering after the realtime update.
  - `pnpm --filter @sabz/app typecheck`, `pnpm --filter @sabz/dashboard typecheck`, and `git diff --check` → PASS.
  - User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were not edited or staged.
Result:
  - The normal application caches, including connected ADMIN/DOCTOR dashboard use, immediately replace the complete
    stale message object with the body-free authoritative tombstone. This does not claim to erase browser history or
    external screenshots.
Next eligible action:
  - F10-T09 REVALIDATION only, after this task's isolated commit; do not start Phase 11.

## F10-T09 REVALIDATION — visibility-transition correctness

Task ID: F10-T09 REVALIDATION
Completed at: 2026-09-21 +04:45
Batch ID: F10-R09-VISIBILITY-REVALIDATION
Status: ACCEPTED — isolated revalidation commit pending
Changed files:
  - apps/api/test/{chat-presence.gateway.spec.ts,chat-reconnect-load.spec.ts}
  - plan/{STATUS.md,logs/phase-10.md}
Verification:
  - Real PostgreSQL/Socket.IO suites → PASS (9 files, 16 tests): REST and sequence ordering, authorization,
    report/block behavior, moderation, receipts, presence, reconnect and live Socket.IO. The live gateway test proves
    both direct and report-resolution restrictions deliver body-free tombstones to an already connected participant.
  - Reconnect now specifically proves the PostgreSQL backlog for a previously restricted message contains its sequence
    and tombstone but not source text; a fresh authenticated connection with last sequence `1` has no durable
    duplicate. The presence mock also revalidates the current authorization-before-room-join fence.
  - App adapter → PASS (4 tests); dashboard adapter → PASS (1 test); both retain their direct/report tombstone cache
    regressions. API typecheck (with Prisma generate) and `git diff --check` → PASS.
  - The accepted prior F10-T09 load evidence remains unchanged and authoritative for frozen 100 consultations,
    300 participants, 600 connections, sustained/burst throughput and reconnect storm; this remediation does not
    alter send, connection or rate-limit paths.
  - User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were not edited or staged.
Result:
  - No ordinary path covered by the affected realtime/recovery stack reintroduces restricted message text. Existing
    clinic/resource authorization, rate-limit, capacity and deferred-media evidence remains in force.
Next eligible action:
  - F10-T11 REVALIDATION only, after this task's isolated commit; do not start Phase 11.

## F10-T11 REVALIDATION — final visibility remediation gates

Task ID: F10-T11 REVALIDATION
Completed at: 2026-09-21 +05:05
Batch ID: F10-R11-VISIBILITY-CLOSURE
Status: ACCEPTED — isolated revalidation commit pending; Phase 10 `READY_FOR_REVIEW`
Verification:
  - PostgreSQL Prisma migration status → PASS (31 applied); Prisma schema validate and generated client → PASS.
  - API, app, dashboard and generated API-client typechecks → PASS. OpenAPI export and client regeneration completed
    with a zero tracked diff, proving contract/client freshness.
  - App build and dashboard build → PASS. App tests → PASS (12 files, 38 tests); dashboard tests → PASS (15 files,
    45 tests), including the new direct/report visibility-tombstone regressions.
  - Chrome Phase 10 browser E2E against the local web/app/API and PostgreSQL → PASS (1 test): authenticated patient
    text chat, persisted send, no media control, no external request and no token URL leakage.
  - Scoped scan found no attachment/upload/video/WebRTC/STUN/TURN/Redis/Centrifugo/external-messenger artifacts in
    Phase 10 chat runtime/UI scope. Rework-commit isolation confirms neither `.gitignore` nor
    `plan/phases/12-PRODUCTION-HARDENING.md` appears in a Phase 10 rework commit. `git diff --check` → PASS.
Result:
  - The new post-commit tombstone signal, durable history/reconnect behavior and both application caches passed their
    final related gates. Phase 10 remains `READY_FOR_REVIEW`, not `DONE (CLOSED)`.
Next eligible action:
  - third independent Phase 10 closure review only; do not start Phase 11.

## F10-T03 REWORK — restricted moderated-message visibility

Task ID: F10-T03 REWORK
Completed at: 2026-09-21 +03:30
Batch ID: F10-R03
Status: ACCEPTED — isolated remediation commit pending
Changed files:
  - apps/api/src/modules/communications/chat/chat.service.ts
  - apps/api/test/chat-moderation.integration.spec.ts
  - packages/api-client/{openapi.json,src/schema.generated.ts}
  - plan/{STATUS.md,logs/phase-10.md}
Verification:
  - Docker PostgreSQL was confirmed through its published host port and from inside the container; no proxy, reset,
    volume operation, repository connection-string change, or secret logging occurred.
  - PostgreSQL API suite `chat-rest.integration`, `chat-authorization.integration`, `chat-moderation.integration` and
    `openapi-contract` → PASS (4 files, 11 tests).
  - The regression proves restricted content is tombstoned in ordinary REST history and cursor/realtime sync for
    patient, doctor and ADMIN. It also proves the normal response/event mapper omits the body, and outbox/audit
    serialization contains no original restricted text.
  - Only the explicit ADMIN moderation-review endpoint returned the original body; it wrote exactly one
    `RESTRICTED_CONTENT_REVIEWED` audit event for that message.
  - `pnpm --filter @sabz-zendegi/api typecheck`, generated OpenAPI/client freshness, and `git diff --check` → PASS.
  - User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were not edited or staged.
Result:
  - All ordinary mapper paths now apply policy tombstones uniformly, including for ADMIN. The explicit audited review
    endpoint is the sole permitted message-body retrieval route after moderation restriction.
Next eligible action:
  - F10-T04 REWORK only, after this task's isolated commit.

## F10-T04 REWORK — fenced realtime subscription and sync

Task ID: F10-T04 REWORK
Completed at: 2026-09-21 +03:30
Batch ID: F10-R04
Status: ACCEPTED — isolated remediation commit pending
Verification:
  - PostgreSQL/Socket.IO gateway suite → PASS (4 tests). Its deterministic race test commits a doctor message only
    after the patient socket enters the conversation room and before the join handler performs its sync. The response
    has high-water `1` and backlog sequence `1`, while the subscribed client receives the same post-commit event.
  - The client reconciliation test → PASS (3 app adapter tests): an early event and duplicate backlog item collapse by
    message ID and retain sequence ordering, so no durable duplicate or gap reaches state.
  - API and app typechecks, and `git diff --check` → PASS.
Result:
  - The gateway performs server authorization before joining, subscribes, then takes the authorized high-water/backlog
    snapshot. The second authorization in sync protects reconnect/window/block changes and removes the room if it
    fails. Handshake auth and connection expiry behavior remain unchanged.
Next eligible action:
  - F10-T09 REVALIDATION only, after this task's isolated commit.

## F10-T09 REVALIDATION — post-remediation PostgreSQL/realtime evidence

Task ID: F10-T09 REVALIDATION
Completed at: 2026-09-21 +03:30
Batch ID: F10-R09
Status: ACCEPTED — isolated revalidation commit pending
Verification:
  - PostgreSQL correctness/realtime suite rerun after T03/T04: ordering and idempotency, REST authorization,
    moderation/restricted-content policy, abuse/block, rate limit, reconnect/sync, and the deterministic fenced
    Socket.IO race → PASS.
  - Frozen capacity run completed against disposable PostgreSQL: 100 consultations, 300 authenticated participants,
    600 connections and reconnect storm, then 20 committed messages/second for 30 minutes and 50/second for five
    minutes with durable sequence reconciliation.
Result:
  - The T03 policy mapper and T04 join-before-backlog fence retain ordering, idempotency, authorization, moderation,
    block/rate-limit and reconnect correctness under the revalidated realtime load path.
Next eligible action:
  - F10-T11 REVALIDATION only, after this task's isolated commit.

## F10-T11 REVALIDATION — final closure-review evidence

Task ID: F10-T11 REVALIDATION
Completed at: 2026-09-21 +03:30
Batch ID: F10-R11
Status: ACCEPTED — Phase 10 `READY_FOR_REVIEW`
Verification:
  - Prisma migration status (31 applied) and schema validate → PASS; API, app, dashboard and generated client
    typechecks → PASS; OpenAPI export/client generation and freshness check → PASS.
  - App tests → PASS (12 files, 37 tests); dashboard tests → PASS (14 files, 44 tests); both production builds → PASS.
  - PostgreSQL authoritative chat REST/authorization/moderation/restricted-content/ordering/block/rate-limit/
    reconnect/realtime/presence/waiting-room/OpenAPI suite and T04 fenced race coverage → PASS.
  - Chrome browser E2E against local web/app/API and PostgreSQL → PASS: registration/login, authoritative eligible
    appointment text chat, persisted send, no media controls, no external request and no token URL leak.
  - Deferred-media and source secret scans, `git diff --check`, and commit-isolation review → PASS.
  - User-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain unmodified by this task and unstaged.
Result:
  - Phase 10 is `READY_FOR_REVIEW`, not `DONE (CLOSED)`. A second independent closure review is required; Phase 11
    remains `NOT_STARTED`.
