# Feature Specification: Adopt Phase 07 — Prescription & Treatment

**Feature Branch**: `codex/phase-07-prescription-treatment`
**Created**: 2026-09-03
**Status**: Execution tracking only — Phase 07 is `IN_PROGRESS`; `F07-T01` through `F07-T05` are complete.
**Input**: Adopt the authoritative Phase 07 Prescription & Treatment roadmap into Spec Kit without activating implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Issue and amend a prescription (Priority: P1)

An authorized dashboard user prepares a prescription, issues it, and makes any correction as a revision rather than changing the issued prescription.

**Why this priority**: Issued-prescription immutability is an explicit Phase 07 exit rule and the source of the patient treatment journey.

**Independent Test**: The authorized dashboard flow preserves the draft/issue/amend lifecycle and never changes issued historical content in place.

**Acceptance Scenarios**:

1. **Given** a draft prescription, **When** it is issued, **Then** the issued prescription remains immutable.
2. **Given** an issued prescription needing correction, **When** it is amended, **Then** the correction is represented as a revision.

---

### User Story 2 - Follow treatment and record completion (Priority: P2)

A patient views treatment information in the app and records medication adherence or scheduled treatment completion; the record remains available after refresh and from another device.

**Why this priority**: Persistent adherence and task scheduling are required Phase 07 treatment outcomes and support later reminders.

**Independent Test**: A patient records one permitted treatment action, refreshes or uses another device, and sees the same persisted record.

**Acceptance Scenarios**:

1. **Given** a scheduled medication or exercise task, **When** the patient records the allowed completion or consumption, **Then** the record persists and duplicate submission is handled idempotently.
2. **Given** a medication or exercise schedule, **When** future reminder capability consumes it, **Then** the schedule is its source.

---

### User Story 3 - Review real patient progress (Priority: P3)

The dashboard and app use actual prescription, treatment, adherence, and progress information so a dashboard user can review the patient journey.

**Why this priority**: The roadmap requires real progress calculation and a complete dashboard-to-app-to-dashboard journey, not fixed UI values or local-only state.

**Independent Test**: The Phase 07 browser journey passes from dashboard issue to app display to patient log to dashboard review using real persisted information.

**Acceptance Scenarios**:

1. **Given** persisted treatment progress events, **When** progress is displayed, **Then** the percentage is calculated from those real events rather than a fixed UI value.
2. **Given** a patient treatment record, **When** dashboard and app views are connected, **Then** the Phase 07 scope no longer relies on mock or local-only state.

### Edge Cases

- An issued prescription is amended rather than overwritten, and a changed revision requires new safety acknowledgement before issuance.
- Repeated recording of one medication/adherence or task action is idempotent.
- A patient refreshes or changes device after recording treatment activity.
- A contraindication warning, authorization boundary, or audit obligation applies to an attempted treatment action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (`F07-T01`)**: The prescription lifecycle MUST support editable drafts, exact-revision issuance, and amendment while keeping an issued prescription immutable and representing a correction as an append-only successor revision. Issuance requires `PRESCRIPTION_ISSUE` plus tenant/resource authorization; warnings require exact-revision acknowledgement unless an approved `NON_OVERRIDABLE` rule blocks issuance.
- **FR-002 (`F07-T02`)**: Prescription, treatment, task, and adherence concepts MUST have the persistence foundation owned by the roadmap migration task.
- **FR-003 (`F07-T03`)**: Dashboard prescription creation, draft, issue, and revision behavior MUST be available through the roadmap-owned prescription interface.
- **FR-004 (`F07-T04`)**: Treatment medication, session, exercise, and nutrition plans MUST be available through the roadmap-owned treatment-plan interface. The owner-approved session boundary is a dedicated ordered `TreatmentSessionPlan` definition (`treatmentPlanId`, `position`, `title`, `goals`, optional clinician/patient instructions, and timestamps), not a scheduled occurrence, task execution, appointment, or encounter.
- **FR-005 (`F07-T05`)**: One-off `MEDICATION` and `EXERCISE` task occurrences MUST persist their future `scheduledFor` reminder source. An authenticated patient MUST be able to repeat-safely complete only their own scheduled task; medication adherence MUST require a scoped `Idempotency-Key`, preserve the first result for a matching retry, and reject a key reused for a different medication or task. No session-plan scheduling or real-progress calculation is part of this requirement.
- **FR-006 (`F07-T06`)**: Progress and timeline information MUST be calculated from real progress events, not a fixed UI value.
- **FR-007 (`F07-T07`)**: The dashboard prescription builder and patient workspace MUST use the in-scope prescription and treatment information.
- **FR-008 (`F07-T08`)**: The app treatment area MUST use the in-scope treatment, medication, session, exercise, and progress information.
- **FR-009 (`F07-T09`)**: The Phase 07 permission, audit, and contraindication-warning contract MUST govern the authorized treatment experience.
- **FR-010 (`F07-T10`)**: In-scope frontend connections MUST use the generated contract and remove Phase 07 mock/local state.
- **FR-011 (`F07-T11`)**: The end-to-end journey MUST preserve prescription immutability, amendment behavior, ownership, and required browser verification.
- **FR-012 (`F07-T12`)**: Evidence MUST be recorded only after the roadmap work and required verification pass.

### Key Entities *(include if feature involves data)*

- **Prescription, Prescription Item, and Prescription Revision**: The prescribed treatment record, its items, and revision history.
- **Treatment Plan**: The patient treatment program and its treatment medication, exercise, nutrition, and task-related elements.
- **Treatment Session Plan**: An ordered clinical definition of an intended treatment session under a treatment plan, without scheduling or execution state.
- **Treatment Medication**: A medication-oriented element of a treatment plan.
- **Exercise Plan**: An exercise-oriented element of a treatment plan.
- **Nutrition Plan**: A nutrition-oriented element of a treatment plan.
- **Treatment Task**: A scheduled treatment activity.
- **Medication Adherence Log**: A persisted record of medication consumption or adherence.
- **Treatment Progress Event**: A real treatment event used for progress calculation and timeline display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every issued prescription represented by the Phase 07 journey remains immutable; every correction in that journey is represented as a revision.
- **SC-002**: Each medication/adherence or treatment-task record in the Phase 07 journey remains visible after refresh and from another device.
- **SC-003**: Every displayed Phase 07 progress percentage in the validated journey derives from real progress events, not a fixed UI value.
- **SC-004**: The dashboard issue → app display → patient log → dashboard review journey passes with required authorization, ownership, audit, and contraindication-warning boundaries.

## Assumptions

- Phase 06 is `DONE (CLOSED)` and supplies the completed clinical-workspace baseline.
- The authoritative source lists `F07-T01` through `F07-T12` in order but declares no individual `Depends on` fields or batch map; this adoption does not create one.
- Exact schema and route details remain owned by their named authoritative tasks. The approved `F07-T01` baseline defines draft/issue/amend safety, default `DOCTOR` issuance authority, advisory acknowledgement, and the legal-confirmation boundary; enforcement remains owned by `F07-T09`.
- `F07-T01` through `F07-T05` are complete. Phase 07 remains `IN_PROGRESS`; `F07-T06`–`F07-T12` remain unclaimed and unchecked. The permanent owner-approved F07-T04 boundary is recorded in [`plan/contracts/treatment-session-plan-v1.md`](../../plan/contracts/treatment-session-plan-v1.md).
