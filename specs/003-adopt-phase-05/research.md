# Phase 05 Planning Research

## Decision: Preserve the Phase 05 roadmap verbatim

**Rationale**: The authoritative phase defines fourteen stable IDs, UI scope, models, Home V1,
and exit criteria. `plan/STATUS.md` confirms `NOT_STARTED`, no active batch/task/owner/blocker.

**Alternatives considered**: Regeneration, decomposition, reordering, pre-claiming, or counting
this adoption as progress are rejected.

## Decision: Leave lifecycle policy and price-snapshot details to `F05-T01`

**Rationale**: The first roadmap task owns these decisions. Adoption does not choose state values,
transition conditions, cancellation limits, hold behavior, fields, routes, or schemas.

**Alternatives considered**: A speculative state chart or DTO catalog is rejected as premature
implementation design.

## Decision: Preserve trusted booking safeguards

**Rationale**: Existing standards require authoritative create/reschedule eligibility, idempotency,
and database-backed double-booking protection. These remain `F05-T02`, `F05-T03`, and `F05-T12`.

**Alternatives considered**: A frontend gate or application-only conflict check is rejected.

## Decision: Keep Dashboard Home V1 source-limited

**Rationale**: The delivery strategy assigns operations widgets to Phase 05 and defers later
financial/clinical/commerce sources. Unsupported widgets stay hidden.

**Alternatives considered**: Mock cards, invented zeroes, and later-phase scope are rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no batch map or per-task dependencies. Future execution must claim
and assign non-overlapping ownership under `plan/05-AGENT-WORKFLOW.md`.
