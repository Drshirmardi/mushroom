# Phase 08 Planning Research

## Decision: Preserve the Phase 08 roadmap verbatim

**Rationale**: `plan/phases/08-FOLLOWUP-CONTENT.md` defines eleven stable task IDs, the model and UI scope, phase prerequisites, and exit criteria. `plan/STATUS.md` is the live authority for execution state.

**Alternatives considered**: Regenerating, decomposing, renaming, reordering, pre-claiming, or treating this adoption as Phase 08 progress are rejected.

## Decision: Keep health-observation contract details with F08-T01

**Rationale**: The roadmap explicitly assigns metric, unit, range, and query contract definition to `F08-T01`. No field set, allowed metric catalogue, range policy, or route is frozen by this preparation.

**Alternatives considered**: Defining health fields, units, normal ranges, validation, or API shapes in adoption artifacts is rejected.

## Decision: Preserve assessment-derived mezaj and existing predecessor boundaries

**Rationale**: `F08-T03` is limited to mezaj result from versioned assessment. Phase 05 is the phase prerequisite, and Phase 07 is the stated treatment-reminder predecessor. Existing assessment, appointment, and treatment scheduling ownership remains unchanged.

**Alternatives considered**: A standalone mezaj engine, duplicated appointment scheduling, or a new treatment schedule source is rejected.

## Decision: Bootstrap asynchronous delivery only for a real reminder

**Rationale**: The roadmap limits `F08-T06` to an ADR and outbox/worker bootstrap only when a real reminder/job exists, and assigns idempotent appointment/treatment reminders to `F08-T07`. Durable, retryable side effects and idempotency are required project rules, but implementation choices remain future-task decisions.

**Alternatives considered**: Installing a worker or queue speculatively, selecting a delivery channel, or implementing a reminder before `F08-T07` is rejected.

## Decision: Preserve published-only content and media-policy boundaries

**Rationale**: `F08-T05` owns content publication lifecycle and media policy, while the phase exit criteria restrict patient-visible content to the published state. This preparation records neither media storage design nor publication state transitions beyond that source rule.

**Alternatives considered**: Exposing draft content, choosing a media provider, or defining unapproved lifecycle states is rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no per-task dependency or batch map. Shared persistence, delivery infrastructure, generated clients, and UI connections require future coordinator-owned write-set and verification decisions under `plan/05-AGENT-WORKFLOW.md`.

**Alternatives considered**: Marking tasks parallel, assigning owners, or pre-claiming `F08-T01` is rejected.
