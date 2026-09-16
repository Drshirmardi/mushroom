# Research: Phase 10 — Chat & Online Consultation

## Appointment authority

**Decision**: Derive eligibility from the existing appointment’s clinic, patient, doctor, current `DoctorService.visitMode`, timestamps, and state; do not add a chat lifecycle or snapshot a window.

**Rationale**: Phase 05 is authoritative and reschedule keeps appointment identity but changes schedule/state. Every sensitive chat operation must use current facts while preserving retained history.

**Alternatives considered**: Standalone messaging and a copied consultation-state model were rejected because they bypass the frozen appointment boundary.

## Resource authorization

**Decision**: A chat-specific authorization service checks permission, identity, active clinic, patient ownership or linked assigned doctor, appointment/conversation membership, state/window, and active block for every operation.

**Rationale**: Phase 06 requires resource authorization beyond role. `DoctorProfile.userId` is nullable and HTTP guards do not automatically protect a future gateway.

**Alternatives considered**: Role-only decorators and clinical-permission reuse were rejected because neither proves appointment membership.

## Realtime platform comparison

| Option | Assessment | Decision |
|---|---|---|
| NestJS + Socket.IO | Fits the existing NestJS modular monolith, gives gateway lifecycle/handshake/connection management, and supports the single-instance MVP without becoming durable storage. | **Accepted** with PostgreSQL/REST authoritative, post-commit publish, and precise version pinning. |
| Native WebSocket / `ws` | Lower-level transport would require recreating connection lifecycle, acknowledgements, reconnection ergonomics, and testing conventions without a product advantage at this scope. | Rejected for MVP. |
| Centrifugo | Could provide distributed realtime operations later, but adds external deployment, auth and operational surface before a demonstrated need. | Future alternative only; no dependency/deployment. |
| Complete messenger (Matrix, Mattermost, Rocket.Chat, Chatwoot) | Introduces an independent message authority, external domain/retention/moderation semantics, and embedded/forked UI that conflicts with appointment-bound resource rules. | Explicitly rejected. |

## History and realtime

**Decision**: Use a NestJS WebSocket Gateway with Socket.IO for authenticated signaling/connection management. Allocate a per-conversation server sequence in the PostgreSQL message transaction, enforce sender/conversation/clientMessageId idempotency through REST, expose bounded opaque cursor history, and publish Socket.IO events only after commit with at-least-once delivery.

**Rationale**: Existing PostgreSQL/advisory-lock/idempotency patterns are proven in appointments; Phase 08 outbox proves after-commit side effects. Fan-out failures/restarts cannot be history authority.

**Alternatives considered**: Timestamp ordering, client sequence, Socket.IO connection-state recovery as authoritative sync, exactly-once transport, and pre-commit fan-out were rejected as unrecoverable/race-prone.

## Audit, moderation, and notifications

**Decision**: Persist chat-specific moderation/evidence and safe audit metadata. Restricted text is readable only in explicit ADMIN review; normal paths use tombstones. A durable chat event may be enqueued after commit, with notification previews suppressed for restricted content.

**Rationale**: Existing clinical audit is the fail-closed sensitive-action precedent but lacks chat moderation actions. Existing outbox polling/recovery is reliable side-effect infrastructure, not a two-second live transport.

**Alternatives considered**: Logging previews, using only clinical audit, treating outbox as realtime transport, or rolling back committed message on fan-out failure were rejected.

## MVP operating boundary

**Decision**: `F10-T04/T07` own bounded Socket.IO connection/presence state for the single-instance MVP. Redis/Redis Streams adapter is deferred until accepted multi-instance design or load evidence; Centrifugo is only a research alternative. `F10-T06` is attachment no-op and `F10-T10` is video deferred.

**Rationale**: No gateway, shared connection registry, or generic high-frequency limiter exists. Building Redis/media infrastructure before a concrete task violates scope discipline.

**Alternatives considered**: Premature distributed registry, generic media abstraction, mock controls, or dormant provider configuration were rejected.
