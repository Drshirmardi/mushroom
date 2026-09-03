# Phase 06 Data Model

This preserves the seven roadmap concepts. Exact fields, relationships, constraints, timestamps,
retention rules, visibility categories, revision semantics, audit schema, and API forms remain
owned by `F06-T01` through `F06-T08`.

## Encounter

The visit record started and completed from a valid appointment in `F06-T04`. It remains distinct
from the Phase 05 appointment and cannot be duplicated for an already-started appointment.

## Clinical Note and Clinical Note Revision

Controlled documentation and its revision history, with optimistic concurrency and private
clinician-note boundaries owned by `F06-T05`. Signing and amendment policy remain owned by
`F06-T01`.

## Diagnosis

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, but is a separate clinical resource.

## Allergy Record

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, but is a separate clinical resource.

## Condition Record

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, but is a separate clinical resource.

## Medication Statement

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, but is a separate clinical resource.

## Patient Access Audit

The audit concept for sensitive patient-resource reads, writes, and exports, owned by `F06-T03`
and `F06-T08`. It must support accountability without operational-log disclosure of medical
content or PII.

```text
Appointment (Phase 05 authority)
└── Encounter
    ├── Clinical Note
    │   └── Clinical Note Revision
    ├── Diagnosis
    ├── Allergy Record
    ├── Condition Record
    └── Medication Statement

Patient Access Audit ──> sensitive patient-resource read/write/export
```
