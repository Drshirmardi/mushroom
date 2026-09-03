# Phase 06 Planning Research

## Decision: Preserve the Phase 06 roadmap verbatim

**Rationale**: The authoritative phase defines twelve stable IDs, models, UI scope, and exit
rules. `plan/STATUS.md` confirms Phase 05 is `DONE (CLOSED)`, Phase 06 is `NOT_STARTED`, and no
batch/task is active.

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

## Decision: Keep appointment and encounter boundaries distinct

**Rationale**: Phase 05 is the completed appointment authority. Phase 06 starts/completes a
separate encounter from a valid appointment and cannot recreate appointment lifecycle scope.

**Alternatives considered**: Storing clinical encounter behavior as an appointment substitute is
rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no batch map or per-task dependencies. Future execution must claim
and assign non-overlapping ownership under `plan/05-AGENT-WORKFLOW.md`.
