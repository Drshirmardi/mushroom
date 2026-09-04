# Phase 07 Planning Research

## Decision: Preserve the Phase 07 roadmap verbatim

**Rationale**: The authoritative phase defines twelve stable IDs, models, UI scope, and exit rules. `F07-T01` records the approved issuance-policy baseline; `plan/STATUS.md` is the live authority for all execution state.

**Alternatives considered**: Regeneration, decomposition, reordering, pre-claiming, or treating this adoption as Phase 07 progress are rejected.

## Decision: Preserve prescription immutability and revision-only correction

**Rationale**: The Phase 07 exit rules expressly require an issued prescription to be immutable and corrected through revision. `F07-T01` owns lifecycle and safety rules; `F07-T11` owns the corresponding verification gate.

**Alternatives considered**: Editing an issued prescription in place or treating amendment as an overwrite is rejected.

## Decision: Freeze approved issuer and defer automated safety rules

**Rationale**: The approved baseline requires explicit `PRESCRIPTION_ISSUE` and tenant/resource authorization rather than dashboard access or role alone. `DOCTOR` is the default current issuer; `ADMIN` and `STAFF` receive no implicit issuance authority. The owner-approved F07-T09 clarification defers automated contraindication evaluation because no trusted rule source is available. Phase 07 consequently has no active warnings, acknowledgements, or `NON_OVERRIDABLE` blocking behavior; F07-T09 retains authorization, audit, and revision-integrity enforcement.

**Alternatives considered**: Role-only access, implicit dashboard authority, automatic AI issuance, invented clinical rules, an empty-but-active rule engine, and speculative rule-management infrastructure are rejected.

## Decision: Preserve persistent, idempotent treatment activity

**Rationale**: The roadmap requires schedule, medication/adherence, and task-completion information to persist through refresh and across devices. `F07-T05` uses the existing F07-T02 `TreatmentTask` and `MedicationAdherenceLog` foundation: each task is a one-off `MEDICATION` or `EXERCISE` occurrence and its `scheduledFor` is the future reminder source. Completion is a single server-controlled state transition and a matching adherence retry returns the first keyed record. This keeps the approved F07-T04 session definition separate from execution/scheduling.

**Alternatives considered**: Fixed UI progress, local-only treatment logs, non-idempotent retry behavior, treating `TreatmentSessionPlan` as a scheduled occurrence, or interpreting arbitrary medication/exercise schedule JSON as a recurrence engine are rejected.

## Decision: Use an owner-approved dedicated treatment-session definition

**Rationale**: The owner resolved the F07-T04 ambiguity by approving an ordered persisted `TreatmentSessionPlan` under a treatment plan. It is a clinical definition, not a scheduled appointment, task execution, encounter, or completion record. The minimal model and its restricted delete/unique-position constraints support the existing treatment-plan interface without absorbing F07-T05 scheduling/adherence or F07-T06 derived-progress scope.

**Alternatives considered**: Reusing `TreatmentTask`, treating a session as a scheduled appointment, or storing an unbounded session structure in `TreatmentPlan` would either mix F07-T05 execution concerns into F07-T04 or weaken the required ordered definition.

## Decision: Preserve real-event progress and the dashboard-to-app journey

**Rationale**: The roadmap requires progress calculated from real events and a dashboard issue → app display → patient log → dashboard review flow. `F07-T06` uses the existing append-only `TreatmentProgressEvent` table for accepted task completion and medication-adherence actions, while percentage is calculated at read time from completed/non-cancelled task state. `F07-T07` and `F07-T08` own their distinct UI connections; `F07-T11` owns browser verification.

**Alternatives considered**: A fixed percentage, mock-only user interface, or a disconnected dashboard/app flow is rejected.

## Decision: Connect the dashboard through the selected patient only

**Rationale**: The existing dashboard patient workspace already supplies the real `patientId` needed by the accepted F07 APIs. `F07-T07` uses that identity to open the prescription builder and to read a summary of prescriptions, treatment-plan definitions, and server-derived progress. A no-selection or API failure remains an explicit UI state rather than introducing a demo patient or fallback data. The temporary typed adapter avoids mutating checked-in generated client output, which remains exclusively owned by `F07-T10`.

**Alternatives considered**: A global implicit patient, dashboard-only fabricated treatment data, or generated-client changes before the F07-T10 task are rejected.

## Decision: Connect the app through patient self-service APIs

**Rationale**: The completed F07 patient APIs expose permitted treatment definitions, scheduled activity, persisted patient actions, and real derived progress. F07-T08 replaces the treatment area's demo stores with those own-resource reads and accepted action calls. No session is treated as a completed occurrence and no schedule is invented in the UI.

**Alternatives considered**: Local medication/task toggles, fabricated session/exercise/progress data, or a client-sync change before F07-T10 are rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no batch map or per-task dependencies. Future execution must claim and assign non-overlapping ownership under `plan/05-AGENT-WORKFLOW.md`.
