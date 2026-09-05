# Phase 08 Adoption Contract Boundary

`plan/phases/08-FOLLOWUP-CONTENT.md` is authoritative for Phase 08 scope, task IDs, ordering, prerequisites, exit criteria, and execution state. This document records no endpoint, route, schema, generated-client, queue, or implementation decision.

## Stable task ownership

| Authoritative task | Preserved boundary |
|---|---|
| `F08-T01` | Metric, unit, range, and health-observation query contract; approved baseline: [`plan/contracts/health-observation-v1.md`](../../../plan/contracts/health-observation-v1.md). |
| `F08-T02` | Tracker write/query and dashboard health views. |
| `F08-T03` | Mezaj result from versioned assessment. |
| `F08-T04` | Notification, preference, and in-app read state. |
| `F08-T05` | Content publication lifecycle and media policy. |
| `F08-T06` | ADR and outbox/worker bootstrap only for a real reminder. |
| `F08-T07` | Idempotent appointment and treatment reminders. |
| `F08-T08` | Patient-app tracker, notification, and article connection. |
| `F08-T09` | Dashboard health, notification, and content connection. |
| `F08-T10` | Restart/retry/idempotency, timezone, and browser E2E. |
| `F08-T11` | In-scope mock removal and Milestone C review. |

## Non-negotiable Phase 08 outcomes

- The patient app and dashboard see a shared observation.
- Notifications do not duplicate and respect preferences.
- Reminder work is independent of the HTTP request and retryable.
- Only published content is patient-visible.

The roadmap declares Phase 08 `NOT_STARTED`; no task is claimed, activated, checked, completed, or otherwise authorized by this adoption.
