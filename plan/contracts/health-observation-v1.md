# Health Observation Contract v1

Owner: `F08-T01`
Status: `APPROVED FOR F08-T02 IMPLEMENTATION`
Scope: metric, unit, range, and read/query contract only.

## Purpose and boundaries

`HealthObservation` is one patient-recorded health measurement at an explicit UTC observation time. It is not an assessment submission, diagnosis, treatment task, reminder, notification, or dashboard-derived aggregate.

This contract does not add persistence, write endpoints, tracker UI wiring, a new schedule, reminders, notifications, or content behavior. Those remain with their named Phase 08 tasks.

## Metric catalogue

| Metric key | Meaning | Stored unit | Accepted range | Source UI |
|---|---|---|---|---|
| `PAIN` | Patient-reported pain intensity | `SCORE_10` | integer `1..10` | `/trackers/pain` |
| `MOOD` | Patient-reported mood | `SCORE_5` | integer `1..5` | `/trackers/mood` |
| `SLEEP_HOURS` | Patient-reported sleep duration | `HOURS` | decimal `0..12` | `/trackers/mood` |
| `STRESS` | Patient-reported stress intensity | `SCORE_10` | integer `0..10` | `/trackers/mood` |
| `ENERGY` | Patient-reported energy intensity | `SCORE_10` | integer `0..10` | `/trackers/mood` |
| `WEIGHT` | Patient-reported body weight | `KILOGRAMS` | decimal `2..500` | existing dashboard health scope and onboarding validation baseline |

Metric/unit pairing is fixed. Callers cannot provide a different unit for a metric, and the API must reject a value outside its approved range. Score bands are self-reported tracking values, not a clinical diagnosis or severity determination.

## Observation record

The accepted read model has: stable observation ID, patient ID, metric key, fixed unit, numeric value, `observedAt` UTC timestamp, and created timestamp. The patient ID is not returned in an own-patient view when it is already implied by the authenticated principal. No patient name, clinical narrative, diagnosis, or reminder state belongs to this record.

## Query contract

Two read operations are reserved for `F08-T02` implementation:

1. **Patient observations**: authenticated patient reads only their own observations, optionally filtered by one metric and a UTC inclusive time window.
2. **Dashboard patient observations**: an authorized dashboard actor reads observations for one selected patient within their authorized clinic/resource scope, with the same optional metric and UTC inclusive time-window filters.

Both operations require cursor pagination, deterministic ascending ordering by `observedAt` and observation ID, and a bounded page size. Missing/invalid metric, invalid UTC window, unauthorized patient/resource, or a page size outside the accepted limit must return the repository's stable API error shape. An empty result is a valid successful result.

The query response contains an `items` collection of observation read models and the normal pagination continuation metadata. It exposes no fabricated trend, score interpretation, notification state, or local fallback.

## Authorization and audit boundary

The patient self endpoint is restricted to the authenticated patient's own observations. Dashboard access requires the existing operational permission plus clinic/resource authorization; administrative role alone does not bypass resource scope. Sensitive medical-data reads and writes must use the existing audit convention when implemented by `F08-T02`.

## Non-goals and handoff

- `F08-T02` owns persistence, tracker writes, API implementation, dashboard health views, and focused verification.
- `F08-T03` owns assessment-derived `MezajResult`.
- `F08-T04`–`F08-T07` own notification, content, outbox/worker, and reminder behavior.
- `F08-T08`–`F08-T11` own frontend connection, resilience/browser validation, mock removal, and Milestone C review.

If a new metric, clinical interpretation, unit, or range is requested, it requires an explicit contract revision before implementation.
