# Chat & Online Consultation Contract v1

> Task: `F10-T01`
>
> Status: `FROZEN_FOR_IMPLEMENTATION`

This contract fixes Phase 10 policy. `plan/phases/10-CHAT-CONSULTATION.md` retains roadmap order and task identity. It authorizes no runtime implementation, persistence, dependency, generated client, or UI change before the owning task.

## Scope and authority

- Every conversation binds exactly one existing ONLINE appointment; no standalone, public, group, cross-clinic, AI, bot, or long-lived messaging exists.
- PostgreSQL is the sole durable authority for conversation, message, sequence, receipt, report, block, moderation, retention, and audit. REST history is the authoritative recovery path.
- Message creation is REST-only and idempotent by `(sender, conversation, clientMessageId)`. A message and its server sequence commit before any realtime publication.
- NestJS WebSocket Gateway plus precisely pinned Socket.IO is signaling, presence, and connection management only. It is at-least-once, never a durable store, and Socket.IO recovery never replaces PostgreSQL cursor sync.
- No Matrix, Mattermost, Rocket.Chat, Chatwoot, forked messenger repository, embedded messenger UI, Redis/Redis Streams, Centrifugo, attachment, audio, or video is permitted in the single-instance MVP.

## Participants and authorization

| Actor | Read | Send human text | Report | Moderate / block | Conditions |
|---|---:|---:|---:|---:|---|
| Patient | Yes | Yes | Other actor only | No | Own appointment, clinic, eligible state/window, no effective block. |
| Linked assigned DOCTOR | Yes | Yes | Patient only | No | Authenticated `DoctorProfile.userId` equals actor and profile is appointment doctor. |
| ADMIN clinic/operator | Yes | Yes, as clinic/operator only | Internal | Yes | Active clinic, fixed permission, resource scope and audit. Never impersonates doctor. |
| STAFF | No | No | No | No | Deferred to Phase 11 requirement. |
| DoctorProfile without User | No | No | No | No | Not a live participant; no presence, receipt, realtime membership, or send. |

Role never substitutes for permission, clinic and appointment/conversation membership. Every history read, send, join, reconnect, heartbeat, receipt acknowledgement and moderation action fails closed when its current resource check fails.

## Appointment window and presence

- Server evaluates UTC only. The baseline window opens `startsAt - 15m` and closes `endsAt + 60m` for `CONFIRMED`, `CHECKED_IN`, `QUEUED`, and `IN_PROGRESS` ONLINE appointments. `PENDING` is history-only.
- `CANCELLED`, `COMPLETED`, and `NO_SHOW` immediately make conversation read-only. A confirmed appointment without operational transition has no extension; operational states may continue only through `endsAt + 4h`, then fail closed.
- Reschedule recalculates the current window but preserves retained history. A block overrides otherwise valid send eligibility.
- Presence is a 15-second heartbeat, 45-second lease. Disconnect/lease expiry never mutates appointment or encounter state.

## Immutable moderation and block policy

- Messages, receipts, reports and moderation evidence are immutable and never hard-deleted. An authorized ADMIN may idempotently move a message only `VISIBLE ↔ RESTRICTED` using a controlled reason category; `OTHER` requires a non-sensitive note.
- Ordinary participants see a safe tombstone and broad localized category for a restricted message, never original text, preview, snippet, attachment detail, moderator identity, or internal note. Restricted-content review is explicit ADMIN-only and audited.
- Eligible patient/assigned doctor/ADMIN reports are idempotent per reporter/message. A report does not itself change visibility.
- Blocks are conversation-scoped and two-way: `PATIENT_DOCTOR` or `PATIENT_CLINIC_OPERATOR`. They stop only future human sends in their scope and do not alter history, receipts, appointment/waiting-room eligibility, clinical access, or required system appointment messages.
- Only clinic-scoped ADMIN resolves reports, confirms/lifts temporary blocks, or records actions. Internal details remain hidden from reporter/participants.

## Retention and privacy

- Content, receipts, moderation records and required audit evidence retain for 10 years after the later of appointment terminal time or conversation close. This is an engineering baseline, not a jurisdictional legal assertion.
- Account deactivation ends future access but never hard-deletes retained evidence. Legal hold suspends any future purge, anonymization, crypto-shredding, attachment/object disposition, or destructive action; hold changes and attempted disposition are audited.
- Phase 10 creates no automatic disposition job/policy engine. Phase 12 owns legal confirmation and backup/replica/export/object-store retention alignment.
- Logs/audit metadata contain identifiers, actor/session, action, safe category, clinic and correlation only—never token, message/medical text, PII, preview or attachment name.

## Ordering, recovery, and capacity

- A message has stable ID and unique increasing `sequence` per conversation. `(conversationId, sequence)` is the only authoritative order.
- Equal retry returns the same message; changed payload with same idempotency identity returns `CHAT_IDEMPOTENCY_CONFLICT`. Cursor is opaque/versioned/server-bound and is not authority. Invalid/foreign/unauthorized cursor fails without existence leakage.
- Reconnect establishes a new authenticated connection and rechecks every current access condition. It syncs a bounded ascending backlog through an authorized high-water mark; client deduplicates ID/sequence and reconciles any gap.
- Token is Socket.IO handshake `auth` only, never URL/query/log, closes at expiry plus at most five seconds skew, and is renewed only through normal REST refresh. Per user: at most three live connections.
- MVP proof targets: 100 consultations, 300 participants, 600 connections, 20 committed messages/second for 30 minutes, 50/second for five minutes, 300 reconnects in 60 seconds, 30 messages/user/minute (five/10s burst), 120 messages/conversation/minute, 4,000 Unicode characters, and 95% connected-recipient signal or explicit reconnecting within two seconds.

## Ownership

- `F10-T02` owns all Prisma/migration/retention persistence.
- `F10-T03` owns REST, authorization, stable errors, rate checks, OpenAPI/client slice.
- `F10-T04` solely owns pinned Socket.IO dependencies, lockfile, module/gateway wiring, handshake/reconnect/connection policy.
- `F10-T05` owns receipts/outbox/notification safety; `F10-T07` owns waiting room/presence; `F10-T08` owns app/dashboard connection; `F10-T09` owns capacity/security proof.
- `F10-T06` and `F10-T10` are `DEFERRED / NOT_APPLICABLE FOR MVP` and evidence absence only.
