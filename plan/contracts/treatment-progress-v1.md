# Treatment Progress Contract v1

Status: `F07-T06` implementation baseline

This contract resolves only the real progress-calculation and timeline boundary needed by the authoritative `F07-T06` task. [`../phases/07-PRESCRIPTION-TREATMENT.md`](../phases/07-PRESCRIPTION-TREATMENT.md) remains authoritative for Phase 07 scope, ordering, and completion state.

## Real event sources

- `TreatmentProgressEvent` is append-only evidence of a real patient action. F07-T06 records only `TASK_COMPLETED` and `MEDICATION_ADHERENCE_RECORDED` events, in the same transaction as the accepted F07-T05 action.
- A repeated task-completion request or matching medication-adherence retry returns its existing F07-T05 result and creates no additional progress event.
- Events expose an event type, occurred time, and permitted relationship identifiers only. Their metadata carries no medical text.

## Progress calculation and timeline

- A plan's percentage is derived at read time from real persisted task state: `completed non-cancelled tasks / all non-cancelled tasks × 100`, rounded to the nearest whole percentage. A plan with no non-cancelled tasks reports `0` percent.
- A task state remains the source of completion truth. Medication-adherence events enrich the timeline but do not silently complete a task or alter this denominator.
- The timeline is newest-first, cursor-paginated, and includes only persisted F07-T06 progress events for the requested plan.

## Authorization and audit

- An authorized clinical user needs the existing clinical view capability and clinic-resource grant to read a patient's plan progress/timeline.
- A patient can read only their own active or completed plan progress/timeline through the existing patient-self permission.
- Existing clinical audit conventions record sensitive progress/timeline reads. Event persistence and the audit write are transactional with the original activity action where applicable.

## Explicit exclusions

- No `TreatmentSessionPlan` lifecycle, session association, appointment/encounter relation, scheduling, recurrence, reminder dispatch, attendance, or completion inference is added.
- No manual progress editing, weighting, targets, modality-specific rule, backfill, background job, notification, dashboard/app connection, checked-in generated-client update, or Phase 08 behavior is added.
- F07-T07/F07-T08 retain UI connection; F07-T09 retains the dedicated permission/audit/contraindication contract and F07-T10 retains generated-client synchronization.
