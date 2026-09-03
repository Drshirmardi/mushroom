# Phase 07 Planning Research

## Decision: Preserve the Phase 07 roadmap verbatim

**Rationale**: The authoritative phase defines twelve stable IDs, models, UI scope, and exit rules. `plan/STATUS.md` is the live authority for execution state.

**Alternatives considered**: Regeneration, decomposition, reordering, pre-claiming, or treating this adoption as Phase 07 progress are rejected.

## Decision: Preserve prescription immutability and revision-only correction

**Rationale**: The Phase 07 exit rules expressly require an issued prescription to be immutable and corrected through revision. `F07-T01` owns lifecycle and safety rules; `F07-T11` owns the corresponding verification gate.

**Alternatives considered**: Editing an issued prescription in place or treating amendment as an overwrite is rejected.

## Decision: Preserve persistent, idempotent treatment activity

**Rationale**: The roadmap requires schedule, medication/adherence, and task-completion information to persist through refresh and across devices. `F07-T05` owns the idempotent recording boundary.

**Alternatives considered**: Fixed UI progress, local-only treatment logs, or non-idempotent retry behavior is rejected.

## Decision: Preserve real-event progress and the dashboard-to-app journey

**Rationale**: The roadmap requires progress calculated from real events and a dashboard issue → app display → patient log → dashboard review flow. `F07-T06` owns real progress; `F07-T07` and `F07-T08` own their distinct UI connections; `F07-T11` owns browser verification.

**Alternatives considered**: A fixed percentage, mock-only user interface, or a disconnected dashboard/app flow is rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no batch map or per-task dependencies. Future execution must claim and assign non-overlapping ownership under `plan/05-AGENT-WORKFLOW.md`.
