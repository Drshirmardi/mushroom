---
description: "Dependency-ordered execution map for authoritative Phase 10 roadmap tasks"
---

# Tasks: Phase 10 — Chat & Online Consultation

**Input**: `specs/008-adopt-phase-10/{spec.md,plan.md,research.md,data-model.md,contracts/chat-consultation-v1.md,quickstart.md}` and `plan/phases/10-CHAT-CONSULTATION.md`.

**Roadmap boundary**: `T001`–`T011` are SpecKit labels only. `F10-T01`–`F10-T11` remain the authoritative claim, evidence, checklist, and task-commit identities; they are not renumbered or replaced.

**Execution status**: `F10-T01` through `F10-T07` are accepted in isolated commits; no task is currently claimed. `F10-T06` and `F10-T10` are intentional `DEFERRED / NOT_APPLICABLE FOR MVP` boundaries that must be evidenced as absent, not implemented.

## Phase 1: Contract foundation

**Goal**: Freeze the appointment-bound text-only policy before persistence or runtime work.

- [x] T001 F10-T01 Freeze `plan/contracts/chat-consultation-v1.md`, `plan/decisions/ADR-0010-chat-consultation-realtime.md`, `specs/008-adopt-phase-10/**`, and Phase 10 roadmap detail: participant/authorization matrix, retention/legal hold, immutability, report/block, window, Socket.IO/PostgreSQL architecture, REST idempotency, cursor/reconnect, receipts/presence, capacity, and attachment/video deferral; verified no unresolved clarification, unique FR IDs, document review, and `git diff --check`.

**Checkpoint**: The contract is accepted in a claimed batch; no runtime feature is created by this task.

## Phase 2: Persistent text-chat boundary

**Goal**: Create the only durable source of truth and its invariant tests.

- [x] T002 F10-T02 Implement conversation/participant/message/sequence/client-message-id/receipt/report/block/moderation/retention-hold persistence, constraints, indexes, seed and migration smoke in `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<phase-10-chat-foundation>/migration.sql`, `apps/api/prisma/seed.ts`, and `apps/api/test/chat-migrations.integration.spec.ts`; this task is sole Prisma/migration writer and must verify clean replay, upgrade and no drift.

## Phase 3: User Story 1 — appointment-bound durable text chat (P1)

**Goal**: Permitted users can read and send one durable ordered text conversation for their valid online appointment.

**Independent Test**: The patient owner, linked assigned doctor, and authorized clinic/operator ADMIN receive only their matching history; invalid actor/state/window/block receives no metadata or send effect; idempotent retry yields one committed message.

- [x] T003 [US1] F10-T03 Implement the communications chat authorization service, appointment-scoped REST conversation/history/cursor/send/report/moderation/block endpoints, PostgreSQL sequence allocation/idempotency/rate checks, stable errors, OpenAPI export/client slice, and integration/authorization tests in `apps/api/src/modules/communications/chat/**`, `apps/api/test/chat-rest.integration.spec.ts`, `apps/api/test/chat-authorization.integration.spec.ts`, `apps/api/test/chat-moderation.integration.spec.ts`, `apps/api/test/openapi-contract.spec.ts`, and `packages/api-client/**`; serialize common auth/error/client changes under this task owner.

**Checkpoint**: User Story 1 works through REST with durable ordered history and no in-scope mock authority.

## Phase 4: User Story 2 — secure live consultation recovery (P2)

**Goal**: Eligible participants receive post-commit Socket.IO signals and safely recover from interruption.

**Independent Test**: A reconnecting participant synchronizes sequence/receipt backlog without a durable gap or duplicate; stale/blocked/expired access cannot join or publish.

- [x] T004 [US2] F10-T04 Add exactly pinned Socket.IO/NestJS gateway dependencies, lockfile and module wiring; implement handshake-auth-only gateway, backend-owned room authorization, token-expiry close, three-connection cap, high-water reconnect sync and post-commit at-least-once signaling in `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/app.module.ts`, `apps/api/src/modules/communications/chat/realtime/**`, and `apps/api/test/chat-realtime.gateway.spec.ts`; this task is sole Socket.IO/lockfile/realtime-wiring owner and proves no URL token or arbitrary room access.
- [x] T005 [US2] F10-T05 Implement monotonic delivery/read receipts, safe chat notification/outbox event handling and post-commit fan-out recovery in `apps/api/src/modules/communications/chat/receipts/**`, `apps/api/src/modules/communications/chat/notifications/**`, `apps/api/src/modules/outbox/**`, `apps/api/src/modules/assessments/notifications/**`, and `apps/api/test/chat-receipts-notifications.integration.spec.ts`; prove restricted text never leaks via preview/body and fan-out failure never rolls back a committed message.

## Phase 5: Waiting room and consciously deferred media

**Goal**: Provide appointment-gated readiness/presence without creating attachment or video systems.

- [x] T006 F10-T06 Record attachment as `DEFERRED / NOT_APPLICABLE FOR MVP`; remove/hide only attachment/image/file/audio mock controls in `apps/app/src/app/(app)/chat/**`, `apps/dashboard/src/{app/(app)/messages,features/**/messages}/**`, and `apps/*/test/**`; verify no storage, upload endpoint, model, object key, malware pipeline, attachment mock text/name, or dependency exists.
- [x] T007 [US2] F10-T07 Implement UTC appointment-window eligibility, server-side recheck, lease-based presence and waiting-room APIs/events in `apps/api/src/modules/communications/chat/waiting-room/**`, `apps/api/test/waiting-room.integration.spec.ts`, and `apps/api/test/chat-presence.gateway.spec.ts`; prove 15/45-second lease, hard cap, reschedule recomputation, terminal read-only behavior, and no appointment/encounter mutation.

## Phase 6: User Story 3 — connected patient and clinic experience (P3)

**Goal**: Patient and dashboard see the same authorized text consultation and truthful waiting-room states.

**Independent Test**: App and dashboard consume generated API/realtime adapters, show offline/reconnecting/tombstone/forbidden states, and expose no attachment/video/UI mock path.

- [x] T008 [US3] F10-T08 Connect `apps/app/src/app/(app)/chat/**`, `apps/app/src/app/(app)/appointments/waiting-room/**`, `apps/dashboard/src/app/(app)/messages/**`, `apps/dashboard/src/features/**/messages/**`, and adjacent task-owned tests to generated `packages/api-client/**`; remove in-scope conversation/mock/audio/video/attachment sources and prove real patient/admin/doctor authorization states.

## Phase 7: Cross-cutting proof and deferred video

**Goal**: Demonstrate frozen ordering, security and capacity behavior while keeping unsupported media absent.

- [ ] T009 F10-T09 Implement and run PostgreSQL/gateway/browser/load coverage in `apps/api/test/chat-ordering.integration.spec.ts`, `apps/api/test/chat-reconnect-load.spec.ts`, `apps/api/test/chat-abuse-authorization.integration.spec.ts`, `apps/api/test/chat-rate-limit.integration.spec.ts`, `apps/api/test/chat-capacity.load.spec.ts`, and task-owned browser test/config files; prove the 100/300/600, 20/50, reconnect-storm, rate-limit, no-loss/no-durable-duplicate, authorization, audit and no-external-messenger criteria.
- [ ] T010 F10-T10 Record video as `DEFERRED / NOT_APPLICABLE FOR MVP` in `plan/phases/10-CHAT-CONSULTATION.md`, `specs/008-adopt-phase-10/**`, and task evidence; verify app/dashboard expose no audio/video join control and repository creates no provider/SDK/token/room/URL/callback/credential/env/migration/external request.

## Phase 8: Final evidence

**Goal**: Validate the entire Phase 10 vertical slice and its intentional deferrals.

- [ ] T011 F10-T11 Export/check final OpenAPI/generated client, run migration/auth/realtime/reconnect/moderation/rate/load/app/dashboard/browser checks, review mock/secret/deferred-media boundaries, and record evidence in `plan/logs/phase-10.md`, `plan/STATUS.md`, `plan/phases/10-CHAT-CONSULTATION.md`, `specs/008-adopt-phase-10/**`, `packages/api-client/**`, and task-owned test files.

## Dependencies and batch order

```text
F10-T01 → F10-T02 → F10-T03 → F10-T04 → F10-T05 → F10-T06 → F10-T07 → F10-T08 → F10-T09 → F10-T10 → F10-T11
```

- The default is serialized because persistence, common authorization, Socket.IO wiring/lockfile, OpenAPI client, outbox and shared test environment overlap.
- `F10-T06` and `F10-T10` are short, explicit deferral verification tasks; they do not authorize future infrastructure and may be coordinated beside a non-overlapping review only after their predecessor contracts are accepted.
- `F10-T11` is the final cross-surface/evidence owner and cannot start before every required predecessor has accepted evidence.

## Requirement traceability

| Roadmap task | Primary requirements |
|---|---|
| F10-T01 | FR-001–FR-044, SC-001–SC-005 |
| F10-T02 | FR-007–FR-019, FR-029–FR-039, FR-045 |
| F10-T03 | FR-001–FR-021, FR-025–FR-032, FR-036, FR-041 |
| F10-T04 | FR-028–FR-035, FR-041–FR-043, FR-047 |
| F10-T05 | FR-012–FR-019, FR-035, FR-048 |
| F10-T06 | FR-020–FR-021, FR-049 |
| F10-T07 | FR-025–FR-028, FR-034, FR-050 |
| F10-T08 | FR-020–FR-024, FR-046, FR-051 |
| F10-T09 | FR-029–FR-039, FR-043–FR-044, FR-052, SC-001–SC-005 |
| F10-T10 | FR-022–FR-024, FR-053 |
| F10-T11 | FR-054 and phase exit criteria |

## Format validation

- Every executable line uses checkbox, sequential SpecKit ID, official roadmap ID, and exact paths.
- No `[P]` marker is declared for a shared writer or a task with unaccepted predecessor.
- No task creates attachment/video/external messenger/Redis/Centrifugo infrastructure without a later separately approved requirement.
