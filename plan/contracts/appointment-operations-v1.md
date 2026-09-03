# Appointment Operations Contract v1

This is the `F05-T01` contract. It freezes the Phase 05 appointment state machine,
cancellation/reschedule policy, and price snapshot semantics. Roadmap scope, order, and status
remain authoritative in `plan/phases/05-APPOINTMENT-OPERATIONS.md`.

## Scope and boundaries

- The MVP has one active clinic. Every appointment, hold, status history, queue entry, and
  operational activity record retains explicit `clinicId`; clients never provide it.
- Phase 03 eligibility and Phase 04 patient-visible doctor-service availability are prerequisites.
  Create/reschedule MUST re-evaluate them in the trusted use case immediately before capacity is
  committed.
- A Phase 04 derived slot has no stored slot ID. Create/reschedule identifies a candidate with
  `doctorServiceId` and offset-aware `startsAt`; the server recomputes validity against current
  offering, schedule, and policy.
- Online payment and wallet debit are out of scope. Confirmation never requires payment.
- This contract does not create an encounter, prescription, online waiting-room access, payment,
  refund, discount, wallet balance, or financial ledger.

## Canonical scalar types

| Concept | v1 representation |
|---|---|
| Identifier | UUID v4 string |
| Timestamp | RFC 3339/ISO 8601 UTC string ending in `Z`; persisted timezone-aware UTC |
| Calendar date / wall time | Derived only for presentation in the clinic IANA timezone |
| Visit mode | Existing `IN_PERSON \| ONLINE` doctor-service value |
| Currency | `IRR` only |
| Money | Integer rial amount; never float |
| Interval | Half-open `[startsAt, endsAt)` |

Unknown request fields are rejected. Required text is trimmed and blank text is rejected. List APIs
added by their owning tasks use the repository pagination contract.

## Appointment state machine

```text
PENDING → CONFIRMED → CHECKED_IN → QUEUED → IN_PROGRESS → COMPLETED
PENDING → CANCELLED
CONFIRMED → CANCELLED | NO_SHOW
CHECKED_IN → QUEUED | IN_PROGRESS | CANCELLED | NO_SHOW
QUEUED → IN_PROGRESS | CANCELLED | NO_SHOW
```

`CANCELLED`, `NO_SHOW`, and `COMPLETED` are terminal. A successful patient or administrator create
begins at `PENDING`; administrator confirmation moves it to `CONFIRMED`. `CHECKED_IN` records
arrival, `QUEUED` records explicit queue inclusion, `IN_PROGRESS` records visit start, and
`COMPLETED` records visit end.

| Action | Actor | From | To | Required condition |
|---|---|---|---|---|
| Create | Patient or authorized administrator | — | `PENDING` | Valid candidate, same-clinic patient, eligibility passes, capacity commits. |
| Confirm | Authorized administrator | `PENDING` | `CONFIRMED` | Appointment is still future. |
| Cancel | Patient or authorized administrator | `PENDING`, `CONFIRMED`, `CHECKED_IN`, `QUEUED` | `CANCELLED` | Cancellation policy passes. |
| Reschedule | Patient or authorized administrator | `PENDING`, `CONFIRMED` | `PENDING` | Reschedule policy and all new-candidate checks pass. |
| Check in | Authorized administrator | `CONFIRMED` | `CHECKED_IN` | Scheduled clinic-local date is today. |
| Add to queue | Authorized administrator | `CHECKED_IN` | `QUEUED` | Scheduled clinic-local date is today. |
| Call next / start | Authorized administrator | `CHECKED_IN`, `QUEUED` | `IN_PROGRESS` | Doctor has no other in-progress appointment. |
| Complete | Authorized administrator | `IN_PROGRESS` | `COMPLETED` | Appointment is doctor's current in-progress visit. |
| Mark no-show | Authorized administrator | `CONFIRMED`, `CHECKED_IN`, `QUEUED` | `NO_SHOW` | Scheduled start has passed. |

`call-next` selects the earliest queued appointment for a doctor by queue ordering. If no entry is
queued it returns `QUEUE_EMPTY`. It performs the same guarded transition as start. A repeat of a
completed command returns the current resource when the requested result already exists; it MUST
NOT create another history, queue entry, or incompatible state.

Every accepted transition writes one immutable `AppointmentStatusHistory` record containing prior
state, next state, action, actor, and timestamp. Rejections write no state history.

## Cancellation and reschedule policy

- Patient cancellation/reschedule is permitted only from `PENDING` or `CONFIRMED` while `startsAt`
  remains in the future.
- An authorized administrator may cancel from `PENDING`, `CONFIRMED`, `CHECKED_IN`, or `QUEUED`.
  `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`, and `CANCELLED` cannot be cancelled or rescheduled.
- Administrator cancellation after `startsAt` requires a non-blank reason. Patient cancellation
  accepts an optional reason. The reason is written to status history and is not exposed to other
  patients.
- Reschedule is not an in-place date edit. It preserves appointment identity, writes a
  `RESCHEDULED` status-history action with old/new schedule and price snapshots, atomically
  releases the old active interval, and returns the current state to `PENDING` for confirmation.
- Rescheduling repeats the full create boundary: same-clinic patient/doctor-service lookup,
  current active/published offering and Phase 04 availability, Phase 03 eligibility, and
  conflict-safe capacity. A policy change after selection returns `BOOKING_INELIGIBLE`.
- v1 defines no fixed cancellation window. The allowed state and future-start boundary above is
  the complete policy; a later product policy needs a versioned contract change.

## Price snapshot

At successful create and reschedule, the server copies the selected current doctor-service price
into an immutable appointment price snapshot:

```ts
type AppointmentPriceSnapshotV1 = {
  priceAmount: number; // integer rial amount
  currency: "IRR";
  capturedAt: string; // UTC timestamp
  doctorServiceId: string;
};
```

- Capture occurs in the same transaction that commits the active appointment interval; the client
  never supplies it.
- A later doctor-service price change never rewrites an existing appointment snapshot.
- Reschedule captures the current offered price for the newly validated candidate. The previous
  snapshot remains in immutable `RESCHEDULED` history metadata.
- Snapshot creation never creates a payment, charge, refund, discount, wallet entry, or ledger.

## Holds, capacity, and idempotency boundary

- `AppointmentHold` is a short-lived internal capacity aid owned by Phase 05 persistence/create
  tasks. It is not a patient-visible confirmed appointment or permanent source of truth.
- A hold is clinic, doctor, doctor-service, and interval scoped. An expired, released, or invalid
  hold cannot block a candidate.
- The final active-doctor-overlap guarantee is the `F05-T02` database exclusion constraint; a hold
  or application pre-check alone is insufficient.
- Create requires `Idempotency-Key`, scoped to authenticated actor and create operation. A retry of
  the same normalized request returns the original appointment. A different request with that key
  returns `IDEMPOTENCY_KEY_REUSED` and creates nothing.

## Error and authorization contract

All appointment routes use the global `/v1` prefix, authenticated request context, stable English
codes, translated messages, and no internal exception details. Exact routes and permission names
are owned by `F05-T03`–`F05-T07`.

| Condition | Stable code |
|---|---|
| Eligibility no longer permits create/reschedule | `BOOKING_INELIGIBLE` |
| Candidate is no longer valid or active | `APPOINTMENT_SLOT_UNAVAILABLE` |
| Active doctor interval conflicts | `APPOINTMENT_SLOT_CONFLICT` |
| Same idempotency key has a different request | `IDEMPOTENCY_KEY_REUSED` |
| Transition is invalid from current state | `APPOINTMENT_INVALID_TRANSITION` |
| Actor cannot access appointment resource | `APPOINTMENT_FORBIDDEN` |
| Cancellation/reschedule policy disallows action | `APPOINTMENT_CHANGE_NOT_ALLOWED` |
| Call-next has no queued appointment | `QUEUE_EMPTY` |
| Doctor already has an in-progress appointment | `APPOINTMENT_DOCTOR_BUSY` |

Patients may access only their own clinic-scoped appointments through allowed patient transitions.
Administrators require the fixed permissions added by their owning tasks; `ADMIN` never bypasses
clinic/resource scoping. Create, cancel, reschedule, confirm, check-in, queue, start, complete,
and no-show are audit events; logs redact sensitive patient data and credentials.

## Task handoff and acceptance

- `F05-T02` owns persistence, indexes, exclusion constraint, and migration smoke for the named
  Phase 05 models.
- `F05-T03` owns create, eligibility recheck, hold/idempotency implementation, and capacity use
  case.
- `F05-T04`–`F05-T07` own patient/admin/queue/history/activity APIs, authorization, and audit
  implementation.
- `F05-T08`–`F05-T11` own frontend integration, generated-client synchronization, and mock
  removal; they must consume this contract rather than recreate lifecycle rules.
- `F05-T12` proves concurrency, idempotency, authorization, and state machine behavior;
  `F05-T13` proves cross-app flow/query-load baseline; `F05-T14` owns final evidence.

This task is accepted when states, terminal states, legal action/actor/source/target rules,
repeat-operation semantics, cancellation/reschedule limits, and price-snapshot timing are
unambiguous; Phase 03 and 04 boundaries remain intact; all Phase 05 operations/exit criteria are
represented; and no migration, API, client, frontend, mock removal, or Phase 06+ capability is
created.
