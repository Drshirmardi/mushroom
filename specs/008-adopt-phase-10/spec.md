# Feature Specification: Phase 10 — Chat & Online Consultation

**Feature Branch**: `codex/phase-10-chat-consultation`
**Created**: 2026-09-16
**Status**: `F10-T01` contract baseline frozen for implementation; live execution status remains in `plan/STATUS.md`.
**Input**: Prepare the authoritative Phase 10 roadmap for appointment-bound chat and online consultation while preserving the established Phase 10 roadmap IDs and task sequence.

## Clarifications

### Session 2026-09-16

- Q: Must therapeutic messaging be tied to a valid online appointment? → A: Yes; standalone/public/long-lived messaging is deferred, and invalid/cancelled/ended appointments preserve only authorized history.
- Q: Which clinic-side roles can participate? → A: ADMIN acts only as explicit clinic/operator in-clinic; linked assigned DOCTOR may read/send/report; STAFF has no MVP access; an unlinked DoctorProfile is never a live participant.
- Q: What is the engineering retention baseline? → A: Retain conversation content/evidence for 10 years after the later terminal appointment or conversation close, with no automatic disposition before Phase 12 legal confirmation and legal hold suspending disposition.
- Q: Can messages be edited or deleted? → A: No; messages are immutable and never hard-deleted. Authorized ADMIN moderation alone may idempotently restrict/restore visibility with a controlled reason and safe tombstone.
- Q: How do report and block work? → A: Eligible participants may report others; blocks are reviewable, conversation-scoped, two-way `PATIENT_DOCTOR` or `PATIENT_CLINIC_OPERATOR` future-send boundaries resolved only by clinic-scoped ADMIN.
- Q: Are attachments in MVP scope? → A: No; the MVP is text-only and creates no attachment/upload/object-storage/security pipeline.
- Q: Is video in MVP scope? → A: No; `F10-T10` is intentionally `DEFERRED / NOT_APPLICABLE FOR MVP` and fail-closed.
- Q: When is waiting-room/chat access live? → A: From 15 minutes before to 60 minutes after an eligible online appointment, with an operational-state hard cap at four hours after scheduled end.
- Q: What is the realtime/reconnect guarantee? → A: Durable PostgreSQL history is authoritative; realtime is at-least-once and sync is sequence/high-water-mark based with repeat-safe sends.
- Q: What capacity is accepted for MVP? → A: 100 consultations, 300 authenticated participants, 600 connections, 20 sustained and 50 burst committed messages per second, with the stated bounded reconnect/rate-limit controls.
- Q: Which realtime architecture is approved? → A: NestJS WebSocket Gateway plus pinned Socket.IO in the existing modular monolith; PostgreSQL/REST remains authoritative, Socket.IO is at-least-once signaling only, and Redis/Centrifugo/external messaging platforms are excluded from the single-instance MVP.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consult through an eligible appointment (Priority: P1)

A patient with a valid online appointment can enter its consultation context, exchange permitted messages with the authorized clinic-side participant, and later read the retained permitted history.

**Why this priority**: Appointment-bound scope protects patient privacy and makes consultation access deterministic before any realtime or attachment work begins.

**Independent Test**: A patient can access only the conversation created for their own valid online appointment; a different patient and an unrelated clinic-side account receive no conversation metadata.

**Acceptance Scenarios**:

1. **Given** a valid online appointment owned by the patient, **When** the authorized consultation context is opened, **Then** one appointment-bound conversation is available without public or long-lived standalone messaging.
2. **Given** an appointment is cancelled, ends, or otherwise becomes ineligible for live consultation, **When** an actor tries to send a message, **Then** sending follows the frozen appointment-state policy while previously permitted history remains available to authorized participants.

---

### User Story 2 - Conduct a safe online consultation (Priority: P2)

Authorized participants can communicate reliably during the approved consultation window, resume safely after an interrupted connection, and use the waiting room only for the matching valid online appointment.

**Why this priority**: Delivery must never expose a conversation to a non-participant or lose/duplicate a persisted message during a connection interruption.

**Independent Test**: Two authorized participants reconnect during an eligible consultation and receive the same ordered persisted history exactly once; a non-participant cannot join the waiting room or receive metadata.

**Acceptance Scenarios**:

1. **Given** an eligible participant loses connectivity after sending a message, **When** they reconnect, **Then** persisted history and delivery state reconcile without a missing or duplicate message.
2. **Given** an online appointment is valid within its approved waiting-room window, **When** its participant enters the waiting room, **Then** presence is limited to that appointment and expires outside the frozen window.

---

### User Story 3 - Protect and manage consultation content (Priority: P3)

An authorized participant can use only the frozen text-message controls and report or block abuse according to policy; attachment, audio, and video controls remain unavailable in the MVP.

**Why this priority**: Consultation content can be sensitive medical information and must not be silently erased, leaked, or made permanently available through unsafe text, moderation, or retention paths.

**Independent Test**: A report/block action is auditable and does not disclose its reporter; attachment/audio/video controls and APIs are absent or fail closed; forbidden edit/delete attempts preserve evidence and return a stable error.

**Acceptance Scenarios**:

1. **Given** a participant reports or blocks another participant, **When** the action is accepted, **Then** the action is visible only to its authorized operational audience and does not disclose sensitive content to unrelated users.
2. **Given** a participant attempts to use attachment, audio, or video functionality, **When** the consultation interface or API is used, **Then** the operation is unavailable without creating a file, provider request, or fabricated success.

### Edge Cases

- A patient, clinic-side participant, appointment, clinic, or doctor relationship changes while a conversation is open.
- A doctor profile exists without a linked user account.
- A late, duplicated, malformed, or stale message/reconnect request arrives.
- A message is reported, blocked, or restricted near a consultation-state transition.
- A waiting-room entry occurs before, after, or outside the approved window.
- A video provider has not been product-approved.
- A retention or legal-hold rule would otherwise conflict with a user-requested removal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (`F10-T01`)**: Every Phase 10 conversation MUST be bound to exactly one valid `ONLINE` appointment; standalone, public, or long-lived messaging is out of scope and must not be created implicitly.
- **FR-002 (`F10-T01`)**: A conversation MUST be visible only within its active clinic and appointment membership: the patient owner; the assigned doctor only when its `DoctorProfile.userId` matches the authenticated user; and an authorized `ADMIN` acting under the explicit clinic/operator identity. `STAFF` has no read, send, realtime, receipt, presence, or moderation access in this MVP; Phase 11 owns any later access requirement.
- **FR-003 (`F10-T01`)**: `ADMIN` may read, send under the explicit clinic/operator identity, review/resolve reports, and apply block/unblock only in the active clinic, with sensitive reads, sends, and moderation actions audited. An `ADMIN` MUST NOT impersonate a doctor.
- **FR-004 (`F10-T01`)**: The assigned linked `DOCTOR` may read, send, and report only in the matching appointment conversation; it may not resolve reports, apply an administrative block, or view another patient’s or doctor’s conversation. A DoctorProfile without a valid linked authenticated user is not a live participant and has no access, membership, presence, receipt, or send capability.
- **FR-005 (`F10-T01`)**: Role alone MUST NOT authorize any operation; the server MUST also enforce the applicable permission, active clinic, and matching appointment/conversation resource membership. When no linked doctor exists, the authorized `ADMIN` may respond only as the explicit clinic/operator and the service MUST NOT synthesize doctor identity or presence.
- **FR-006 (`F10-T01`)**: Appointment cancellation, completion, no-show, invalidation, or another terminal state MUST stop or limit sending exactly as the frozen lifecycle policy states, while preserving authorized historical access and audit evidence.
- **FR-007 (`F10-T01`)**: Conversation content, messages, receipts, moderation records, audit evidence, and—only if attachment becomes approved—its metadata MUST be retained for 10 years after the later of the related appointment becoming terminal or the conversation closing. This is a conservative engineering baseline, not a jurisdiction-specific legal-compliance claim.
- **FR-008 (`F10-T01`)**: Account deletion or deactivation MUST terminate sessions and future access but MUST NOT hard-delete retained consultation history. A legal hold MUST suspend purge, anonymization, attachment/metadata deletion, and related destructive disposition; hold creation, release, change, and attempted disposition MUST be audited.
- **FR-009 (`F10-T01`)**: Before Phase 12 legal/product confirmation, the service MUST implement no automated purge, anonymization, crypto-shredding, cleanup job, or premature retention-policy engine. Phase 10 may define only the future retention/legal-hold boundaries required by its data contract; Phase 12 owns legal duration/start-event confirmation and provable backup, replica, export, and object-storage disposition alignment.
- **FR-010 (`F10-T01`)**: A persisted message is immutable: no actor may edit its text, sender, timestamp, or ordering, and no endpoint may hard-delete a message, receipt, report, or moderation history.
- **FR-011 (`F10-T01`)**: A report alone MUST NOT alter visibility. An authorized moderation `ADMIN` may idempotently change a message only between `VISIBLE` and `RESTRICTED`, scoped to the active clinic and with a mandatory audited reason category: `ABUSE_OR_HARASSMENT`, `THREAT_OR_SAFETY`, `SENSITIVE_DATA_EXPOSURE`, `SPAM_OR_SCAM`, `MALICIOUS_CONTENT`, or `OTHER`; `OTHER` requires a non-sensitive internal note that does not repeat message or medical content.
- **FR-012 (`F10-T01`)**: A `RESTRICTED` message MUST retain its identifier, sequence position, sent time, sender role, receipt state, retention, legal-hold and historical evidence, but ordinary participants receive only a common tombstone and localized broad reason category. They MUST NOT receive original text, preview, search snippet, notification body, attachment detail, moderator identity, or internal moderation note.
- **FR-013 (`F10-T01`)**: Only an authorized moderation `ADMIN`, in an explicit review path, may read original restricted content; every such read is audited. History, search, direct lookup, notification, cache, and realtime paths MUST apply the current visibility state so a restricted payload cannot reappear. Bulk edit/delete, sender removal, timed editing, and automatic cleanup are out of scope.
- **FR-014 (`F10-T01`)**: A patient may report a message sent by its assigned doctor or clinic/operator; an assigned linked doctor may report a patient message; an authorized clinic-scoped `ADMIN` may create an internal report or review one. No ordinary participant may report its own message, and `STAFF` has no report access. Report retry is idempotent per eligible reporter/message while independent eligible reporters may report the same message.
- **FR-015 (`F10-T01`)**: A report MUST retain its message, conversation, reporter, reason category, timestamp, and optional non-sensitive explanation without copying message or medical content into report/audit metadata. Its initial categories are `ABUSE_OR_HARASSMENT`, `THREAT_OR_SAFETY`, `SENSITIVE_DATA_EXPOSURE`, `SPAM_OR_SCAM`, `MALICIOUS_CONTENT`, and `OTHER`.
- **FR-016 (`F10-T01`)**: A report does not itself restrict content or block communication. An eligible reporter may request immediate future-message stopping, creating a `PENDING_REVIEW` temporary block. Blocks are conversation-scoped only: `PATIENT_DOCTOR` stops future human sends in both directions between patient and assigned doctor; `PATIENT_CLINIC_OPERATOR` independently stops future human sends in both directions between patient and clinic/operator ADMINs. No global account block exists in MVP.
- **FR-017 (`F10-T01`)**: A block rejects only new human-message creation after its effective time and uses a stable error code. It neither changes an appointment, waiting-room eligibility, clinical access, nor necessary system appointment-status messages; it never removes previously persisted history, receipts, reports, audit, retention, or legal-hold evidence. A message committed before blocking remains historical even when its realtime delivery finishes later.
- **FR-018 (`F10-T01`)**: Only an authorized clinic-scoped `ADMIN` may idempotently and transactionally resolve a report, confirm or lift a temporary block, or take a permitted moderation action. The resolution is exactly one of `DISMISSED_NO_VIOLATION`, `UPHELD_POLICY_VIOLATION`, `INSUFFICIENT_EVIDENCE`, or `ESCALATED_SAFETY_OR_LEGAL`; separately recorded actions are `NO_ADDITIONAL_ACTION`, `RESTRICT_MESSAGE`, `RECORD_WARNING`, `CONFIRM_PATIENT_DOCTOR_BLOCK`, `CONFIRM_PATIENT_CLINIC_OPERATOR_BLOCK`, and `LIFT_TEMPORARY_BLOCK`. A rejected report cannot confirm a block, and escalation never automatically deletes an account or data.
- **FR-019 (`F10-T01`)**: A reporter receives only the display-safe general status/result. Internal ADMIN notes, moderator identity, and safety/legal details remain restricted. Every review, restricted-content read, resolution, block, and unblock records non-sensitive reason, actor, timestamp, and audit evidence.
- **FR-020 (`F10-T01`)**: The Phase 10 MVP supports text messages only. Attachments, images, files, and audio are out of scope; app and dashboard controls for them MUST be hidden or explicitly disabled without mock behavior, and mock file text/names MUST NOT remain in the real conversation source.
- **FR-021 (`F10-T01`)**: Phase 10 MUST NOT create object storage, upload endpoints, attachment persistence, or a malware/quarantine pipeline for future use. A future attachment requirement must separately freeze accepted type/size, quarantine and malware validation, private time-bounded access, retention, legal hold, and cleanup. The absence of attachments MUST NOT block text messages, receipts, realtime, moderation, or the waiting room.
- **FR-022 (`F10-T01`)**: Video is `DEFERRED / NOT_APPLICABLE FOR MVP`; its intentional absence MUST NOT block Phase 10 software closure. No video provider, SDK, adapter, token, room identifier, join URL, callback, credential, environment variable, migration, generic WebRTC/STUN/TURN/media-session abstraction, or external video request is authorized.
- **FR-023 (`F10-T01`)**: App and dashboard audio/video-call controls MUST be hidden with no placeholder, fabricated link, or simulated success. The waiting room may expose only eligibility, text-chat access, readiness, and presence; it MUST NOT imply that an audio/video session exists. Tests MUST prove no video token, room, join control, or external request is produced.
- **FR-024 (`F10-T01`)**: Future video activation requires an independently approved requirement freezing provider, room/token contract, authentication, authorization, consent, recording policy, retention, data residency, network failures, observability, credential management, acceptance environment, and production sign-off. Phase 10 evidence/checklists must record `F10-T10` as intentionally deferred, never as an implemented capability.
- **FR-025 (`F10-T01`)**: The baseline consultation window opens at `Appointment.startsAt - 15 minutes` and closes at `Appointment.endsAt + 60 minutes`, calculated server-side from UTC timestamps. Clinic timezone is presentation-only. Entry, human-message creation, and presence require an `ONLINE` appointment within this window and state `CONFIRMED`, `CHECKED_IN`, `QUEUED`, or `IN_PROGRESS`; `PENDING` is history-only until confirmation.
- **FR-026 (`F10-T01`)**: `CANCELLED`, `COMPLETED`, and `NO_SHOW` immediately close waiting-room entry, presence, and new human sends while preserving authorized history, tombstones, receipts, and moderation results. A `CONFIRMED` appointment that has not entered the operational flow by baseline close has no extension. `CHECKED_IN`, `QUEUED`, or `IN_PROGRESS` before baseline close may continue for operational delay only until the hard cap `endsAt + 4 hours`; the hard cap thereafter fails closed pending operational correction.
- **FR-027 (`F10-T01`)**: An authorized ADMIN retains historical review/moderation after the window but cannot send a clinic/operator human message outside it. A committed pre-close message remains valid historical evidence and may finish delivery; a send that reaches the server after state/window closure is rejected. Reschedule recalculates the window from the new appointment times without deleting historical conversation evidence.
- **FR-028 (`F10-T01`)**: Each join, reconnect, presence refresh, and text-message creation MUST re-evaluate authenticated actor, permission, clinic, appointment/conversation membership, online visit mode, state, window, and effective block server-side. Presence is a lease that expires without heartbeat; disconnect, browser close, or lease expiry must not change an appointment or encounter.
- **FR-029 (`F10-T01`)**: PostgreSQL and the authorized history path are the source of truth. Realtime is at-least-once, low-latency signaling only and may be duplicate, delayed, or out of order. Each message has a stable identity and one unique increasing server-assigned `sequence` within its conversation; authoritative order is `(conversationId, sequence)`, never timestamp or transport arrival order.
- **FR-030 (`F10-T01`)**: A text-message send MUST include a client-generated `clientMessageId`; sender, conversation, and this identifier form the idempotency boundary. An identical retry returns the same message; different payload under the same boundary fails with a stable conflict. Clients deduplicate realtime events by message identity and sequence.
- **FR-031 (`F10-T01`)**: History cursors are opaque, versioned, server-validated representations of the conversation and last applied sequence; they are neither a secret nor access authority. Cursor mismatch, malformed form, unsupported version, or unauthorized membership fails closed without disclosing another conversation. A cursor has no independent expiry while its retained conversation and participant authorization remain valid.
- **FR-032 (`F10-T01`)**: Reconnect always creates a new authenticated connection; prior connection identifiers and room membership are not resumable authority. After access-token refresh, the client supplies its last fully applied sequence; the server rechecks all current access conditions, establishes a high-water mark, returns bounded ascending message and receipt updates through that mark, then continues later events from the boundary. Client gap, duplicate, or unexpected sequence detection triggers full reconciliation.
- **FR-033 (`F10-T01`)**: The access token is permitted only in a secure handshake/auth payload, never a URL or log, and the connection closes at its expiry with at most five seconds clock skew. Realtime receives no refresh token and issues no session. A disconnect invalidates the prior connection; clients retry with jittered backoff from 1 to 30 seconds and show an explicit offline/reconnecting state.
- **FR-034 (`F10-T01`)**: Presence heartbeat is every 15 seconds with a 45-second lease; a reconnect inside the lease may renew presence without flicker, and expiry makes the participant offline. Join, reconnect, heartbeat, send, and receipt acknowledgement each recheck authentication, membership, block, and appointment eligibility.
- **FR-035 (`F10-T01`)**: Delivery/read receipts use monotonic high-water marks `lastDeliveredSequence` and `lastReadSequence`; an equal or lower acknowledgement is a no-op. Realtime fan-out happens only after message commit and may fail without rolling back or losing the committed message; reconnect/history must recover it. The product guarantee is one durable message per logical send and gap-free authorized history after sync, not exactly-once transport.
- **FR-036 (`F10-T01`)**: MVP acceptance capacity is 100 simultaneous consultations in one active clinic, 300 simultaneous authenticated participants, and 600 simultaneous realtime connections. Each user has at most three live connections; an additional connection either closes the oldest or receives a stable rejection.
- **FR-037 (`F10-T01`)**: The service MUST sustain at least 20 committed messages/second for 30 minutes and at least 50 committed messages/second for a five-minute burst, including a reconnect storm of all 300 participants within 60 seconds with cursor sync and no durable loss or duplicate. It MUST apply controlled rate-limit/backpressure rather than crash, consume unbounded memory, or bypass authorization.
- **FR-038 (`F10-T01`)**: A text message contains at most 4,000 Unicode characters. Send limits are 30 messages/user/minute with a burst of at most five per 10 seconds, and 120 messages/conversation/minute; an over-limit request receives a stable error. In load testing, at least 95% of committed messages signal a connected participant within two seconds or the UI explicitly becomes reconnecting; after sync, 100% of committed messages appear gap-free and without durable duplication.
- **FR-039 (`F10-T01`)**: These limits are Phase 10 acceptance criteria, not a production-capacity claim. Phase 12 owns any multi-instance topology and production-capacity review with operational metrics and load evidence.
- **FR-040 (`F10-T01`)**: No external complete messenger, repository fork, embedded messenger UI, or independent durable message store is authorized. Messaging domain behavior remains inside the existing API and app/dashboard own their dedicated chat UI.
- **FR-041 (`F10-T01`)**: The approved realtime transport is a NestJS WebSocket Gateway with precisely pinned Socket.IO dependencies. Socket.IO is only authenticated signaling and connection management; it is never the durable message store or source of truth.
- **FR-042 (`F10-T01`)**: Text send is an authenticated, idempotent REST operation: validate clientMessageId, appointment eligibility, authorization, block, and rate limits; commit message and sequence in PostgreSQL; then publish only to authorized participants after successful commit.
- **FR-043 (`F10-T01`)**: Socket.IO authentication uses only secure handshake `auth` payload, never URL/query token. The backend alone authorizes joins and publishes; a client cannot choose an arbitrary room. Reconnect revalidates token, role, block, and resource access, and durable cursor sync remains authoritative over any Socket.IO recovery optimization.
- **FR-044 (`F10-T01`)**: The single-instance MVP adds no Redis/Redis Streams adapter unless a later accepted multi-instance design or load evidence proves it necessary. Centrifugo is an evaluated future alternative only. Phase 12 owns any distributed adapter/topology decision. Attachment and video remain out of scope.
- **FR-045 (`F10-T02`)**: Persistence MUST establish conversation, participant, message, receipt, moderation, and audit boundaries required by the frozen text-only contract.
- **FR-046 (`F10-T03`)**: Authorized participants MUST be able to retrieve bounded ordered history and create text messages through a repeat-safe authoritative REST path.
- **FR-047 (`F10-T04`)**: The Socket.IO gateway MUST authenticate, authorize, reconnect, and synchronize without weakening the authoritative history/message boundary.
- **FR-048 (`F10-T05`)**: Delivery/read receipts and notifications MUST be participant-scoped, repeat-safe, and consistent with persisted message state.
- **FR-049 (`F10-T06`)**: Attachment work is `DEFERRED / NOT_APPLICABLE FOR MVP`; no storage, upload, model, pipeline, or mock UI is authorized.
- **FR-050 (`F10-T07`)**: Waiting-room access and presence MUST be limited to the appointment-bound online consultation and its approved window.
- **FR-051 (`F10-T08`)**: The patient app and dashboard MUST consume real authorized consultation data and remove only in-scope mock/attachment/audio/video behavior.
- **FR-052 (`F10-T09`)**: The phase MUST prove ordering, reconnect, abuse, authorization, Socket.IO transport boundaries, and capacity behavior against the frozen consultation contract.
- **FR-053 (`F10-T10`)**: Video is intentionally `DEFERRED / NOT_APPLICABLE FOR MVP`; future activation needs its own approved contract and must not be marked implemented in this phase.
- **FR-054 (`F10-T11`)**: Evidence MUST demonstrate the complete consultation slice and all explicitly required authorization, retention, lifecycle, realtime, deferred-video/attachment, and cross-surface checks.

### Key Entities

- **Appointment-bound conversation**: The private consultation container whose identity, clinic scope, and lifecycle derive from one online appointment.
- **Conversation participant**: A patient owner or authorized clinic-side actor with a frozen scope, role/capability, and resource relationship.
- **Message**: A durable ordered communication item with delivery/read state, moderation state, retention controls, and immutable audit identity.
- **Waiting-room presence**: A time-bounded indication that an authorized participant is available for the matching online appointment.
- **Moderation action**: A report, block, or operational review record that protects reporter privacy and preserves required evidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In authorization testing, 100% of cross-patient, cross-clinic, and non-participant conversation/history/waiting-room attempts are denied without returning conversation metadata.
- **SC-002**: During the approved consultation window, reconnect testing demonstrates no missing or duplicate persisted message across 100 repeated interrupted-send scenarios.
- **SC-003**: 100% of messages accepted for delivery remain retrievable in their authorized history after a permitted appointment lifecycle transition.
- **SC-004**: 100% of attempted attachment/upload/audio/video operations are absent or fail closed in the MVP, and every report/block/restriction decision has the required auditable evidence.
- **SC-005**: Capacity testing proves 100 simultaneous consultations, 300 authenticated participants, 600 connections, 20 sustained and 50 burst committed messages/second, the stated reconnect storm, controlled rate-limit/backpressure, and no authorization, ordering, or durable-duplication violation.

## Assumptions

- The existing authenticated user, active-clinic context, appointment state machine, and clinical access principles remain authoritative.
- A `DoctorProfile` with no linked `User` is excluded from every live consultation operation; it does not prevent an authorized ADMIN clinic/operator response.
- Chat content is sensitive consultation information: operational logs and audit metadata must redact message text, attachment names/content, and patient PII.
- Phase 10 does not create general messaging, patient groups, cross-clinic messaging, AI/bot communication, or a video implementation without its own approved requirement.
- Legal/jurisdictional retention confirmation is a Phase 12 external gate; no Phase 10 job, automatic disposition, or attachment-only data model is authorized by this policy.
