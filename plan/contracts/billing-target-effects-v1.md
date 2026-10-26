# Billing target effects v1 — FROZEN

Phase12/F12-PJ-P01; additive internal compatibility contract under ADR-0017 and owner-authorized patient journey implementation. Existing wallet-billing-v1 wire/financial rules unchanged.

Existing reserve() and settle() return an untyped domain ID string, which Billing assumes is an appointment hold/appointment. New digital targets must never accidentally attach their IDs to appointment relations. Replace these with explicit discriminated effects:

- Reservation: {kind:NONE} or {kind:APPOINTMENT_HOLD,holdId:UUID}.
- Settlement: {kind:NONE} or {kind:APPOINTMENT,appointmentId:UUID}.

Order returns NONE; its own order/payment/inventory effects remain transactionally domain-owned. Appointment returns the explicit hold/appointment effect. TOPUP has no target/effect. Billing maps only valid APPOINTMENT-purpose effects to holdId/appointmentId; mismatched purpose, missing/malformed IDs or unknown effects fail with existing BILLING_STATE_CONFLICT, rolling back the financial transaction. Do not spread target effects directly into Prisma or wire projections. New domain-owned digital purchase/entitlement associations will have their own FK/lifecycle under a subsequent approved contract, not overloaded appointment IDs or a second payment engine.

All prepare/lock/canSettle/settle/refund behavior, bank Verify amount/OrderId matching, wallet journals, compensation, refunds, idempotency and audit remain unchanged. No new provider capability/amount/default/permission/price or digital activation. Same existing API and Prisma schema; no new migration or generated artifacts expected.

Acceptance: focused effect validation tests and real PostgreSQL current wallet/order/appointment/free/gateway/refund/compensation/concurrency regressions in a dedicated task-owned disposable wallet_test database using synthetic provider. API/test typecheck and unchanged OpenAPI/client freshness. No live gateway or persistent database acceptance inferred.

PAY04 / ADR-0043 extension: optional preparePayment(tx,intent) reacquires stock only on an actual payment/verified settlement, returning false without partial acquisition. Optional cancel(tx,intent) closes an unpaid order/releases its stock and discount. Other targets are unaffected. Existing canSettle and typed settlement effects remain the final settlement gate; no HTTP shape changes.
