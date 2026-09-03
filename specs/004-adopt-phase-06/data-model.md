# Phase 06 Data Model

This preserves the seven roadmap concepts. `F06-T03` persists their additive core, tenant/resource
foreign keys, revision and audit foundations, and PostgreSQL integrity constraints. Clinical values,
reconciliation workflows, authorization enforcement, patient visibility, and API forms remain with
their owning later tasks.

## Encounter

The visit record started and completed from a valid appointment in `F06-T04`. It remains distinct
from the Phase 05 appointment and cannot be duplicated for an already-started appointment. The
persisted `appointmentId` is unique and clinic-scoped; `IN_PROGRESS`, `COMPLETED`, and `VOIDED`
states have database-enforced timestamp coherence.

## Clinical Note and Clinical Note Revision

Controlled documentation and its revision history, with optimistic concurrency and private
clinician-note boundaries owned by `F06-T05`. The persisted root tracks current/effective,
signed, and published revision numbers; every revision has an ordered immutable predecessor link,
private-by-default content, separate signing and patient-publication fields, and signed-content
integrity constraints. Signing and amendment policy remain owned by `F06-T01`.

## Diagnosis

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, including restrictive FKs for the intake and source revision, but is
a separate clinical resource.

## Allergy Record

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, including restrictive FKs for the intake and source revision, but is
a separate clinical resource.

## Condition Record

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, including restrictive FKs for the intake and source revision, but is
a separate clinical resource.

## Medication Statement

A reviewed clinical record reconciled under `F06-T06`; it is not an automatic conversion of
self-reported intake. Its source may retain an immutable intake-revision reference under
`clinical-intake-review-v1`, including restrictive FKs for the intake and source revision, but is
a separate clinical resource.

## Patient Access Audit

The audit concept for sensitive patient-resource reads, writes, and exports, owned by `F06-T03`
and `F06-T08`. It captures only tenant/patient/actor/session/resource/revision/request/correlation
identifiers, controlled action, IP, timestamp, and object-shaped safe metadata; it never stores
clinical content or PII in operational metadata.

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
