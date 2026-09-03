# Feature Specification: Adopt Phase 06

**Feature Branch**: `codex/phase-06-encounter-clinical-workspace`

**Created**: 2026-09-03
**Status**: Phase 06 is `READY_FOR_REVIEW`; `F06-T01` through `F06-T12` are complete. The authoritative live state remains
[`plan/STATUS.md`](../../plan/STATUS.md).

**Input**: Adopt the authoritative Phase 06 roadmap without changing its scope, IDs, ordering,
dependencies, acceptance criteria, status, or implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conduct a Controlled Encounter (Priority: P1)

An authorized clinician starts and completes an encounter from a valid appointment while retaining
controlled clinical records.

**Independent Test**: A valid appointment starts one encounter only; a clinician completes it
with a controlled note and the patient never receives a private clinician note.

**Acceptance Scenarios**:

1. **Given** a valid appointment, **When** an authorized clinician starts an encounter, **Then**
   a separate encounter is created without creating a duplicate.
2. **Given** an in-progress encounter, **When** the clinician completes it, **Then** the patient
   can receive only the permitted summary of that visit.
3. **Given** a private clinician note, **When** the patient views clinical history, **Then** that
   note is not visible.

---

### User Story 2 - Maintain Reviewed Clinical Records (Priority: P1)

An authorized clinician reviews self-reported intake and reconciles diagnoses, allergies,
conditions, and medication statements without promoting self-report automatically.

**Independent Test**: A self-reported intake value remains distinct until clinical review, and
the reconciled record retains the required controlled-history behavior.

**Acceptance Scenarios**:

1. **Given** self-reported intake, **When** it has not been clinically reviewed, **Then** it is
   not treated as a clinical fact.
2. **Given** a clinical note revision conflict, **When** a clinician attempts to save an outdated
   revision, **Then** the controlled revision boundary prevents an uncontrolled overwrite.

---

### User Story 3 - View Only Authorized Clinical Information (Priority: P2)

Authorized staff use the dashboard patient workspace and patients use permitted summary, history,
and health-record views; all sensitive access is controlled and auditable.

**Independent Test**: Resource-level authorization distinguishes permitted from denied reads,
writes, and exports, and permitted dashboard/app views have no in-scope placeholders.

**Acceptance Scenarios**:

1. **Given** a clinician or administrator, **When** accessing a patient resource, **Then** role
   alone does not substitute for the required resource permission.
2. **Given** an authorized patient, **When** viewing the permitted clinical surfaces, **Then**
   only the authorized timeline, history, and summary are shown.
3. **Given** a sensitive clinical read, write, or export, **When** it occurs, **Then** it is
   auditable without placing medical content or PII in operational logs.

### Edge Cases

- Encounter creation is idempotent with respect to an already-started valid appointment: an
  appointment and encounter remain separate and a duplicate encounter is not created.
- A stale clinical-note write respects the roadmap-required optimistic-concurrency boundary.
- A patient is denied private notes and every other non-permitted clinical datum.
- A self-reported intake value is not automatically converted into a reviewed clinical fact.
- Doctor or administrator role alone does not grant the resource permission required for read,
  write, or export.

## Requirements *(mandatory)*

### Roadmap Adoption Boundary

The following twelve roadmap tasks are adopted one-to-one, with no renaming, splitting, merging,
reordering, claiming, or completion-state change:

- **`F06-T01`** — policy حقوقی retention، patient visibility، sign و amendment
- **`F06-T02`** — قرارداد تبدیل intake self-reported به clinical record reviewed
- **`F06-T03`** — migration encounter/clinical core/audit
- **`F06-T04`** — start/complete encounter از appointment معتبر
- **`F06-T05`** — note revision با optimistic concurrency و private clinician note
- **`F06-T06`** — diagnosis/allergy/condition/medication reconciliation
- **`F06-T07`** — timeline، history و summary مجاز بیمار
- **`F06-T08`** — resource-level authorization و audit read/write/export
- **`F06-T09`** — اتصال workspace dashboard و حذف placeholderهای scope
- **`F06-T10`** — اتصال summary/history/health-record در app
- **`F06-T11`** — OpenAPI/client، security، revision و browser E2E
- **`F06-T12`** — evidence

Phase 05 is `DONE (CLOSED)`. Adoption does not claim a batch or `F06-T01`, change
`plan/STATUS.md`, change a roadmap checkbox, or alter implementation; subsequent execution is
recorded only in the authoritative roadmap and task evidence.

### Functional Requirements

- **FR-001**: `plan/` MUST remain authoritative for Phase 06 scope, task IDs, ordering,
  dependencies, acceptance criteria, status, and evidence.
- **FR-002**: The workset MUST remain exactly `F06-T01` through `F06-T12`; adoption MUST NOT
  split, merge, rename, reorder, claim, or complete it.
- **FR-003**: Adoption MUST NOT activate Phase 06, modify implementation, migrations, generated
  clients, Phase 05 files, or unrelated files.
- **FR-004 (`F06-T01`)**: The approved policy at
  [`plan/contracts/clinical-record-policy-v1.md`](../../plan/contracts/clinical-record-policy-v1.md)
  establishes retention, patient visibility, signing, amendment, revision-based editing,
  publication, configurable authorization, and legal-compliance boundaries before dependent work.
- **FR-005 (`F06-T02`)**: The conversion boundary at
  [`plan/contracts/clinical-intake-review-v1.md`](../../plan/contracts/clinical-intake-review-v1.md)
  MUST preserve immutable self-reported intake provenance, require an explicit authorized human
  review for a separate clinical output, and never treat self-report as a clinical fact
  automatically.
- **FR-006 (`F06-T03`)**: Persistence MUST cover the roadmap encounter, clinical-core, and audit
  migration boundary.
- **FR-007 (`F06-T04`)**: An encounter MUST start and complete from a valid appointment while
  remaining separate from the appointment and without duplicate encounter creation.
- **FR-008 (`F06-T05`)**: Clinical notes MUST support revision with optimistic concurrency and
  private clinician notes.
- **FR-009 (`F06-T06`)**: Diagnosis, allergy, condition, and medication reconciliation MUST be
  supported within the reviewed clinical-record boundary.
- **FR-010 (`F06-T07`)**: The timeline, history, and patient summary MUST expose only information
  permitted to that patient.
- **FR-011 (`F06-T08`)**: Sensitive clinical read, write, and export MUST use resource-level
  authorization and audit; role alone is insufficient, and operational logs MUST not contain
  medical content or PII.
- **FR-012 (`F06-T09`)**: The dashboard patient workspace MUST connect its overview, medical,
  history, appointments, assessments, traditional, and timeline scope, removing only in-scope
  placeholders.
- **FR-013 (`F06-T10`)**: The app MUST connect `/appointments/summary`, `/profile/history`, and
  `/profile/health-record` to permitted clinical information.
- **FR-014 (`F06-T11`)**: OpenAPI/client synchronization, security, revision, and browser E2E
  coverage MUST be completed for the implemented Phase 06 contract.
- **FR-015 (`F06-T12`)**: Evidence MUST be recorded only after the phase work and required
  verification pass.

### Key Entities

- **Encounter**: A visit record started and completed from a valid appointment, distinct from
  that appointment.
- **Clinical Note and Clinical Note Revision**: Controlled clinical documentation and its
  revision history; privacy and amendment detail remain owned by `F06-T01` and `F06-T05`.
- **Diagnosis**: A clinically reviewed diagnostic record.
- **Allergy Record**: A clinically reviewed allergy record.
- **Condition Record**: A clinically reviewed condition record.
- **Medication Statement**: A clinically reviewed medication record.
- **Patient Access Audit**: The auditable record of sensitive patient-resource reads, writes,
  and exports, without storing medical content or PII in operational logs.

## Success Criteria *(mandatory)*

- **SC-001**: An encounter is distinct from its appointment and no duplicate encounter is
  created.
- **SC-002**: Self-reported intake is not automatically converted into a clinical fact.
- **SC-003**: A patient cannot view a private clinician note or any non-permitted datum.
- **SC-004**: Doctor or administrator role alone does not replace resource permission.
- **SC-005**: Operational logs contain neither medical content nor PII.
- **SC-006**: A clinician completes an encounter and the patient sees the permitted summary of
  that same visit.

## Assumptions

- Phase 05 remains the completed predecessor and valid-appointment authority.
- The source declares list order but no individual `Depends on` fields or batch map; this adoption
  preserves that fact and invents no dependency graph.
- Exact fields, schemas, routes, and permission assignments remain for their owning roadmap tasks;
  `F06-T01` policy and `F06-T02` conversion boundary are frozen in their authoritative contracts.
