# Phase 03 Data Model

Phase 03 uses the existing persisted model. No schema change or migration is planned.

## Assessment Version

Represents one numbered, clinic-scoped snapshot of an assessment.

- Identity: `id`; logical uniqueness by clinic, assessment key, locale, and version number
- Content: title, canonical structure snapshot, content hash
- Lifecycle: `DRAFT -> PUBLISHED -> RETIRED`
- Validation: version number is positive; structure identifiers are unique; one published version
  exists per logical key
- Integrity: only drafts are editable; published and retired content is immutable
- Relationships: belongs to a clinic; has patient submissions; may be required by clinic policy

## Patient Assessment Submission

Represents one patient's attempt against one exact assessment version.

- Identity: `id`; attempt number is unique per patient and version
- Content: answer snapshot, score, result snapshot, completion timestamps, idempotency evidence
- Lifecycle: `IN_PROGRESS -> COMPLETE`; `IN_PROGRESS|COMPLETE -> INVALIDATED`
- Validation: only in-progress answers are editable; complete results cannot mutate; repeated
  identical completion is replayed and conflicting key reuse is rejected
- Relationships: belongs to one patient and one assessment version

## Booking Eligibility Policy

Represents the single assessment prerequisite policy for a clinic.

- States: `NOT_REQUIRED` or `REQUIRED`
- Required state: points to a published main assessment version in the same clinic
- Optional constraints: validity days and latest-published-version requirement
- Integrity: disabling the requirement preserves historical submissions and clears active
  requirement constraints

## Eligibility Decision

An existing derived response; it is not persisted.

- Fields: eligibility boolean, stable reason, optional next action
- Evaluation order: incomplete profile, disabled requirement, missing valid completion, expired
  completion, latest-version mismatch, eligible
- Integrity: score and risk band never influence booking eligibility

## Assessment Activity

A frontend projection derived from existing submission rows and totals; it is not a new entity.

- Supported values: submission completion/pending totals and recent submission activity
- Empty behavior: hide unsupported widgets or show an explicit unavailable state
- Constraint: never fabricate records or zero values when no authoritative source exists
