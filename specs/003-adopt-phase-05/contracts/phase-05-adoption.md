# Phase 05 Contract Adoption

This maps existing Phase 05 capabilities but does not freeze endpoint paths, request/response
schemas, exact states, queue algorithm, hold semantics, field names, or client types.

## Contract Freeze Boundary (`F05-T01`)

The authoritative task must define appointment state machine, cancellation/reschedule policy,
price snapshot semantics, and transition/reason semantics before dependent implementation.

## Booking Integrity Boundary

| Task | Required boundary |
|---|---|
| `F05-T02` | Migration, index, and exclusion constraint protect active doctor overlap. |
| `F05-T03` | Create re-checks eligibility and accepts idempotent retries. |
| `F05-T04` | Patient list/detail/cancel/reschedule respects ownership. |
| `F05-T05` | Administrator management respects authorization. |
| `F05-T12` | Tests prove concurrency, idempotency, authorization, lifecycle. |

`BOOKING_INELIGIBLE` remains the named rejection after a policy change. Phase 03 eligibility and
Phase 04 derived availability remain input authorities.

## Operations and Frontend Boundary

- `F05-T06`: check-in/queue/call-next/start/complete/no-show.
- `F05-T07`: history/reason/activity.
- `F05-T08`: every `/appointments/**` route, without mandatory MVP payment/wallet confirmation.
- `F05-T09`–`F05-T10`: dashboard operations and sourced Home V1 only.
- `F05-T11`: generated-client synchronization and in-scope appointment/operations mock removal.

Repeated lifecycle/queue operations must remain consistent. Frontends consume generated contracts,
and future-source widgets remain hidden.
