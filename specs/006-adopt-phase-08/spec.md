# Feature Specification: Adopt Phase 08 — Follow-up, Health Tracking, Notifications & Content

**Feature Branch**: `codex/phase-08-follow-up-health-tracking-notifications-content`
**Created**: 2026-09-05
**Status**: Phase 08 is `IN_PROGRESS`; `F08-T01` through `F08-T07` are complete, while `F08-T08` through `F08-T11` remain unchecked. Live execution state is in `plan/STATUS.md`.
**Input**: Adopt the authoritative Phase 08 roadmap into Spec Kit without activating implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record and review health follow-up (Priority: P1)

A patient records health-tracking information, and the patient app and dashboard can use the same observation information.

**Why this priority**: Shared health observation is the first explicit Phase 08 exit outcome.

**Independent Test**: A permitted observation is recorded and the matching patient and dashboard views show the same persisted observation without fabricated data.

**Acceptance Scenarios**:

1. **Given** a permitted health metric with its approved unit and range, **When** a patient records an observation, **Then** the accepted observation is available to the authorized patient and dashboard health views.
2. **Given** a versioned assessment result, **When** its mezaj result is viewed, **Then** the result is represented as the assessment-derived Phase 08 result rather than a local substitute.

---

### User Story 2 - Receive appropriate follow-up (Priority: P2)

A patient manages notification preferences, reads in-app notifications, and receives no duplicate appointment or treatment reminder.

**Why this priority**: Preference-respecting, repeat-safe notification is an explicit Phase 08 exit outcome.

**Independent Test**: A permitted notification is visible to its patient, can be marked read, respects the configured preference, and a retry does not create a duplicate reminder.

**Acceptance Scenarios**:

1. **Given** a notification preference, **When** a relevant in-app notification is considered for delivery, **Then** the preference is respected.
2. **Given** an appointment or treatment reminder is retried, **When** delivery work restarts, **Then** the patient does not receive a duplicate notification.

---

### User Story 3 - Read published educational content (Priority: P3)

A patient reads only published educational articles and related published content, while the dashboard manages the content lifecycle.

**Why this priority**: Published-only patient visibility is the fourth explicit Phase 08 exit outcome.

**Independent Test**: A patient can access published content and cannot access content that is not published.

**Acceptance Scenarios**:

1. **Given** an article or related content record is published, **When** a patient requests it, **Then** it is available in the patient content experience.
2. **Given** content that is not published, **When** a patient requests it, **Then** it is not exposed as patient-visible content.

---

### User Story 4 - Complete the connected follow-up journey (Priority: P4)

The patient app and dashboard use real Phase 08 sources for health tracking, notifications, and content, and the milestone journey is verified across restart, retry, timezone, and browser behavior.

**Why this priority**: The roadmap requires connected interfaces and a reliable asynchronous reminder path, not standalone or mock-only views.

**Independent Test**: The Phase 08 browser journey uses persisted health, notification, and published-content data; retry and restart checks preserve idempotent notification behavior.

**Acceptance Scenarios**:

1. **Given** real Phase 08 sources, **When** the app and dashboard journeys are exercised, **Then** their in-scope views do not rely on mock scope data.
2. **Given** reminder work spanning a timezone boundary or process restart, **When** it is retried, **Then** the result remains repeat-safe and independent of an HTTP request.

### Edge Cases

- A metric, unit, or range is invalid for its approved observation contract.
- A health read is attempted without the required patient or dashboard authorization.
- An assessment version does not supply a valid mezaj result.
- A notification is marked read repeatedly, a preference changes, or a delivery retry occurs after restart.
- An appointment or treatment schedule changes near a timezone boundary.
- A patient requests unpublished content or content whose media does not satisfy the Phase 08 media policy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (`F08-T01`)**: Metric, unit, range, and health-observation query contract work MUST remain exactly within the authoritative `F08-T01` boundary.
- **FR-002 (`F08-T02`)**: Tracker write/query behavior and dashboard health views MUST remain exactly within the authoritative `F08-T02` boundary.
- **FR-003 (`F08-T03`)**: Mezaj-result behavior MUST derive from a versioned assessment within the authoritative `F08-T03` boundary.
- **FR-004 (`F08-T04`)**: Notification, notification preference, and in-app read-state behavior MUST remain exactly within the authoritative `F08-T04` boundary.
- **FR-005 (`F08-T05`)**: Content publication lifecycle and media policy MUST remain exactly within the authoritative `F08-T05` boundary.
- **FR-006 (`F08-T06`)**: Any ADR and outbox/worker bootstrap MUST be limited to a real reminder need, exactly as bounded by `F08-T06`.
- **FR-007 (`F08-T07`)**: Appointment and treatment reminders MUST be idempotent, exactly as bounded by `F08-T07`.
- **FR-008 (`F08-T08`)**: Patient-app tracker, notification, and article connection MUST remain exactly within the authoritative `F08-T08` boundary.
- **FR-009 (`F08-T09`)**: Dashboard health, notification, and content connection MUST remain exactly within the authoritative `F08-T09` boundary.
- **FR-010 (`F08-T10`)**: Restart, retry, idempotency, timezone, and browser end-to-end validation MUST remain exactly within the authoritative `F08-T10` boundary.
- **FR-011 (`F08-T11`)**: In-scope mock removal and Milestone C review MUST remain exactly within the authoritative `F08-T11` boundary.

### Key Entities *(include if feature involves data)*

- **Health Observation**: A recorded health metric observation governed by the future metric, unit, range, and query contract.
- **Mezaj Result**: A health-related result derived from a versioned assessment.
- **Notification**: A patient-facing follow-up notice.
- **Notification Delivery**: The recorded delivery work for a notification.
- **Notification Preference**: A patient's permitted notification choices.
- **Article, Article Category, and Banner**: Educational content and its organization or presentation.
- **Outbox Event**: A durable follow-up event considered only for a real reminder/job need.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the validated Phase 08 journey, one authorized patient observation is shared by the patient app and dashboard health view.
- **SC-002**: In the validated notification journey, each retried reminder produces no duplicate patient notification and honors the applicable preference.
- **SC-003**: In the validated reminder journey, delivery continues independently of the originating HTTP request and remains retryable after restart.
- **SC-004**: In the validated content journey, every patient-visible content item is in the published state.

## Assumptions

- `plan/phases/08-FOLLOWUP-CONTENT.md` and `plan/STATUS.md` remain the execution source of truth; this adoption does not change their task IDs, ordering, status, dependencies, or acceptance criteria.
- Phase 05 is `DONE (CLOSED)`; the roadmap identifies Phase 07 treatment scheduling as the predecessor for treatment reminders.
- The source lists `F08-T01` through `F08-T11` in order but declares no individual task `Depends on` fields or batch map. This adoption creates neither.
- Exact fields, routes, schemas, delivery channels, worker technology, and media implementation details are future task decisions and are not frozen here.
- Phase 08 execution is live; this artifact remains subordinate to `plan/` for task status, claims, and completion evidence.
