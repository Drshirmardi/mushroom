# ADR-0043 — Saved orders and temporary stock reservations

- Status: ACCEPTED, 2026-10-26; F12-FE01-PAY04.
- Authority: owner requests this lifecycle correction and explicitly confirms preserving the recorded order amount.

## Decision

Unpaid commerce orders survive inventory reservation expiry. Stock retains its configurable TTL (default20 minutes), independently of the order and bank request. Expiry releases stock without cancelling the order. Checkout atomically detaches unchanged snapshot cart entries; subsequent purchases have their own cart/order. Matching historical carts may resume a pending order after stock expiry.

Before a fresh gateway attempt or wallet debit, lock intent/order and reacquire expired stock. Lock/check every required inventory item before incrementing any; missing or inactive items fail without partial acquisition. Reuse reservation IDs with new expiry values and cycle-specific reservation/release ledger keys. Final consumption remains once per reservation. Polling never renews stock.

Accepted totals, tax, shipping and discount remain immutable. New discount entitlements occupy quota until settlement or explicit cancellation, independently of stock expiry. Historical expired discount reservations can settle a still-valid accepted order at its original amount. Historical cancelled orders are not reopened. Explicit intent cancellation closes its unpaid order and releases stock/discount even after stock expiry.

Existing token-bearing bank attempts are resumed, never replaced solely due to a timer. Maintenance verifies abandoned REDIRECT_READY attempts after a20-minute grace, using the existing bounded worker. This is a verification grace, not an assertion about bank token lifetime. Only definitive provider failure releases its guard; uncertain Verify remains reconcilable. Token-less requests expire after two minutes; late original responses cannot expose a token. A late callback must still prove original amount/OrderId through Verify before settlement or compensation.

A late verified shared-bank receipt reacquires stock and settles the original order if possible. Otherwise it closes the unfulfillable order and posts the existing wallet compensation exactly once. Historical legacy receipts retain their separate reconciliation guard because that path has no shared-wallet compensation.

Visible pending payment screens refresh server state every five seconds, preserving confirmation dialogs and ignoring stale responses. Terminal outcomes stop polling. Temporary read failures preserve the screen. Wallet/cancel controls reflect bank guards; a ready bank control resumes the same attempt. Remove normal manual-refresh controls, retain error recovery.

## Boundaries and validation

No schema, dependency, Caddy, credential, auth or API shape change. Isolated PostgreSQL covers same-order retry, immutable price, expiry cycles, last-unit concurrency, multi-item shortage, compensation/replay and explicit cancellation/discount. Focused browser checks cover preserved confirmation and automatic terminal results. No live payment or VPS mutation; owner tests the deployed dev environment next.
