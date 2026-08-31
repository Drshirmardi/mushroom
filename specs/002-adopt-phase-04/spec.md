# Feature Specification: Adopt Phase 04

**Feature Branch**: `main`

**Created**: 2026-09-01

**Status**: Adopted from authoritative roadmap; implementation not started

**Input**: User description: "Adopt the existing Phase 04 from plan/ into Spec Kit without
regenerating the roadmap, changing implementation code, or claiming F04-T01."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure a Bookable Clinic Directory (Priority: P1)

An administrator can maintain the clinic's patient-visible doctors, specialties, services,
doctor-service offerings, prices, working hours, closures, leave, and availability exceptions
without seed changes or direct database edits.

**Why this priority**: Patient discovery and appointment scheduling cannot be truthful until the
clinic controls the directory and capacity from its operational interface.

**Independent Test**: An administrator creates a doctor without a login account, assigns a
published service with a visit mode, duration, buffer, integer price, and currency, configures
working hours and an exception, and sees the resulting configuration reflected without direct
data manipulation.

**Acceptance Scenarios**:

1. **Given** an active clinic, **When** an administrator creates or edits patient-visible doctor,
   specialty, service, and offering data, **Then** the stored directory reflects the changes and
   retains explicit clinic ownership.
2. **Given** a doctor exists without a login account, **When** the administrator assigns services
   and working hours, **Then** the doctor can become bookable without first receiving credentials.
3. **Given** a closure, leave period, or valid exception, **When** it is saved, **Then** affected
   availability changes immediately without direct database manipulation.
4. **Given** an overlapping rule or invalid exception, **When** it is submitted, **Then** it is
   rejected at the trusted boundary and, where feasible, by persisted constraints.

---

### User Story 2 - Discover a Real Doctor, Service, and Time (Priority: P1)

A patient can view published doctor details, select an active doctor-service offering, and inspect
real availability derived from the clinic schedule.

**Why this priority**: This is the patient-facing output required before Phase 05 can create an
appointment.

**Independent Test**: A patient opens a published doctor, selects one active offered service and
visit mode, and sees available times that change when the administrator changes working hours,
adds a closure, or records leave.

**Acceptance Scenarios**:

1. **Given** published and unpublished directory records, **When** a patient browses doctor or
   service data, **Then** only published, active, clinic-scoped choices are visible.
2. **Given** an active doctor-service-mode combination, **When** availability is requested, **Then**
   times are derived on demand from rules and exceptions rather than read from a slot source of
   truth.
3. **Given** a doctor, service, or visit mode becomes inactive, **When** a patient refreshes the
   selection flow, **Then** that inactive combination is not offered as bookable.
4. **Given** a schedule-changing closure, leave period, or exception, **When** availability is
   requested again, **Then** the result reflects the change immediately.

---

### User Story 3 - Verify Scheduling Readiness Truthfully (Priority: P2)

An administrator can see whether the clinic schedule is ready and what is planned for the next
day, while the delivery team can verify the directory and availability boundary before
appointment operations begin.

**Why this priority**: Phase 04 must close with trustworthy operational visibility and evidence,
not merely persisted records or static cards.

**Independent Test**: The dashboard displays only sourced schedule-readiness and next-day values,
the configured administrator and patient journeys pass, and no reachable Phase 04 screen uses
mock directory, service, price, or availability data.

**Acceptance Scenarios**:

1. **Given** a complete or incomplete schedule configuration, **When** the dashboard opens,
   **Then** readiness reflects actual configuration and unsupported values are hidden rather than
   fabricated.
2. **Given** the Phase 04 configuration and patient journey, **When** phase verification runs,
   **Then** overlap, timezone, authorization, audit, query behavior, and browser journey evidence
   are recorded against the original roadmap tasks.
3. **Given** all Phase 04 acceptance criteria pass, **When** readiness for Phase 05 is assessed,
   **Then** the evidence shows that patient-visible data is administrator-managed and no in-scope
   mock remains.

### Edge Cases

- The MVP has one active clinic, but every directory and scheduling record retains an explicit
  clinic identity.
- A doctor without a login account remains administratively manageable and can be published.
- Prices never use fractional storage; every price includes an explicit currency.
- Duration and buffer values use minutes and must remain valid for slot derivation.
- Rules that overlap, cross invalid time boundaries, or create an invalid exception are rejected.
- Clinic closures override regular working hours; doctor leave and exceptions affect only their
  intended doctor and period.
- Time calculations use the clinic timezone while persisted timestamps remain unambiguous.
- An inactive doctor, service, offering, or visit mode is never returned as bookable even if a
  regular rule would otherwise produce time.
- Empty, loading, forbidden, unavailable, and failed states remain distinguishable; empty data is
  not replaced with mock records or invented zeroes.

## Requirements *(mandatory)*

### Roadmap Adoption Boundary

The following twelve unchecked roadmap tasks are adopted without renaming, splitting,
reordering, claiming, or changing their completion state:

- **`F04-T01`**: Doctor/service field contract, visit mode, duration, buffer, and price.
- **`F04-T02`**: Directory, doctor-service, and availability migration.
- **`F04-T03`**: Administrator clinic, doctor, specialty, and service management.
- **`F04-T04`**: Administrator doctor-service assignment with mode, duration, and price.
- **`F04-T05`**: Administrator working-hours, closures, leave, and exceptions management.
- **`F04-T06`**: On-demand slot generation and public doctor, service, and availability queries.
- **`F04-T07`**: Permission and audit coverage for schedule, price, and publication changes.
- **`F04-T08`**: Real dashboard settings forms.
- **`F04-T09`**: Patient doctor detail and doctor/service selection.
- **`F04-T10`**: Generated contract/client, development seed, and in-scope mock removal.
- **`F04-T11`**: Overlap, timezone, query-plan, and browser verification.
- **`F04-T12`**: Evidence and readiness for appointment operations.

The phase prerequisite remains Phase 02 completion together with the Phase 03 eligibility
contract. Phase 03 and Milestone A are complete. This adoption creates planning artifacts only;
it does not claim or start `F04-T01`, change `plan/STATUS.md`, or change any roadmap checkbox.

### Functional Requirements

- **FR-001 (Roadmap authority)**: `plan/` MUST remain authoritative for Phase 04 scope, ordering,
  stable task IDs, phase status, acceptance, and completion evidence.
- **FR-002 (Unchanged workset)**: The Phase 04 workset MUST remain exactly `F04-T01` through
  `F04-T12`; no task may be regenerated, renamed, split, reordered, or marked complete by this
  adoption.
- **FR-003 (No activation)**: Adoption MUST NOT claim a batch, start `F04-T01`, change Phase 04
  from `NOT_STARTED`, or modify implementation code.
- **FR-004 (`F04-T01`)**: The doctor/service contract MUST define the roadmap-required fields,
  visit modes, duration in minutes, buffer in minutes, integer price, and explicit currency before
  dependent implementation begins.
- **FR-005 (`F04-T02`)**: The persisted directory, doctor-service, and availability model MUST be
  introduced through a versioned migration with clinic ownership and integrity constraints.
- **FR-006 (`F04-T03`)**: An authorized administrator MUST be able to manage the clinic, doctors,
  specialties, and services needed by the patient-visible directory.
- **FR-007 (`F04-T04`)**: An authorized administrator MUST be able to assign a doctor to an active
  service and configure the offered visit mode, duration, buffer, price, currency, activity, and
  publication state defined by the frozen contract.
- **FR-008 (`F04-T05`)**: An authorized administrator MUST be able to manage recurring working
  hours, clinic closures, doctor leave, and doctor-specific availability exceptions.
- **FR-009 (`F04-T06`)**: Patient-visible directory and availability queries MUST expose only
  published active combinations and derive slots on demand from current scheduling rules and
  exceptions.
- **FR-010 (`F04-T07`)**: Schedule, price, and publication changes MUST require the appropriate
  existing authorization boundary and produce audit evidence without sensitive log leakage.
- **FR-011 (`F04-T08`)**: Every Phase 04 settings card in the administrator dashboard MUST perform
  its real in-scope action and present truthful loading, empty, forbidden, validation, unavailable,
  and failure states.
- **FR-012 (`F04-T09`)**: Patient doctor detail and doctor/service selection MUST consume the
  published directory contract and preserve the existing server eligibility gate at booking
  entry.
- **FR-013 (`F04-T10`)**: Phase 04 interfaces MUST be represented in the generated contract and
  client, deterministic development data MUST support verification, and reachable Phase 04 mocks
  MUST be removed without removing future-phase placeholders.
- **FR-014 (`F04-T11`)**: Phase verification MUST cover overlap rejection, invalid exceptions,
  clinic timezone behavior, active/publication filtering, query-plan evidence for actual list and
  availability access, authorization/audit behavior, and the administrator-to-patient browser
  journey.
- **FR-015 (`F04-T12`)**: Phase 04 MUST close only with evidence for every roadmap exit criterion
  and an explicit readiness handoff to Phase 05 appointment operations.
- **FR-016 (Clinic scope)**: The MVP MAY operate one active clinic, but all domain records and
  trusted operations MUST retain explicit clinic ownership.
- **FR-017 (Doctor identity)**: A doctor profile MUST be creatable and manageable before it is
  linked to a login account.
- **FR-018 (Slot derivation)**: A slot MUST NOT become an independent persisted source of truth;
  current rules, closures, leave, and exceptions determine availability.
- **FR-019 (Inactive combinations)**: An inactive doctor, service, offering, or visit mode MUST
  NOT be bookable.
- **FR-020 (Immediate schedule effect)**: A valid schedule, closure, leave, or exception change
  MUST affect subsequent availability queries without direct database manipulation.
- **FR-021 (Integrity enforcement)**: Overlapping rules and invalid exceptions MUST be rejected
  by the trusted service boundary and, where feasible, by persisted constraints.
- **FR-022 (Definition of done)**: No roadmap task may be marked complete until its acceptance
  criteria, required targeted checks, integration verification, and evidence satisfy the existing
  repository workflow.

### Key Entities *(include if feature involves data)*

- **Clinic**: The active operational location and owner of directory and scheduling data,
  including its timezone.
- **Doctor Profile**: Patient-visible professional information for a doctor, optionally linked to
  a login account.
- **Specialty**: A clinic-managed classification associated with doctors and patient discovery.
- **Service**: A clinic-managed type of care that can be active and published.
- **Doctor Service**: A specific doctor offering a service through one or more configured visit
  modes, durations, buffers, and prices.
- **Availability Rule**: A recurring working interval from which availability can be derived.
- **Clinic Closure**: A clinic-wide period that suppresses otherwise valid availability.
- **Doctor Availability Exception**: Doctor-specific leave or an exceptional availability change
  for a bounded period.
- **Derived Slot**: A non-authoritative candidate time calculated from current rules and
  exceptions for a published active offering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All twelve IDs, `F04-T01` through `F04-T12`, retain their original identity, order,
  unchecked status, and roadmap meaning after adoption.
- **SC-002**: Adoption changes zero implementation files, claims zero tasks or batches, and leaves
  Phase 04 in `NOT_STARTED` state with `F04-T01` unclaimed.
- **SC-003**: In phase verification, 100% of patient-visible doctor, service, price, mode, and
  availability values in Phase 04 scope originate from administrator-managed records.
- **SC-004**: In the administrator-to-patient journey, every valid schedule change tested is
  reflected by the next availability query without direct database changes.
- **SC-005**: All tested inactive or unpublished doctor-service-mode combinations produce zero
  bookable choices.
- **SC-006**: All defined overlap and invalid-exception cases are rejected, and clinic timezone
  cases produce the expected local availability without ambiguous persisted time.
- **SC-007**: Zero reachable Phase 04 settings cards remain actionless and zero patient-visible
  Phase 04 records come from mock data at phase closure.
- **SC-008**: Every Phase 04 exit criterion has recorded evidence before readiness for Phase 05 is
  declared.
- **SC-009**: No appointment creation, payment, encounter, future-phase workflow, or unrelated
  module is implemented as part of Phase 04 adoption or delivery.

## Assumptions

- The current constitution and the existing modular-monolith architecture remain in force.
- Phase 02 and Phase 03 remain completed historical prerequisites; their implementation is reused.
- The Phase 03 booking eligibility response remains the gate before the Phase 04 patient
  doctor-selection experience.
- The roadmap order is preserved exactly. The source phase does not define per-task `Depends on`
  fields or a batch map; dependency validation and any batch claim therefore remain execution-time
  responsibilities under `plan/05-AGENT-WORKFLOW.md`, beginning with only `F04-T01` eligible now.
- Appointment creation, reservation holds, queue behavior, payment, and encounter workflows belong
  to later phases and remain outside this specification.
