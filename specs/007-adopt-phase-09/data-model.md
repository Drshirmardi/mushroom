# Phase 09 Data Model Boundary

`plan/phases/09-COMMERCE-PAYMENTS.md` is authoritative. This document records the conceptual model required
by the accepted Phase 09 architecture. Exact Prisma names, indexes, constraints, migration SQL, and API
schemas remain `F09-T01`/`F09-T02` review outputs.

## Roadmap-named concepts

| Concept | Authoritative boundary |
|---|---|
| Catalog / Category / Product / SKU | `F09-T01` owns the commercial contract; `F09-T02` owns the named migration boundary; `F09-T03` and `F09-T04` own their dashboard and patient-app behaviors. |
| Price / Tax / Shipping | `F09-T01` owns the contract; `F09-T05` owns checkout, shipping, and order snapshot. Historical price mutation is prohibited by the phase exit criteria. |
| Inventory / Stock Ledger / Reservation / Expiry | `F09-T02` names inventory persistence and `F09-T06` owns ledger/reservation/expiry/concurrency. Negative stock is prohibited by the phase exit criteria. |
| Cart / Address | `F09-T02` names their migration boundary; `F09-T04` owns browse/search/detail/wishlist/cart and `F09-T05` owns checkout. |
| Order | `F09-T01` owns its contract; `F09-T02` names persistence; `F09-T05` owns snapshot; `F09-T09` owns its post-payment lifecycle; `F09-T10` owns connected surfaces. |
| Provider configuration | `F09-T01` freezes policy; `F09-T02` persists config/credential revisions; `F09-T08` owns ADMIN API, dashboard settings, registry and adapters. |
| PaymentAttempt / Payment | `F09-T01` owns lifecycle; `F09-T02` persists it; `F09-T08` owns Sadad create/callback/Verify and retry. Duplicate business effects are prohibited. |
| Discount | `F09-T07` owns usage limits. |
| Fulfillment / Tracking / Cancellation / Return / Refund / Reconciliation | `F09-T09` owns these order lifecycle concepts. |
| Revenue | `F09-T11` owns revenue from real payment/refund sources; `F09-T10` owns Dashboard Home commerce widgets. |

## Existing relationships and exclusions

```text
Catalog / Category ──> Product ──> SKU
Product / SKU ──> Inventory ──> Stock Ledger / Reservation / Expiry
Patient ──> Cart / Address ──> Checkout ──> Order Snapshot ──> Payment
Clinic ──> ProviderConfig ──> immutable ConfigRevision ──> encrypted CredentialVersion
Order ──> PaymentAttempt ──> ConfigRevision
Order ──> Fulfillment / Tracking / Cancellation / Return / Refund / Reconciliation
Real Payment / Refund ──> Revenue and commerce widgets
Discount ──> usage limit
```

- Commerce money is integer TOMAN, tax-inclusive, with `taxAmountToman=0` in the first release. Order
  snapshots retain final price, tax, shipping method/fee/address/commercial details; `PICKUP` is always free.
  The fixed `COURIER` fee is a persisted, clinic-scoped ADMIN-managed rate with authorization/audit; its
  initial seed/config is `25,000 TOMAN`, it is never code/UI hardcoded, and no active rate disables courier
  fail-closed. A changed rate applies only to new checkout snapshots. Formal tax invoice generation is out of
  scope.
- Existing medical-service and appointment prices remain IRR and outside Phase 09 migration; shared money UI
  must render the explicit domain currency rather than assume all project amounts are TOMAN.
- `onHandQuantity` is physical stock and `reservedQuantity` is committed stock; sellable inventory is their
  non-negative difference. Checkout writes one active reservation per order/SKU atomically with a global-idempotent
  `RESERVATION` ledger entry. `RELEASE` reverses only reserved stock, `CONSUMPTION` removes both buckets, and
  `RECEIPT`/`ADJUSTMENT` alter physical stock. The injected-clock, bounded `SKIP LOCKED` worker expires once after
  a configurable 20-minute default; it does not release stock or cancel a pending order while an attempt is
  verifying or requires reconciliation.
- A browser callback is not authoritative. Sadad uses callback followed by Verify; sandbox, webhook, inquiry,
  refund and partial-refund are unsupported. Its provider unit is `UNCONFIRMED`, so all real Sadad calls and
  enabled/default state remain `SADAD_GO_LIVE_BLOCKED` until acceptance confirmation.
- Any inventory mutation must satisfy the existing ledger-or-atomic-update rule; any external effect must occur only after the primary transaction commits.
- Generated client output is not a data-model authority and remains `F09-T12`-owned for Phase 09.

## Payment-provider entities

### PaymentProviderConfig

- clinic ownership and provider code
- enabled/default/configured state
- pointer to the active immutable revision
- only one enabled/configured default per clinic
- provider endpoint is not persisted from dashboard input

### PaymentProviderConfigRevision

- immutable provider, mode and safe configuration snapshot
- reference to one encrypted credential version
- created/retired timestamps and audited actor context
- retained while any non-terminal/reconcilable attempt depends on it; after every dependent attempt is terminal
  and 90 days pass, its secret is crypto-shredded while non-secret financial history remains

### PaymentProviderCredentialVersion

- authenticated ciphertext, nonce/IV, authentication tag and encryption-key version
- never returned by API and never copied into audit metadata
- plaintext exists only in the provider call boundary for the shortest practical lifetime

### PaymentAttempt

- clinic/patient/order ownership
- immutable provider code and config-revision reference
- `commerceAmountToman` plus explicit `providerAmount` and `providerUnit`; only the pre-go-live Sadad state
  may hold `providerUnit=UNCONFIRMED` and null providerAmount because no conversion/request is permitted
- unique idempotency and provider correlation identifiers, including a durable numeric-long
  `providerOrderId` distinct from the internal Order UUID
- token/reference/trace fields where supplied
- callback/verification/expiry/reconciliation timestamps
- safe provider result code and internal failure code

### Payment

- authoritative successful financial record created only from provider Verify
- unique relationship to the successful attempt/provider transaction
- captured TOMAN amount and provider amount/unit
- provider reference and trace values required for receipt/support
- append-only financial history; correction occurs through Refund/Reconciliation, not mutation

### Refund

- requested/approved/executed amounts and reason
- manual or provider channel based only on frozen capability/policy
- provider identifiers when supported
- never records success before external/manual evidence and reconciliation exist

## Candidate lifecycle boundaries

Frozen semantic transitions are:

```text
PaymentAttempt:
CREATED → REQUESTING → REDIRECT_READY → CALLBACK_RECEIVED → VERIFY_PENDING
VERIFY_PENDING → VERIFIED | FAILED | EXPIRED | REQUIRES_RECONCILIATION
REQUIRES_RECONCILIATION → VERIFIED | FAILED

InventoryReservation:
ACTIVE → CONSUMED | RELEASED | EXPIRED

Payment:
VERIFIED → PARTIALLY_REFUNDED | REFUNDED

Order:
PENDING_PAYMENT → CANCELLED | PAID
PAID → FULFILLMENT_PENDING → READY_FOR_PICKUP | SHIPPED → DELIVERED
PAID → CANCELLATION_REQUESTED | RETURN_REQUESTED → REFUND_PENDING | *_REJECTED

Refund:
REQUESTED → APPROVED → MANUAL_EXECUTION_PENDING → COMPLETED | REJECTED
```

- callback cannot transition directly to `VERIFIED`.
- Sadad Verify `0` and repeat-success `100` converge on the same idempotent verified outcome.
- a config revision, provider, commerce amount or provider amount cannot change after attempt creation.
- Sadad `providerOrderId` is generated durably and cannot be random, repeated or changed during retry.
- Order lifecycle remains separate and advances only from accepted payment/fulfillment/refund events.
- Before payment, cancellation releases reservation and creates no Refund. After payment, only audited ADMIN
  actions may request/approve/reject a case-by-case refund; `COMPLETED` needs non-sensitive manual-bank evidence.
