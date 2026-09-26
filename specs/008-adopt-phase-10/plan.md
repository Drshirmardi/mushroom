# Implementation Plan: Phase 10 — Chat & Online Consultation

**Branch**: `codex/phase-10-chat-consultation` | **Date**: 2026-09-16 | **Spec**: [spec.md](spec.md)

## Summary

Deliver a private, appointment-bound, text-only consultation channel. PostgreSQL history remains the authoritative record; REST provides bounded history and idempotent writes; realtime is a post-commit at-least-once signal with authenticated reconnect reconciliation. The established appointment state machine, clinical resource-authorization/audit standard, and Phase 08 outbox/notification boundary are reused without creating video or attachment infrastructure.

## Technical Context

**Language/Version**: TypeScript; existing NestJS API and Next.js app/dashboard workspace.

**Primary Dependencies**: Existing NestJS/Fastify, Prisma/PostgreSQL, JWT access-token service, authorization policy, OpenAPI generation, and Phase 08 outbox/notification services. `F10-T04` exclusively adds precisely pinned NestJS Socket.IO gateway/adapter dependencies and its lockfile/module wiring; it must never use `latest`.

**Storage**: PostgreSQL is the source of truth for conversation, message sequence/idempotency, receipts, moderation/block/retention evidence, and durable outbox events. No attachment/object-storage/video persistence is in scope.

**Testing**: Existing API unit and real-PostgreSQL integration suites; API/OpenAPI client freshness checks; app/dashboard tests/typechecks/builds; a network-capable gateway/reconnect/load suite because HTTP injection alone cannot prove realtime transport.

**Target Platform**: Existing API deployment, patient app, and dashboard. The MVP is one API/realtime instance for live-connection/presence registry semantics. Redis/Redis Streams Socket.IO adapter is prohibited unless accepted load evidence or a multi-instance design proves it necessary; Phase 12 owns that review.

**Project Type**: Modular-monolith API plus two web clients.

**Performance Goals**: 100 consultations, 300 authenticated participants, 600 concurrent connections, 20 committed messages/second sustained for 30 minutes, 50/second for five minutes, and 95% post-commit signal-or-explicit-reconnecting behavior within two seconds.

**Constraints**: Appointment-bound ONLINE-only access; UTC enforcement; text up to 4,000 Unicode characters; REST/PostgreSQL authoritative; Socket.IO at-least-once only; opaque versioned cursor; handshake `auth` payload only (no URL/log token); backend-owned room authorization; 15-second heartbeat/45-second lease; no attachment/video/external messenger UI; all sensitive reads/moderation are clinic/resource scoped and audited without content/PII in logs.

**Scale/Scope**: Eleven stable roadmap tasks remain `F10-T01`–`F10-T11`; no SpecKit label replaces them. `F10-T06` is a recorded no-op boundary for attachments and `F10-T10` is intentionally `DEFERRED / NOT_APPLICABLE FOR MVP`.

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- Scope discipline: this plan maps only existing Phase 10 tasks and introduces no product implementation, attachment, video, general messaging, or Phase 11 staff access.
- Existing architecture: appointment lifecycle remains in scheduling; chat is a communications module; role/permission, resource membership, audit, JWT, REST/OpenAPI, Prisma and outbox patterns stay authoritative.
- Phase-driven delivery: official `F10-T01`–`F10-T11` IDs, roadmap order, and completion status remain the source of truth. SpecKit tasks only map one-to-one.
- Contract integrity: server-side appointment/clinic/membership/block checks, idempotency, ordering, audit, retention and outbox-after-commit requirements are explicit.
- Evidence: later tasks own real PostgreSQL, gateway, app/dashboard, OpenAPI, load, and browser evidence. The current `F10-T01` claim is documentation-only.

Post-design re-check: passed. The owner-approved Socket.IO selection is a Phase 10 concrete need; its dependency/lockfile addition remains exclusively task-owned by `F10-T04`. No Redis, Centrifugo, external messenger, attachment, video, or new service is authorized.

## Project Structure

### Documentation

```text
specs/008-adopt-phase-10/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/chat-consultation-v1.md
├── checklists/requirements.md
└── tasks.md
```

### Planned source ownership

```text
apps/api/prisma/{schema.prisma,migrations/**,seed.ts}                # F10-T02 only
apps/api/src/modules/communications/chat/**                           # F10-T03–T05/F10-T07
apps/api/src/common/auth/**                                           # F10-T03/T04, serialized owner
apps/api/src/modules/outbox/**                                        # F10-T05 only when handler changes
apps/api/test/{chat*,waiting-room*,realtime*,openapi-contract.spec.ts}
apps/app/src/app/(app)/{chat,appointments/waiting-room}/**           # F10-T08
apps/dashboard/src/{app/(app)/messages,features/**/messages}/**      # F10-T08
packages/api-client/**                                                # endpoint owner; F10-T11 final freshness
```

**Structure Decision**: `communications/chat` is a new bounded module because Conversation/Message/Receipt are communications concepts in the target architecture. It consumes scheduling through an appointment-scoped application boundary and must not mutate appointment/encounter state. No speculative shared package, video abstraction, or attachment system is created.

## Delivery Design

1. `F10-T01` freezes policy and records ADR/SpecKit artifacts.
2. `F10-T02` exclusively owns Prisma/migration and persists only text-chat, receipt, moderation/block, retention/legal-hold boundary and safe audit/outbox references.
3. `F10-T03` creates centralized appointment-scoped authorization, REST history/cursor and idempotent message writes.
4. `F10-T04` exclusively adds pinned Socket.IO gateway/auth/reconnect/connection wiring; Socket.IO recovery is only an optimization and durable PostgreSQL sync remains mandatory.
5. `F10-T05` adds receipts and post-commit outbox/notification behavior with no unsafe preview.
6. `F10-T06` hides/disables attachment behavior only; no attachment implementation occurs.
7. `F10-T07` adds waiting-room eligibility and lease-based presence using the same authorization service, never changing appointment/encounter state.
8. `F10-T08` connects app/dashboard to real chat data and removes only in-scope mock/audio/video/attachment behavior.
9. `F10-T09` proves ordering/idempotency/authorization/moderation and gateway reconnect/rate/capacity requirements.
10. `F10-T10` remains deferred and is evidenced as absent/fail-closed.
11. `F10-T11` performs final generated-client, mock, migration, cross-surface and evidence review.

## Shared-resource ownership

| Resource | Sole owner | Coordination rule |
|---|---|---|
| Prisma schema/migration/seed | F10-T02 | Later tasks use the accepted persistence contract. |
| Chat permissions/common auth | F10-T03; F10-T04 gateway adapter only | Central authorization service is reused by all later tasks. |
| Socket.IO dependency/lockfile/app wiring | F10-T04 | Exact versions; no other task changes it. |
| Outbox/notification handler | F10-T05 | Post-commit only; worker handling is serialized. |
| OpenAPI/generated client | endpoint owner; F10-T11 final | Generated output only; never hand edit. |
| Test DB/gateway load suite | F10-T09 | Run serialized against disposable/isolation-safe environment. |

## Complexity Tracking

No constitution violation requires justification. A realtime adapter is deferred to its concrete consuming task because the repository presently has no gateway dependency; choosing it now would violate scope discipline.
