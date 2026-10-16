# Wallet/Billing v1 — backend contract

Status: frozen for F12-WAL-BE01; owner-requested backend scope, ADR-0017. Frontend integration is separate.

## Money, actors and proof

Amounts are integer IRR strings in billing and integer TOMAN strings only in explicitly named `amountToman` inputs. Conversion is exact ×10. Refund requests use `amountRial`, preserving even a one-rial appointment-price remainder; commerce refunds must be multiples of ten IRR to preserve their original integer TOMAN facts. A wallet is scoped to patient and clinic. Patient IDs and clinic context are server-derived; ADMIN needs explicit clinic access as well as wallet permission. Money is never accepted from a browser when settling an order or appointment.

ADMIN adjustments: CREDIT/DEBIT take positive `amountToman`; SET_BALANCE permits zero. All require `reason` (1–500 trimmed characters), `expectedVersion` and `Idempotency-Key`. Replay of the identical command returns the original outcome; another payload conflicts. A changed account version conflicts, rather than recalculating a target against a newer balance. Journal and audit are atomic. Patient projections exclude internal reasons/actor details. Debit cannot exceed available funds. Frozen wallets disallow spending; authorized financial repair and refunds remain auditable.

Journal: immutable transaction plus two signed entries summing to zero; one customer account and one clinic clearing counterpart. Customer balance >=0 and matches its posted entries. Each business effect has a unique reference independently of HTTP keys. Correction uses another journal. A no-op SET_BALANCE has an idempotent audited command result without a zero-value journal.

## Routes

- Patient: GET `/v1/patients/me/wallet`, GET `/wallet/transactions`, POST `/wallet/topups`.
- Patient: POST `/v1/patients/me/billing/order-intents`, POST `/billing/appointment-intents`, GET `/billing/intents/{id}`, POST `/billing/intents/{id}/cancel`, POST `/billing/intents/{id}/wallet-payment`, POST `/billing/intents/{id}/gateway-attempts`.
- ADMIN: GET `/v1/admin/patients/{id}/wallet`, GET `/wallet/transactions`, POST `/wallet/adjustments`; POST `/wallet/status`, POST `/wallet/appointment-intents`.
- ADMIN: GET `/v1/admin/billing/intents`, GET `/intents/{id}`, GET `/reconciliation`, GET `/summary`; POST `/intents/{id}/refunds`, POST `/refunds/{id}/complete`, POST `/attempts/{id}/retry`, POST `/attempts/{id}/resolve-failed`.
- Callback: existing POST `/v1/payments/providers/sadad/callback`, dispatched by server-correlated provider OrderId. Redirect target is fixed code-owned app path, with opaque intent ID, never a browser-supplied success flag or arbitrary URL.

All lists are bounded/paginated. Sensitive writes have per-actor rate limits and stable errors, including WALLET_INSUFFICIENT_FUNDS, WALLET_VERSION_CONFLICT, WALLET_FROZEN, BILLING_INTENT_NOT_FOUND, BILLING_STATE_CONFLICT, BILLING_PAYMENT_PENDING, APPOINTMENT_PAYMENT_REQUIRED, BILLING_HOLD_EXPIRED and IDEMPOTENCY_KEY_REUSED. Error codes must remain in the shared allowlist.

## Lifecycle

Intents: TOPUP, ORDER, APPOINTMENT; PENDING → PAID, EXPIRED or CANCELLED; ambiguous/late receipts remain explicitly reconcilable/compensated. Attempt creation and verified settlement never repeat effects. Gateway timeout is ambiguous, not decline; retry verifies the same token/attempt with its original revision. Disabled provider configuration stops new attempts, not historical Verify. Top-up only uses gateway; wallet credits never fund themselves.

GET intent includes available methods; ADMIN lists identify the patient and reconciliation exposes the provider's numeric OrderId and operational result code. ADMIN can resolve an ambiguous attempt as failed only with evidence and an idempotent audited command; manual success is unavailable. If a later callback carries a previously unknown token, server Verify must match the original amount/OrderId before storing it or settling. A callback can safely win the race with the original request response. Maintenance expires at most 25 holds and retries at most 10 aged token-bearing attempts per tick (30 seconds); token-less ambiguity needs callback proof or reviewed manual failure. Intent cancellation is forbidden while a bank attempt is unresolved. Cancelling an order intent ends that payment intent; create a new checkout order to purchase again.

Wallet order payment atomically posts debit, creates a WALLET Payment and consumes inventory/discount reservations. A pending/ambiguous legacy or billing bank attempt blocks another payment method. Both paths lock the order; late duplicate bank success is reconciled rather than silently accepted as the existing payment.

Appointment intent reserves a real capacity hold and immutable service/price/time snapshot. Payment settles fully before appointment creation. Final creation and debit/proof are atomic. Expiry releases only unpaid holds; late bank success credits the patient's wallet as compensation if the original slot cannot be honored. No pending request is counted as a final appointment. New direct positive-price creation fails with APPOINTMENT_PAYMENT_REQUIRED and points to the intent API; ADMIN cannot bypass this. Free/legacy appointment handling is explicit.

Refunds are capped by the original received amount minus all pending/completed refunds. Wallet refund posts credit atomically, gateway refund completes only with a non-sensitive manual transfer evidence reference. Original amount/source is immutable. Administrative adjustments have separate sources and never count as bank receipts or sales. Store reporting remains order-scoped; service and top-up totals stay separate.
