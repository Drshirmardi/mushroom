# Feature Specification: Adopt Phase 05

**Feature Branch**: `codex/phase-05-appointment-booking-dashboard-operations`

**Created**: 2026-09-02
**Status**: Phase 05 execution is complete and `READY_FOR_REVIEW`. The authoritative live state
remains [`plan/STATUS.md`](../../plan/STATUS.md).

**Input**: Adopt the authoritative Phase 05 roadmap without changing its scope, IDs, ordering,
dependencies, acceptance criteria, status, or implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Make a Conflict-Safe Appointment (Priority: P1)

An eligible patient can create, read, cancel, and reschedule an appointment safely.

**Independent Test**: One of 100 concurrent requests for one slot succeeds; retrying the original
idempotency key does not create another appointment; a changed eligibility policy rejects create
or reschedule with `BOOKING_INELIGIBLE`.

**Acceptance Scenarios**:

1. **Given** a valid eligibility decision and available slot, **When** a patient creates an
   appointment, **Then** one appointment is created with a price snapshot.
2. **Given** the same create request and idempotency key, **When** it is retried, **Then** no
   second appointment is created.
3. **Given** eligibility changes after slot selection, **When** creation or rescheduling occurs,
   **Then** it is rejected as `BOOKING_INELIGIBLE`.

---

### User Story 2 - Run the Clinic Day (Priority: P1)

An authorized administrator manages appointments and performs check-in, queue, call-next, start,
complete, and no-show operations with status history, reasons, and activity.

**Independent Test**: Authorized lifecycle and queue operations, including retries, retain a
consistent operational state.

**Acceptance Scenarios**:

1. **Given** an appointment, **When** a permitted administrator performs an operation, **Then**
   the allowed transition and applicable history, reason, and activity are retained.
2. **Given** a repeated state or queue operation, **When** it is processed again, **Then** no
   incompatible state results.

---

### User Story 3 - See Truthful Appointment Operations (Priority: P2)

Patients complete all `/appointments/**` routes through the real booking flow. Administrators use
real appointments, calendar, queue, and Dashboard Home V1 operations data.

**Independent Test**: The register → profile → conditional assessment → booking → dashboard
browser journey passes, and Home V1 figures agree with the operations views.

**Acceptance Scenarios**:

1. **Given** Phase 04 directory/availability and conditional assessment eligibility, **When** a
   patient books, **Then** the appointment is present in administrator operational views.
2. **Given** supported operations data, **When** Home V1 opens, **Then** its appointment,
   profile-completion, queue, schedule, and activity widgets are real and consistent.
3. **Given** no source exists for financial, order, treatment, or common disease/mezaj widgets,
   **When** Home V1 opens, **Then** they remain hidden.

### Edge Cases

- Create/reschedule re-check eligibility at the trusted use-case boundary.
- One active doctor overlap accepts exactly one of 100 simultaneous create requests.
- An idempotency-key retry does not duplicate an appointment.
- Repeated lifecycle/queue operations do not create incompatible state.
- List, calendar, queue, and Home V1 figures share consistent sources; future-source widgets are
  hidden rather than mocked or represented by invented zeroes.

## Requirements *(mandatory)*

### Roadmap Adoption Boundary

The following fourteen roadmap tasks are adopted one-to-one, with no renaming,
splitting, merging, reordering, claiming, or completion-state change:

- **`F05-T01`** — state machine, cancellation/reschedule policy and price snapshot
- **`F05-T02`** — migration, index and exclusion constraint overlap active doctor
- **`F05-T03`** — create appointment with eligibility authoritative and idempotency
- **`F05-T04`** — patient list/detail/cancel/reschedule
- **`F05-T05`** — admin create-on-behalf/list/filter/confirm/cancel/reschedule
- **`F05-T06`** — check-in/queue/call-next/start/complete/no-show
- **`F05-T07`** — status history/reason/operational activity
- **`F05-T08`** — all app appointment flow and no MVP payment/wallet dependency
- **`F05-T09`** — dashboard appointments/calendar/queue
- **`F05-T10`** — Dashboard Home V1 KPI/today plan/real activity
- **`F05-T11`** — OpenAPI/client and appointment/operations mock removal
- **`F05-T12`** — concurrency/idempotency/authorization/state-machine tests
- **`F05-T13`** — cross-app browser E2E and query/load baseline
- **`F05-T14`** — evidence and Milestone B review

Phase 03 and Phase 04 are `DONE`. The adoption itself did not claim a batch or `F05-T01`, change
`plan/STATUS.md`, change a roadmap checkbox, or alter implementation; subsequent execution is
recorded only in the authoritative roadmap and task evidence.

### Functional Requirements

- **FR-001**: `plan/` MUST remain authoritative for Phase 05 scope, task IDs, ordering,
  dependencies, acceptance criteria, status, and evidence.
- **FR-002**: The workset MUST remain exactly `F05-T01` through `F05-T14`; adoption MUST NOT
  split, merge, rename, reorder, claim, or complete it.
- **FR-003**: Adoption MUST NOT activate Phase 05, modify implementation/migrations/generated
  clients/Phase 04 files, or change unrelated files.
- **FR-004 (`F05-T01`)**: Lifecycle, cancellation/reschedule policy, and price snapshot MUST be
  established before dependent appointment work.
- **FR-005 (`F05-T02`)**: Persistence MUST provide the roadmap-required migration, indexes, and
  active-doctor-overlap exclusion constraint.
- **FR-006 (`F05-T03`)**: Create MUST enforce eligibility authoritatively and be idempotent.
- **FR-007 (`F05-T04`)**: Patients MUST list, read, cancel, and reschedule permitted appointments.
- **FR-008 (`F05-T05`)**: Authorized administrators MUST create on behalf of patients and list,
  filter, confirm, cancel, and reschedule appointments.
- **FR-009 (`F05-T06`)**: Authorized operations MUST support check-in, queue, call-next, start,
  complete, and no-show without incompatible repeats.
- **FR-010 (`F05-T07`)**: Lifecycle changes MUST retain status history, applicable reason, and
  operational activity.
- **FR-011 (`F05-T08`)**: Every patient appointment route MUST use the real flow; confirmation
  MUST not require wallet or online payment in the MVP.
- **FR-012 (`F05-T09`)**: Dashboard appointments, calendar, and queue MUST use real operations
  data with truthful states.
- **FR-013 (`F05-T10`)**: Home V1 MUST source today's appointments, in-person/online counts,
  profile-completion patients in period, pending requests, today's schedule, checked-in/queued/
  in-progress counts, average wait from `checkedInAt` to `startedAt`, completed visits, and
  patient/assessment/booking activity.
- **FR-014 (`F05-T10`)**: Financial/order/treatment/common disease/mezaj widgets MUST remain
  hidden until each has a real source.
- **FR-015 (`F05-T11`)**: Generated client and in-scope mock removal MUST synchronize with the
  implemented contract.
- **FR-016 (`F05-T12`)**: Tests MUST cover concurrency, idempotency, authorization, and state
  machine behavior.
- **FR-017 (`F05-T13`)**: Verification MUST cover the required browser journey and query/load
  baseline.
- **FR-018 (`F05-T14`)**: Milestone B evidence/review MUST occur only after phase criteria pass.

### Key Entities

- **Appointment**: The booked visit and lifecycle record.
- **Appointment Hold**: The roadmap-named booking-capacity concept.
- **Appointment Status History**: Chronological lifecycle changes and reasons.
- **Queue Entry**: Operational day-of-visit queue record.
- **Operational Activity**: Sourced operations activity.

## Success Criteria *(mandatory)*

- **SC-001**: Exactly one of 100 concurrent requests for one slot succeeds.
- **SC-002**: Same-key retry creates no duplicate appointment.
- **SC-003**: Create/reschedule rejects changed eligibility with `BOOKING_INELIGIBLE`.
- **SC-004**: Appointment, calendar, queue, and Home V1 shared figures agree.
- **SC-005**: The required browser journey passes.

## Assumptions

- Phase 03 eligibility and Phase 04 directory/derived availability remain authoritative inputs.
- MVP confirmation has no mandatory wallet/payment dependency.
- The source declares list order but no per-task `Depends on` fields or batch map; this adoption
  preserves that fact and invents no dependency graph.
- Exact policies, states, fields, routes, and schemas remain for their owning roadmap tasks.
