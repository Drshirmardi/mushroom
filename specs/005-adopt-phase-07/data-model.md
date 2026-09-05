# Phase 07 Data Model

This preserves the roadmap concepts plus the owner-approved, narrowly scoped `TreatmentSessionPlan` definition for `F07-T04`. `F07-T02` owns the shared persistence foundation; `F07-T04` owns only the approved additive session-definition migration. Exact fields, keys, constraints, retention, and transaction shapes remain with the appropriate authoritative task.

## Prescription, Prescription Item, and Prescription Revision

The prescription and its itemized content, with a separate revision history. `F07-T01` owns the draft/issue/amend lifecycle. An issued prescription is immutable; correction is an append-only successor revision rather than an overwrite. Issuance is attached to the exact revision. The existing `PrescriptionSafetyAcknowledgement` foundation remains inactive in Phase 07 under the owner-approved F07-T09 clarification; no rule evaluator, acknowledgement API, or blocking classification is added.

## Treatment Plan

The patient treatment program. `F07-T04` owns the treatment medication, session, exercise, and nutrition plan interface.

## Treatment Session Plan

An ordered clinical definition of one intended treatment session. `F07-T04` persists only `id`, `treatmentPlanId`, `position`, `title`, `goals`, optional clinician and patient instructions, and timestamps; `(treatmentPlanId, position)` is unique and the owning plan is deletion-restricted. It has no independent lifecycle or execution state and no appointment, encounter, task, schedule, recurrence, reminder, attendance, media, modality, or per-session exercise/diet/video relation. `F07-T05`–`F07-T06` retain scheduling, execution, and derived-status decisions.

## Treatment Medication

A medication-oriented part of a treatment plan. Its scheduling and patient-recording behavior is owned by `F07-T05` where applicable.

## Exercise Plan and Nutrition Plan

Exercise- and nutrition-oriented parts of a treatment plan, both owned by `F07-T04`.

## Treatment Task

An F07-T05 one-off `MEDICATION` or `EXERCISE` occurrence under an active treatment plan. It has persisted `scheduledFor`, `SCHEDULED`/`COMPLETED`/`CANCELLED` state, server-controlled `completedAt`, and timestamps. `scheduledFor` is the future reminder source; it has no session-plan, appointment, encounter, recurrence, reminder-dispatch, or progress-event relation. Patient completion is repeat-safe and records one state transition.

## Medication Adherence Log

A persisted medication/adherence activity record, owned by `F07-T05`. It remains available after refresh and from another device. Its unique `idempotencyKey` preserves the first record for the same medication/optional matching medication-task retry and rejects reuse for a different source.

## Treatment Progress Event

An append-only real patient-action event used by `F07-T06` for timeline display. `TASK_COMPLETED` and `MEDICATION_ADHERENCE_RECORDED` are written only with the accepted F07-T05 action; retries write no duplicate event. Plan percentage is derived from persisted non-cancelled task state, not from a fixed UI value or a manual field.

```text
Prescription
├── Prescription Item
└── Prescription Revision

Treatment Plan
├── Treatment Medication
├── Exercise Plan
├── Nutrition Plan
└── Treatment Task

Medication Adherence Log ──> Treatment Medication
Treatment Progress Event ──> Treatment Plan / Treatment Task
```
