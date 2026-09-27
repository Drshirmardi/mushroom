# Validation Quickstart: Phase 11 Reporting & Access Control

This is a pre-implementation validation guide; it does not authorize implementation, migrations, or task claims.

## Preconditions

- Use a disposable PostgreSQL database seeded only through approved project fixtures.
- Use four active identities representing ADMIN, PATIENT, DOCTOR, and STAFF; separately prepare a disabled user and a revoked session.
- Use a clinic with UTC timestamps that cross an `Asia/Tehran` date boundary, verified payments, completed refunds, appointments, assessment submissions, and treatment tasks.

## Required validation scenarios

1. Recompute every entry in [KPI inventory](contracts/kpi-inventory.md) from the named source rows; match formula, scope, timezone, money unit, zero/partial/stale rule, and owner.
2. Ask for every report with an empty range, a partial/stale source situation, an invalid/oversized date range, and paginated list boundaries; confirm the contract’s status representation without mock fallback.
3. Compare operational revenue with `sum(Payment.commerceAmountToman at verifiedAt) - sum(Refund.amountToman at completedAt where COMPLETED)` for the scoped range. Confirm no callback, attempt, unpaid order, or Sadad production/settlement assertion appears.
4. Run allow/deny authorization matrix cases in [authorization matrix](contracts/authorization-matrix.md), including cross-clinic, cross-tenant, unlinked-doctor, disabled-user, and revoked-session requests.
5. Run browser E2E: ADMIN may open approved dashboard/report/audit paths; PATIENT, DOCTOR, and STAFF cannot obtain dashboard/admin data through URL, API, UI, or an unapproved export.
6. Capture `EXPLAIN (ANALYZE, BUFFERS)` for new/changed report queries. If there is no proven bottleneck, record direct-query acceptance. If there is one, pause for the F11-T05 owner’s documented index/aggregate decision.
