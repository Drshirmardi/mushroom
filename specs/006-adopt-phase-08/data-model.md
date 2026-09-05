# Phase 08 Data Model Boundary

`plan/phases/08-FOLLOWUP-CONTENT.md` is authoritative. This document records only the model names explicitly listed there and does not define fields, relations, indexes, migrations, lifecycle states, or API schemas.

## Roadmap-named concepts

| Concept | Authoritative boundary |
|---|---|
| `HealthObservation` | Health-tracking observation; `F08-T01` owns metric, unit, range, and query contract, while `F08-T02` owns tracker write/query and dashboard health views. |
| `MezajResult` | Result derived from a versioned assessment; `F08-T03` owns this boundary. |
| `Notification` | Patient follow-up notice; `F08-T04` owns notification, preference, and in-app read state. |
| `NotificationDelivery` | Delivery record for a notification; its exact semantics remain task-owned. |
| `NotificationPreference` | Patient notification choice; `F08-T04` owns its behavior. |
| `Article` | Educational content with patient visibility constrained to published state; `F08-T05` owns publication lifecycle. |
| `ArticleCategory` | Educational-content classification; `F08-T05` owns its lifecycle boundary. |
| `Banner` | Educational-content presentation concept; `F08-T05` owns its lifecycle boundary. |
| `OutboxEvent` | Durable event concept permitted only for a real reminder/job need; `F08-T06` owns any bootstrap decision and `F08-T07` owns reminder behavior. |

## Existing relationships and exclusions

```text
Versioned Assessment ──> Mezaj Result
Patient ──> Health Observation
Patient ──> Notification Preference
Notification ──> Notification Delivery
Article / Article Category / Banner ──> published patient content
Appointment or Treatment Schedule ──> reminder source ──> Outbox Event (only if F08-T06/F08-T07 establish it)
```

- Phase 05 appointment scheduling and Phase 07 treatment scheduling remain their existing owners.
- This adoption does not define a new reminder schedule, delivery channel, recurring-job model, media store, content state machine, or schema relation.
- Any migration, integrity rule, authorization rule, or event idempotency key must be decided and owned by its authoritative future task under the engineering standards.
