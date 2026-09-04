# Phase 07 Data Model

This preserves the roadmap concepts plus the owner-approved, narrowly scoped `TreatmentSessionPlan` definition for `F07-T04`. `F07-T02` owns the shared persistence foundation; `F07-T04` owns only the approved additive session-definition migration. Exact fields, keys, constraints, retention, and transaction shapes remain with the appropriate authoritative task.

## Prescription, Prescription Item, and Prescription Revision

The prescription and its itemized content, with a separate revision history. `F07-T01` owns the draft/issue/amend lifecycle and safety rules. An issued prescription is immutable; correction is an append-only successor revision rather than an overwrite. Issuance and safety acknowledgement are attached to the exact revision; exact fields and persistence remain owned by `F07-T02`.

## Treatment Plan

The patient treatment program. `F07-T04` owns the treatment medication, session, exercise, and nutrition plan interface.

## Treatment Session Plan

An ordered clinical definition of one intended treatment session. `F07-T04` persists only `id`, `treatmentPlanId`, `position`, `title`, `goals`, optional clinician and patient instructions, and timestamps; `(treatmentPlanId, position)` is unique and the owning plan is deletion-restricted. It has no independent lifecycle or execution state and no appointment, encounter, task, schedule, recurrence, reminder, attendance, media, modality, or per-session exercise/diet/video relation. `F07-T05`–`F07-T06` retain scheduling, execution, and derived-status decisions.

## Treatment Medication

A medication-oriented part of a treatment plan. Its scheduling and patient-recording behavior is owned by `F07-T05` where applicable.

## Exercise Plan and Nutrition Plan

Exercise- and nutrition-oriented parts of a treatment plan, both owned by `F07-T04`.

## Treatment Task

A scheduled treatment activity. Its idempotent completion recording is owned by `F07-T05`; its future reminder relationship is limited to the roadmap statement that the schedule is the future reminder source.

## Medication Adherence Log

A persisted medication/adherence activity record, owned by `F07-T05`. It remains available after refresh and from another device.

## Treatment Progress Event

A real treatment event used by `F07-T06` for progress calculation and timeline display; it is not a fixed UI value.

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
