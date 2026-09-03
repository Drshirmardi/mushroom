# Phase 06 Planning Research

## Decision: Preserve the Phase 06 roadmap verbatim

**Rationale**: The authoritative phase defines twelve stable IDs, models, UI scope, and exit
rules. The initial adoption preserved the then-unstarted Phase 06; live state is always read from
`plan/STATUS.md`.

**Alternatives considered**: Regeneration, decomposition, reordering, pre-claiming, or counting
this adoption as progress are rejected.

## Decision: Freeze the approved legal clinical-record policy in `F06-T01`

**Rationale**: The approved policy contract defines flexible dashboard editing over immutable
historical revisions, separate save/sign/publish operations, configurable permission plus
resource-level authorization, private-by-default clinical content, a 10-year configurable
engineering default, and explicit legal-compliance confirmations.

**Alternatives considered**: Direct overwrite of signed records, role-only clinical authority,
automatic patient publication, and representing engineering defaults as legal compliance are
rejected.

## Decision: Preserve reviewed clinical-record conversion boundary

**Rationale**: The roadmap and engineering standards expressly prohibit automatic conversion of
self-reported intake into clinical fact. `F06-T02` owns the contract and `F06-T06` owns the
reconciliation work.

**Alternatives considered**: Treating intake as a diagnosis, allergy, condition, or medication
statement without review is rejected.

## Decision: Freeze F06-T02 intake-review conversion contract

**Rationale**: `clinical-intake-review-v1` records immutable source provenance, an explicit
authorized human-review gate, separate clinical output, revision-based follow-on operations, and
default-private patient visibility. It defers schema to `F06-T03` and reconciliation to `F06-T06`.

**Alternatives considered**: Auto-conversion on intake complete/read/edit, mutable source links,
role-only conversion authority, and automatic clinical publication are rejected.

## Decision: Persist F06-T03 clinical core and audit foundation

**Rationale**: The additive Prisma migrations create a one-to-one appointment/encounter boundary,
tenant-scoped clinical roots, immutable note-revision links, separate sign/publish fields,
reviewed-record source provenance, and a PII-safe patient-access audit ledger. PostgreSQL checks
enforce lifecycle timestamps, signed-note integrity, publication shape, source-reference shape,
and audit metadata shape.

**Alternatives considered**: Reusing appointments as encounters, automatic intake promotion,
mutable signed note content, unscoped resource links, and operational audit metadata containing
clinical values are rejected.

## Decision: Keep appointment and encounter boundaries distinct

**Rationale**: Phase 05 is the completed appointment authority. Phase 06 starts/completes a
separate encounter from a valid appointment and cannot recreate appointment lifecycle scope.

**Alternatives considered**: Storing clinical encounter behavior as an appointment substitute is
rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no batch map or per-task dependencies. Future execution must claim
and assign non-overlapping ownership under `plan/05-AGENT-WORKFLOW.md`.
