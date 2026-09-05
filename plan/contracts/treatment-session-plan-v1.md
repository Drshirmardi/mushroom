# Phase 07 Treatment Session Plan v1

> Task: `F07-T04`
>
> Status: owner-approved product and data boundary.

## Scope

`TreatmentSessionPlan` is an ordered clinical definition of an intended treatment session within a `TreatmentPlan`. It is not a scheduled occurrence, appointment, task execution, or encounter.

This contract authorizes a dedicated persisted `TreatmentSessionPlan` entity for `F07-T04`, despite its omission from the original Phase 07 model inventory and the earlier `F07-T02` persistence foundation. The F07-T04 migration must be additive and must not modify the F07-T02 migration.

## Approved model

Each session plan has only:

- `id`
- `treatmentPlanId`
- `position`
- `title`
- `goals`
- optional `instructions`
- optional `patientInstructions`
- `createdAt`
- `updatedAt`

`TreatmentPlan` has a one-to-many relationship to `TreatmentSessionPlan`. Position is unique within its treatment plan. The owning treatment plan remains restrict-deleted where the existing treatment-plan relation requires it.

## Explicit exclusions

F07-T04 does not introduce independent session lifecycle or completion state, `scheduledFor`, recurrence, reminders, attendance, appointment or encounter foreign keys, task-execution behavior, media/file/product models, modality-specific fields, revision infrastructure, or per-session exercise/diet/video join tables.

Existing dashboard per-session exercise/diet/video controls remain unchanged or truthfully limited. They do not authorize additional persistence models in F07-T04.

## Task ownership

F07-T04 owns treatment-plan and treatment medication/session/exercise/nutrition definition APIs, authorized patient-facing reads, tenant/patient/resource authorization, audit following existing clinical conventions, and runtime OpenAPI declarations. Checked-in generated-client synchronization remains owned by `F07-T10`.

F07-T05 exclusively owns TreatmentTask scheduling, `scheduledFor`, execution/completion state, idempotent completion, adherence recording, any later session-execution association, and reminder/scheduling semantics. F07-T06 owns derived real-event progress and timeline behavior.
