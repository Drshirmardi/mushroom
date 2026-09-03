# Phase 07 Data Model

This preserves the nine roadmap concepts. `F07-T02` owns persistence. Exact fields, keys, constraints, retention, and transaction shapes remain with the appropriate authoritative task; this adoption introduces none.

## Prescription, Prescription Item, and Prescription Revision

The prescription and its itemized content, with a separate revision history. `F07-T01` owns the draft/issue/amend lifecycle and safety rules. An issued prescription is immutable; correction is an append-only successor revision rather than an overwrite. Issuance and safety acknowledgement are attached to the exact revision; exact fields and persistence remain owned by `F07-T02`.

## Treatment Plan

The patient treatment program. `F07-T04` owns the treatment medication, session, exercise, and nutrition plan interface.

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
