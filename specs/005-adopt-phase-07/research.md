# Phase 07 Planning Research

## Decision: Preserve the Phase 07 roadmap verbatim

**Rationale**: The authoritative phase defines twelve stable IDs, models, UI scope, and exit rules. `F07-T01` records the approved issuance-policy baseline; `plan/STATUS.md` is the live authority for all execution state.

**Alternatives considered**: Regeneration, decomposition, reordering, pre-claiming, or treating this adoption as Phase 07 progress are rejected.

## Decision: Preserve prescription immutability and revision-only correction

**Rationale**: The Phase 07 exit rules expressly require an issued prescription to be immutable and corrected through revision. `F07-T01` owns lifecycle and safety rules; `F07-T11` owns the corresponding verification gate.

**Alternatives considered**: Editing an issued prescription in place or treating amendment as an overwrite is rejected.

## Decision: Freeze approved issuer and warning policy in `F07-T01`

**Rationale**: The approved baseline requires explicit `PRESCRIPTION_ISSUE` and tenant/resource authorization rather than dashboard access or role alone. `DOCTOR` is the default current issuer; `ADMIN` and `STAFF` receive no implicit issuance authority. Warnings are acknowledged advisories for the exact issued revision unless an approved `NON_OVERRIDABLE` rule blocks issuance. Enforcement stays with `F07-T09`.

**Alternatives considered**: Role-only access, implicit dashboard authority, reusable acknowledgement after a revision changes, automatic AI issuance, and invented non-overridable clinical rules are rejected.

## Decision: Preserve persistent, idempotent treatment activity

**Rationale**: The roadmap requires schedule, medication/adherence, and task-completion information to persist through refresh and across devices. `F07-T05` uses the existing F07-T02 `TreatmentTask` and `MedicationAdherenceLog` foundation: each task is a one-off `MEDICATION` or `EXERCISE` occurrence and its `scheduledFor` is the future reminder source. Completion is a single server-controlled state transition and a matching adherence retry returns the first keyed record. This keeps the approved F07-T04 session definition separate from execution/scheduling.

**Alternatives considered**: Fixed UI progress, local-only treatment logs, non-idempotent retry behavior, treating `TreatmentSessionPlan` as a scheduled occurrence, or interpreting arbitrary medication/exercise schedule JSON as a recurrence engine are rejected.

## Decision: Use an owner-approved dedicated treatment-session definition

**Rationale**: The owner resolved the F07-T04 ambiguity by approving an ordered persisted `TreatmentSessionPlan` under a treatment plan. It is a clinical definition, not a scheduled appointment, task execution, encounter, or completion record. The minimal model and its restricted delete/unique-position constraints support the existing treatment-plan interface without absorbing F07-T05 scheduling/adherence or F07-T06 derived-progress scope.

**Alternatives considered**: Reusing `TreatmentTask`, treating a session as a scheduled appointment, or storing an unbounded session structure in `TreatmentPlan` would either mix F07-T05 execution concerns into F07-T04 or weaken the required ordered definition.

## Decision: Preserve real-event progress and the dashboard-to-app journey

**Rationale**: The roadmap requires progress calculated from real events and a dashboard issue → app display → patient log → dashboard review flow. `F07-T06` owns real progress; `F07-T07` and `F07-T08` own their distinct UI connections; `F07-T11` owns browser verification.

**Alternatives considered**: A fixed percentage, mock-only user interface, or a disconnected dashboard/app flow is rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no batch map or per-task dependencies. Future execution must claim and assign non-overlapping ownership under `plan/05-AGENT-WORKFLOW.md`.
