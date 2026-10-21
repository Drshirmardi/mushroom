# ADR-0032 — Fulfil educational programs through the existing shared billing engine

- Status: ACCEPTED technical integration under continuous owner authorization and explicit program no-ordinary-refund decision,2026-10-17.
- Task: Phase12/F12-PJ-PG03; ready-program-purchase-access-v1.

## Context
Reviewed program definitions and configurable exact tariffs/terms are accepted. They do not prove payment or grant a patient curriculum. The existing wallet/BillingIntent registry already handles free settlement, wallet debit, verified gateway settlement, expiry and late/duplicate compensation.

## Decision
Add PROGRAM domain target plus one retained purchase and one proved owned grant. Reuse generic PatientConsentRecord for exact commercial acceptance and the same funding/callback/reconciliation engine. Add explicit target reservation FK/purpose and no-refund boundaries, protect final access with deferred actual financial proof. Retain exact purchased version/DB access period, separate later sale retirement from current clinical safety. Home adds own metadata/action without another journey state machine.

## Alternatives and Consequences
A separate program payment engine would duplicate correctness and provider acceptance work; reusing a treatment plan as a sale would mix clinical delivery and commerce. Both rejected. READY_EDUCATION needs no invented medical intake/age/assessment gate and creates no clinical fact. CUSTOM_PROFESSIONAL_PLAN stays unchargeable until a separately accepted assigned TreatmentPlan delivery path exists. No actual content/legal policy is supplied by this infrastructure.

## Validation
Real PostgreSQL free/wallet/server-Verify grant flow and financial/identity/source/expiry/retry/concurrency/compensation/audit denial, unchanged prior targets and old data, official generated API/client/consumer compatibility and isolated task review/commit. Revisit when explicitly implementing the already-requested custom professional delivery, not by silently enabling an unsupported target.
