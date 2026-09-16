# Phase 10 REST and Realtime Contract

The policy authority is the Phase 10 specification. This technical contract assigns later implementation boundaries without replacing roadmap tasks.

## REST authority

| Operation | Required contract | Owner |
|---|---|---|
| List/history | Authenticated appointment-scoped lookup; opaque versioned cursor; ascending `(conversationId, sequence)`; bounded pages; ordinary viewer sees tombstone for restricted message. | F10-T03 |
| Send text | REST only; `clientMessageId`; validate 4,000-character limit, permission, clinic/membership, appointment state/window, block and both rate limits; commit message/sequence then return durable message. | F10-T03 |
| Send retry | Same sender/conversation/clientMessageId plus normalized identical payload returns the same message; changed payload returns `CHAT_IDEMPOTENCY_CONFLICT`. | F10-T03 |
| Receipt acknowledgement | `lastDeliveredSequence`/`lastReadSequence` are participant-scoped monotonic high-water marks; equal/lower is no-op. | F10-T05 |
| Moderation | Report, restrict/restore, resolve and block/unblock retain safe audit evidence; no ordinary response includes restricted content/preview/internal note. | F10-T03/F10-T05 |

## Socket.IO gateway contract

- NestJS WebSocket Gateway with Socket.IO is signaling and connection management only. It stores no durable message truth and never replaces REST/history/cursor reconciliation.
- The access token is supplied only in the Socket.IO handshake `auth` payload; it is never in URL/query/log. The gateway closes at expiry plus at most five seconds skew and does not accept refresh token or mint sessions.
- The backend reauthorizes authentication, permission, active clinic, appointment/conversation membership, current block and appointment eligibility for every join, reconnect, heartbeat, receipt acknowledgement and publish request. Clients cannot join arbitrary rooms or publish arbitrary events.
- Reconnect creates a new connection. Any Socket.IO recovery feature is an optimization only; the client must perform server-validated cursor/sequence sync from PostgreSQL.
- Sync captures an authorized high-water sequence, returns bounded ordered messages/receipt updates through that mark, then emits later post-commit events. Client deduplicates `messageId`/`sequence` and performs full reconciliation on a gap or unexpected sequence.
- Presence heartbeat is 15 seconds and lease is 45 seconds. The max is three live connections per user; the server deterministically closes the oldest or returns a stable `CHAT_CONNECTION_LIMITED` error.

## Post-commit publication and capacity

- Only a successful PostgreSQL transaction may make a message/visibility state visible. Socket.IO fan-out is after commit, at-least-once, and failure never rolls back the message; history/reconnect recovers it.
- A durable outbox event may support notification/retry, but its worker is not the two-second realtime SLA path. Restricted content never produces a body/preview notification.
- Enforce `CHAT_RATE_LIMITED` for 30 messages/user/minute with five per 10 seconds burst and 120 messages/conversation/minute. Backpressure must be controlled and authorization-preserving.
- Test targets: 100 consultations, 300 participants, 600 connections, 20 committed messages/second for 30 minutes, 50/second for five minutes, 300 participant reconnect storm within 60 seconds, and 95% connected-recipient signal or explicit reconnecting within two seconds.

## Stable errors

`CHAT_FORBIDDEN`, `CHAT_APPOINTMENT_NOT_ELIGIBLE`, `CHAT_WINDOW_CLOSED`, `CHAT_BLOCKED`, `CHAT_IDEMPOTENCY_CONFLICT`, `CHAT_CURSOR_INVALID`, `CHAT_CURSOR_FORBIDDEN`, `CHAT_SEQUENCE_INVALID`, `CHAT_TOKEN_EXPIRED`, `CHAT_CONNECTION_LIMITED`, `CHAT_RATE_LIMITED`, `CHAT_MESSAGE_TOO_LONG`, and `CHAT_MODERATION_FORBIDDEN` follow the repository error shape without existence leakage.

## Deferred surfaces

`F10-T06` attachment and `F10-T10` video are `DEFERRED / NOT_APPLICABLE FOR MVP`; no upload/storage/SDK/provider/token/room/join UI is authorized. Redis/Redis Streams and Centrifugo are also absent unless Phase 12 accepts a proven distributed need.
