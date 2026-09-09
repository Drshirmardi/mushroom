# Phase 09 Data Model Boundary

`plan/phases/09-COMMERCE-PAYMENTS.md` is authoritative. This document records only concepts directly named by its task titles and exit criteria; it defines no fields, relations, indexes, migrations, state machines, transaction algorithm, API schema, or provider policy.

## Roadmap-named concepts

| Concept | Authoritative boundary |
|---|---|
| Catalog / Category / Product / SKU | `F09-T01` owns the commercial contract; `F09-T02` owns the named migration boundary; `F09-T03` and `F09-T04` own their dashboard and patient-app behaviors. |
| Price / Tax / Shipping | `F09-T01` owns the contract; `F09-T05` owns checkout, shipping, and order snapshot. Historical price mutation is prohibited by the phase exit criteria. |
| Inventory / Stock Ledger / Reservation / Expiry | `F09-T02` names inventory persistence and `F09-T06` owns ledger/reservation/expiry/concurrency. Negative stock is prohibited by the phase exit criteria. |
| Cart / Address | `F09-T02` names their migration boundary; `F09-T04` owns browse/search/detail/wishlist/cart and `F09-T05` owns checkout. |
| Order | `F09-T01` owns its contract; `F09-T02` names persistence; `F09-T05` owns snapshot; `F09-T09` owns its post-payment lifecycle; `F09-T10` owns connected surfaces. |
| Payment | `F09-T01` owns its contract; `F09-T02` names persistence; `F09-T08` owns adapter and signed/idempotent webhook; duplicate payment is prohibited by exit criteria. |
| Discount | `F09-T07` owns usage limits. |
| Fulfillment / Tracking / Cancellation / Return / Refund / Reconciliation | `F09-T09` owns these order lifecycle concepts. |
| Revenue | `F09-T11` owns revenue from real payment/refund sources; `F09-T10` owns Dashboard Home commerce widgets. |

## Existing relationships and exclusions

```text
Catalog / Category ──> Product ──> SKU
Product / SKU ──> Inventory ──> Stock Ledger / Reservation / Expiry
Patient ──> Cart / Address ──> Checkout ──> Order Snapshot ──> Payment
Order ──> Fulfillment / Tracking / Cancellation / Return / Refund / Reconciliation
Real Payment / Refund ──> Revenue and commerce widgets
Discount ──> usage limit
```

- Money representation, tax/invoice treatment, shipping policy, refund policy, status transitions, and any external-provider mapping remain unresolved task-owned decisions.
- A browser callback is not authoritative; a payment webhook must be signed and idempotent under `F09-T08` and existing standards.
- Any inventory mutation must satisfy the existing ledger-or-atomic-update rule; any external effect must occur only after the primary transaction commits.
- Generated client output is not a data-model authority and remains `F09-T12`-owned for Phase 09.
