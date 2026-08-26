# Feature Specification: Adopt Phase 03

**Feature Branch**: `codex/phase-03-assessment-eligibility`

**Created**: 2026-08-26

**Status**: Adopted from authoritative roadmap

**Input**: User description: "Review and adopt existing Phase 03 without regenerating it; preserve task IDs and completed work, with F03-T01 through F03-T08 completed and F03-T09 through F03-T13 remaining."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administer Assessments and Review Results (Priority: P1)

An administrator can manage the main assessment lifecycle, review patient submissions, and see
truthful assessment information in both the assessment workspace and patient workspace.

**Why this priority**: The patient journey depends on a published main assessment and an
observable result that staff can trust.

**Independent Test**: An administrator creates or resumes a draft, publishes it, opens the
assessment list and results, filters submissions, and sees the same immutable result in a
patient's workspace without mock values.

**Acceptance Scenarios**:

1. **Given** a valid draft assessment, **When** an administrator publishes it, **Then** it becomes
   available as the published version without mutating an earlier published snapshot.
2. **Given** patient submissions exist, **When** an administrator opens results or a patient
   workspace, **Then** the displayed submissions are scoped to the clinic and match stored result
   snapshots.
3. **Given** assessment data is loading, unavailable, empty, or forbidden, **When** the relevant
   view opens, **Then** it shows that truthful state and never substitutes fabricated values.

---

### User Story 2 - Complete Assessment Before Booking (Priority: P1)

A patient can view the clinic's published assessment, start or resume it, save answers, submit it
once, view the immutable result, and follow the correct next action when attempting to book.

**Why this priority**: Completing the configured prerequisite is the milestone's primary patient
outcome.

**Independent Test**: A patient with a complete profile completes the published assessment and
becomes eligible when policy requires it; with the requirement disabled, the same patient can
proceed without completing an assessment.

**Acceptance Scenarios**:

1. **Given** a published assessment, **When** a patient starts, saves, leaves, and returns, **Then**
   the same in-progress attempt and saved answers resume.
2. **Given** a valid in-progress attempt, **When** the patient submits it repeatedly with the same
   completion request, **Then** exactly one immutable completion and result are returned.
3. **Given** booking is blocked, **When** the patient enters booking, **Then** the stable blocker
   reason and next action direct the patient to onboarding or the required assessment.
4. **Given** the assessment prerequisite is disabled, **When** a patient with a complete profile
   enters booking, **Then** assessment score and completion do not block booking.

---

### User Story 3 - Observe Phase Completion Truthfully (Priority: P2)

An administrator can see real assessment completion and pending activity on the dashboard, and
the team can verify Phase 03 exit criteria without mock assessment behavior remaining in scope.

**Why this priority**: Operational visibility and trustworthy milestone evidence close the phase
without changing its domain contract.

**Independent Test**: Real assessment activity appears when records exist, no fabricated count or
activity appears when they do not, and the required and optional booking journeys both pass.

**Acceptance Scenarios**:

1. **Given** assessment submissions exist, **When** the dashboard opens, **Then** completion,
   pending, and recent activity values are derived from real records.
2. **Given** no assessment data source is available, **When** the dashboard opens, **Then** the
   related widget or activity is hidden or marked unavailable rather than showing fake zeroes.
3. **Given** all remaining work is implemented, **When** Phase 03 verification runs, **Then** the
   required and optional assessment booking journeys pass and Milestone A evidence is recorded.

### Edge Cases

- An incomplete patient profile blocks booking before assessment data is considered.
- A required policy without a valid published main assessment fails closed.
- Expired completion and latest-version requirements return their distinct stable blocker reasons.
- Publishing a new version does not block earlier completers unless policy explicitly requires the
  latest published version.
- A completed or invalidated submission cannot be edited; a reused completion key with different
  answers is rejected.
- A patient cannot read another patient's submission, and an administrator cannot read results
  outside the active clinic.
- Assessment score, including zero or an absent score, never determines booking eligibility.
- Empty, loading, forbidden, missing, and failed responses remain distinguishable in user-facing
  views.

## Requirements *(mandatory)*

### Roadmap Adoption Boundary

The following completed tasks are adopted as historical work and excluded from implementation:

- **`F03-T01`**: Assessment lifecycle, question types, scoring, and booking policy contract.
- **`F03-T02`**: Assessment version, submission, result, and policy persistence.
- **`F03-T03`**: Administrator draft, preview, duplicate, publish, and archive behavior.
- **`F03-T04`**: Transactional main-assessment selection and booking requirement toggle.
- **`F03-T05`**: Patient list, start, save, resume, submit, and result behavior.
- **`F03-T06`**: Deterministic scoring, result snapshot, risk, and review flags.
- **`F03-T07`**: Booking eligibility decision with stable blocker reason and next action.
- **`F03-T08`**: Clinic-scoped administrator submission results and patient-workspace integration.

The remaining workset is exactly `F03-T09`, `F03-T10`, `F03-T11`, `F03-T12`, and `F03-T13`.
Existing implementation within this workset MUST be reused and verified rather than
reimplemented. This adoption document does not change roadmap checkboxes or completion history.

### Functional Requirements

- **FR-001 (Roadmap adoption)**: The authoritative Phase 03 roadmap, phase boundary, contract,
  task IDs, and recorded history MUST remain unchanged by this specification.
- **FR-002 (Completed baseline)**: `F03-T01` through `F03-T08` MUST be treated as completed,
  reused work and MUST NOT be reimplemented.
- **FR-003 (Remaining workset)**: Adoption and implementation work MUST be limited to `F03-T09`
  through `F03-T13`; future phases MUST remain unexpanded.
- **FR-004 (`F03-T08` preservation)**: As the `F03-T08`-specific application of FR-002, existing
  clinic-scoped administrator submission results and patient-workspace integration MUST be
  preserved and MUST NOT be reimplemented.
- **FR-005 (`F03-T09`)**: The dashboard assessment list, builder, lifecycle actions, and results
  MUST use authoritative assessment and submission data, with truthful loading, empty, forbidden,
  unavailable, and error states.
- **FR-006 (`F03-T10`)**: The patient assessment journey MUST use published assessment content and
  persisted attempts for list, start, save, resume, submit, and result behavior. Booking entry MUST
  honor the stable blocker reason and next-action contract.
- **FR-007 (`F03-T11`)**: Dashboard assessment widgets and activity MUST reflect real assessment
  records; unsupported widgets MUST be hidden rather than populated with mock or fabricated zero
  values.
- **FR-008 (`F03-T12`)**: Phase verification MUST cover published-version immutability,
  completion idempotency, patient and administrator authorization boundaries, policy combinations,
  and both required and optional booking journeys.
- **FR-009 (`F03-T13`)**: Mock assessment behavior within Phase 03 scope MUST be removed, and
  evidence for every Phase 03 exit criterion and Milestone A MUST be recorded before phase closure.
- **FR-010 (Eligibility order)**: Booking eligibility MUST evaluate incomplete profile first,
  disabled requirement second, then valid completion, expiry, and latest-version policy in the
  contract-defined order.
- **FR-011 (Server enforcement)**: Authorization, clinic and patient ownership, lifecycle,
  immutability, idempotency, and policy invariants MUST be enforced at the trusted boundary; visual
  guards alone are insufficient.
- **FR-012 (Snapshot integrity)**: Published assessment content and completed answer/result data
  MUST remain immutable snapshots of the exact version completed by the patient.
- **FR-013 (Scoped verification)**: Each active task MUST use targeted checks for affected areas.
  Broader application suites and browser journeys MUST run only where Phase 03 exit criteria or
  cross-module risk require them.
- **FR-014 (Definition of done)**: A remaining task MUST NOT be marked complete until its explicit
  acceptance criteria and required verification pass; discovered gaps MUST be recorded without
  silently expanding scope.

### Key Entities *(include if feature involves data)*

- **Assessment Version**: A clinic assessment's numbered content snapshot with draft, published,
  or retired lifecycle state; published content is immutable.
- **Patient Assessment Submission**: One patient's attempt against one exact assessment version,
  including saved answers and an immutable completion result.
- **Booking Eligibility Policy**: The clinic rule that enables or disables the assessment
  prerequisite and optionally applies validity or latest-version constraints.
- **Eligibility Decision**: The booking outcome containing an eligibility state, stable reason,
  and next action; assessment score is not an input.
- **Assessment Activity**: A truthful operational projection of assessment completion and pending
  work derived from actual submissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All five remaining IDs, `F03-T09` through `F03-T13`, retain their original identity
  and have explicit acceptance evidence before Phase 03 is closed.
- **SC-002**: In verification, 100% of repeated identical completion requests produce one stored
  completion, while every differing reuse is rejected.
- **SC-003**: All defined booking policy combinations return the contract-defined eligibility
  outcome, and changing assessment score changes zero eligibility outcomes.
- **SC-004**: A patient can start, leave, resume, submit, and view a result in one continuous
  journey with no loss of saved answers.
- **SC-005**: An administrator can create and publish an assessment and inspect the same stored
  result in assessment and patient views without any conflicting values.
- **SC-006**: The required-assessment and optional-assessment booking journeys both pass their
  phase-level browser verification.
- **SC-007**: Zero user-visible assessment values in Phase 03 scope come from mock records or
  fabricated empty-state counts at phase closure.
- **SC-008**: No completed task from `F03-T01` through `F03-T08`, no future-phase requirement, and
  no unrelated module is reimplemented or expanded during adoption.

## Assumptions

- The existing 12-phase roadmap and the Phase 03 assessment-booking contract remain authoritative.
- The adoption baseline treats `F03-T01` through `F03-T08` as completed and `F03-T09` through
  `F03-T13` as the remaining workset.
- Existing implementation for any remaining task is evidence to inspect and reuse, not permission
  to rebuild it or to mark it complete without its acceptance checks.
- Existing identity, access, audit, persistence, and generated-contract mechanisms remain in use.
- Only Phase 03 is active; no requirement from Phase 04 or later is part of this specification.
