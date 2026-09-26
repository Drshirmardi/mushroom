# ADR-0010 — PostgreSQL-authoritative chat with REST and Socket.IO signaling

- وضعیت: `ACCEPTED`
- تاریخ: `2026-09-16`
- تصمیم‌گیرندگان: `Product owner and engineering`
- فاز/task مرتبط: `F10-T01`
- جایگزین ADR قبلی: `ندارد`

## Context

Phase 10 needs appointment-bound online text consultation with durable history, strict clinical-style authorization, moderation and reliable recovery. The existing product is a NestJS/Fastify modular monolith with PostgreSQL, REST/OpenAPI, JWT access tokens and a PostgreSQL outbox. There is no existing realtime gateway. A complete external messenger would create a second authority for clinical-adjacent data and add incompatible retention/moderation/identity semantics.

## Decision

Conversation domain rules, PostgreSQL persistence and REST idempotent message creation remain in `apps/api`. A message is validated, ordered and committed in PostgreSQL before any side effect. NestJS WebSocket Gateway with explicitly pinned Socket.IO dependencies provides authenticated at-least-once signaling, presence and connection management only. Reconnect and recovery use server-validated PostgreSQL sequence/cursor synchronization; Socket.IO recovery is never correctness authority.

The MVP is one realtime instance. Redis/Redis Streams adapter, Centrifugo, standalone realtime deployment and external messengers are excluded unless a future evidence-backed decision reopens them. Attachment and video are separate deferred product requirements.

## Alternatives Considered

- **Native WebSocket/ws**: rejected because it recreates gateway lifecycle and recovery ergonomics without a Phase 10 benefit.
- **Centrifugo**: deferred; it adds an external operational/authentication surface before evidence of distributed need.
- **Matrix/Mattermost/Rocket.Chat/Chatwoot**: rejected; each introduces an external message authority and UI/domain behavior inconsistent with appointment-scoped access.
- **Redis Socket.IO adapter at MVP start**: rejected; single-instance capacity has no proven distributed-fanout requirement.

## Consequences

### پیامدهای مثبت

- Existing authorization, auditing, PostgreSQL transactions, REST/OpenAPI and outbox patterns remain authoritative.
- A committed message cannot be lost because a gateway process/fan-out fails.
- Realtime transport remains replaceable without migrating durable message authority.

### هزینه‌ها و trade-offها

- REST plus explicit cursor sync is required in addition to realtime events.
- Clients must tolerate duplicate/delayed/out-of-order Socket.IO events.
- Exact gateway package versions, security advisory review, CORS/origin rules and connection limits become `F10-T04` work.

### ریسک‌ها

- A single instance cannot provide cross-instance Socket.IO fan-out or shared presence; Phase 12 must review this with metrics.
- Outbox polling is a durable side-effect path, not realtime latency transport.
- Any attempt to treat room membership or connection recovery as authority would violate this ADR.

## Implementation Impact

- `F10-T02` adds durable chat data; `F10-T03` creates REST/authorization; `F10-T04` is sole Socket.IO dependency/lockfile/gateway writer.
- `F10-T05` applies post-commit outbox/notification safety; `F10-T07` applies presence; `F10-T09` owns realistic capacity/reconnect proof.
- No appointment or encounter state mutation, attachment/video persistence, Redis/Centrifugo deployment, or external messaging integration is authorized.

## Validation

- Real PostgreSQL tests prove ordering, idempotency, authorization, moderation, retention boundaries and recovery after fan-out failure.
- Gateway tests prove handshake-only token handling, backend-owned rooms, token expiry, reauthorization, three-connection cap and no direct client publish path.
- Load/reconnect tests prove the F10 contract capacity baseline and record whether distributed topology becomes necessary.

## Revisit Trigger

Revisit when more than one realtime API instance is required, load evidence cannot meet the frozen 100/300/600 baseline, presence/fan-out needs cross-instance consistency, or a separately approved attachment/video/provider requirement needs a different operational architecture.
