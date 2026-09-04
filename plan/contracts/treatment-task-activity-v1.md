# Treatment Task and Activity Contract v1

Status: `F07-T05` implementation baseline

This contract resolves only the API/domain boundary needed by the authoritative `F07-T05` task: task scheduling and idempotent medication/task recording. [`../phases/07-PRESCRIPTION-TREATMENT.md`](../phases/07-PRESCRIPTION-TREATMENT.md) remains authoritative for Phase 07 scope, ordering, and completion state.

## Scheduled occurrences

- A `TreatmentTask` is one scheduled occurrence under one active `TreatmentPlan`.
- This task supports only `MEDICATION` and `EXERCISE` kinds. `scheduledFor` is the persisted future-reminder source.
- An authorized clinical user may list, create, reschedule, or cancel a task for a patient in its granted clinic. A patient may read only their own non-cancelled tasks and may complete only their own scheduled task.
- Completion writes server-controlled `COMPLETED` state and `completedAt`; repeating completion returns the already-completed resource without a second state transition.
- A cancelled or completed task cannot be rescheduled or cancelled again. Scheduling is limited to an active plan.

## Medication adherence

- A patient records medication consumption through a `MedicationAdherenceLog` using a required `Idempotency-Key` header.
- The medication must belong to the patient’s active treatment plan. If an optional task is supplied, it must be that same plan’s `MEDICATION` task.
- Retrying the same key for the same owned medication/task returns the original record. Reusing the key for a different medication or task is rejected; the unique database key remains the concurrency authority.

## Explicit exclusions

- No `TreatmentSessionPlan` relationship, session scheduling, appointment, encounter, or attendance behavior is added.
- No recurrence engine, reminder dispatch, background worker, notification, or Phase 08 behavior is added.
- No `TreatmentProgressEvent` is created and no progress/timeline calculation is performed; these remain F07-T06.
- No app/dashboard connection, checked-in generated-client update, role-management infrastructure, new RBAC model, or medication/exercise schedule JSON interpretation is added. F07-T08, F07-T09, and F07-T10 retain their respective ownership.

## Authorization and audit

- The existing clinical capability plus clinic-resource grant is required for dashboard task operations.
- Existing patient self authorization confines reads and writes to the authenticated patient.
- Existing clinical audit conventions record schedule, cancellation, completion, adherence, and sensitive reads without recording treatment text in operational logs.
