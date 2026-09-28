# Validation Quickstart: Phase 11 Reporting & Access Control

This is a pre-implementation validation guide; it does not authorize implementation, migrations, or task claims.

## Preconditions

- Use a disposable PostgreSQL database seeded only through approved project fixtures.
- Use four active identities representing ADMIN, PATIENT, DOCTOR, and STAFF; separately prepare a disabled user and a revoked session.
- Use a clinic with UTC timestamps that cross an `Asia/Tehran` date boundary, verified payments, completed refunds, appointments, assessment submissions, and treatment tasks.
- Before CRM validation, grant the test ADMIN an existing `ClinicalClinicAccess` row for the intended active clinic only. This is a test/release precondition for consuming an existing authorization relationship, not permission for `F11-T10` to add a membership or invitation feature.

## Required validation scenarios

1. Recompute every entry in [KPI inventory](contracts/kpi-inventory.md) from the named source rows; match formula, scope, timezone, money unit, zero/partial/stale rule, and owner.
2. Ask for every report with an empty range, a partial/stale source situation, an invalid/oversized date range, and paginated list boundaries; confirm the contract’s status representation without mock fallback.
3. Compare operational revenue with `sum(Payment.commerceAmountToman at verifiedAt) - sum(Refund.amountToman at completedAt where COMPLETED)` for the scoped range. Confirm no callback, attempt, unpaid order, or Sadad production/settlement assertion appears.
4. Run allow/deny authorization matrix cases in [authorization matrix](contracts/authorization-matrix.md), including cross-clinic, cross-tenant, unlinked-doctor, disabled-user, and revoked-session requests.
5. Run browser E2E: ADMIN may open approved dashboard/report/audit paths; PATIENT, DOCTOR, and STAFF cannot obtain dashboard/admin data through URL, API, UI, or an unapproved export.
6. Capture `EXPLAIN (ANALYZE, BUFFERS)` for new/changed report queries. If there is no proven bottleneck, record direct-query acceptance. If there is one, pause for the F11-T05 owner’s documented index/aggregate decision.
7. Run the CRM contract in [customer-crm-api.md](contracts/customer-crm-api.md) on a disposable database: prove `POTENTIAL`/`ONE_TIME`/`RETURNING`/`VIP` boundaries at 0/1/2/4/5 verified payments, payment-minus-completed-refund math, filtered summary, name search, each supported sort, stable pagination, empty result, and invalid parameter `BAD_REQUEST` behavior.
8. Prove CRM clinic isolation using an active second clinic with no actor `ClinicalClinicAccess`; a crafted foreign `clinicId`, customer identifier, and filter must disclose no row, aggregate, audit metadata, or medical data. Repeat for PATIENT/DOCTOR/STAFF, disabled ADMIN, revoked ADMIN session, and expired ADMIN session.
9. Confirm CRM creates only non-sensitive existing-audit-policy events for disclosed patients, then run API/dashboard typechecks, OpenAPI/client freshness, the normal dashboard Vitest command, and the independent Phase 11 Playwright command. The Vitest run must not collect the Playwright suite.
