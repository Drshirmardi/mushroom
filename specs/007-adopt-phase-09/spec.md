# Feature Specification: Phase 09 — Commerce, Inventory & Multi-provider Payments

**Feature Branch**: `codex/phase-09-commerce-inventory-payments`
**Created**: 2026-09-09
**Status**: `F09-B03/F09-T03` is DONE; live execution state remains in `plan/STATUS.md`.
**Input**: Prepare the authoritative Phase 09 roadmap for implementation, including the owner-approved
multi-provider architecture, Sadad-first integration, dashboard-managed provider configuration, and the
official Sadad purchase protocol, without activating or claiming the phase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse a trustworthy store (Priority: P1)

A patient can browse, search, review, save, and place products in a cart whose commercial information is governed by the Phase 09 catalog contract.

**Why this priority**: The roadmap starts with the catalog/SKU/price/tax/shipping/order/payment/refund contract and then creates its persistence and patient store experience.

**Independent Test**: An authorized patient can browse and search the real catalog, inspect a product, manage a wishlist and cart, and sees commercial information supplied by the accepted source.

**Acceptance Scenarios**:

1. **Given** an available catalog item, **When** a patient browses, searches, or opens its detail, **Then** the patient sees the applicable product information from the real catalog source.
2. **Given** a product has been added to a cart or wishlist, **When** the patient changes that selection, **Then** the resulting cart or wishlist reflects the permitted selection without relying on fabricated commercial history.

---

### User Story 2 - Complete an order safely (Priority: P2)

A patient completes checkout using a shipping choice and receives an order whose commercial values are preserved for its later lifecycle.

**Why this priority**: Checkout, shipping, order snapshot, and inventory concurrency are explicit Phase 09 tasks and protect the phase’s no-negative-stock and no-historical-price-mutation outcomes.

**Independent Test**: A permitted cart is checked out once, the resulting order retains its commercial snapshot, and competing stock activity does not create negative stock.

**Acceptance Scenarios**:

1. **Given** a permitted cart and shipping information, **When** checkout succeeds, **Then** an order retains the applicable commercial snapshot for its subsequent lifecycle.
2. **Given** concurrent demand for limited stock, **When** reservations are attempted, **Then** stock does not become negative.

---

### User Story 3 - Operate commerce and provider-neutral payments (Priority: P3)

An authorized dashboard user manages catalog, inventory, discounts, fulfillment, cancellation,
return/refund, reconciliation, and provider configuration while payment confirmation comes only from the
authoritative provider verification path. Sadad is the only real provider required in this phase, but the
commerce domain remains provider-neutral.

**Why this priority**: The dashboard must manage the same order through delivery or refund, and browser callbacks are explicitly non-authoritative.

**Independent Test**: An authorized dashboard user manages an order from fulfillment through a permitted cancellation, return, or refund path, while repeated payment notifications do not duplicate payment effects.

**Acceptance Scenarios**:

1. **Given** Sadad callback or Verify processing is repeated, **When** it is processed, **Then** Verify
   response codes `0` and repeat-success `100` produce at most one authoritative payment effect.
2. **Given** the default provider or its credentials change, **When** an earlier attempt is verified,
   **Then** it remains bound to its original immutable provider-configuration revision.
3. **Given** an order is fulfilled, cancelled, returned, or refunded, **When** an authorized dashboard
   user manages it, **Then** the order lifecycle and reconciliation use the same authoritative order.

---

### User Story 4 - See real commerce results (Priority: P4)

The patient app, dashboard, Dashboard Home widgets, and revenue views use real Phase 09 order, payment, and refund information.

**Why this priority**: The roadmap requires connected app/dashboard surfaces, real payment/refund revenue, generated contracts, mock removal, and evidence.

**Independent Test**: The connected patient and dashboard journey presents order and revenue information derived only from real payment/refund activity.

**Acceptance Scenarios**:

1. **Given** a real commerce transaction and any applicable refund, **When** revenue is viewed, **Then** it is derived from those real payment/refund records.
2. **Given** the Phase 09 connected surfaces are exercised, **When** their store, order, discount, and revenue paths load, **Then** in-scope mock data is not their source of truth.

### Edge Cases

- A price, tax, shipping value, discount, or catalog item changes after an order is created.
- A checkout, stock reservation, payment notification, refund, or reconciliation action is repeated or races with another action.
- Stock is exhausted, expired, or held by a competing reservation.
- A browser callback arrives without authoritative Verify, callback delivery is repeated or omitted, or
  Verify times out after the payer may have completed payment.
- Provider credentials or the default provider change between token creation and Verify.
- The amount or order identifier returned by Verify does not match the stored attempt.
- PaymentRequest times out after Sadad may have created a Token, or returns duplicate-OrderId on retry.
- The official guide and legacy sample disagree on the exact purchase redirect path/query shape.
- A provider lacks inquiry, webhook, refund, or partial-refund capability.
- An unauthorized patient or dashboard user attempts a commerce, payment, fulfillment, return, refund, or revenue action.
- A return, refund, cancellation, delivery-tracking update, or discount usage limit conflicts with the current order lifecycle.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (`F09-T01`)**: The catalog/SKU/price/tax/shipping/order/payment/refund contract MUST freeze
  TOMAN as the integer commerce unit, provider-neutral payment orchestration, immutable provider-config
  binding, capability discovery, Sadad-first behavior, tax-inclusive/receipt-only pricing, pickup/courier
  snapshots, audited manual refund, 90-day crypto-shred retention, and `SADAD_GO_LIVE_BLOCKED`.
- **FR-002 (`F09-T02`)**: The catalog/inventory/cart/address/order/payment migration boundary MUST also
  persist provider configuration revisions, encrypted credential versions, payment attempts, payments,
  refunds, idempotency keys, exact provider amount/unit snapshots, and required integrity constraints.
- **FR-003 (`F09-T03`)**: Dashboard catalog/category/product/inventory management MUST remain exactly within the authoritative `F09-T03` boundary.
- **FR-004 (`F09-T04`)**: Patient-app browse/search/detail/wishlist/cart behavior MUST remain exactly within the authoritative `F09-T04` boundary.
- **FR-005 (`F09-T05`)**: Checkout, shipping, and order snapshot behavior MUST remain exactly within the authoritative `F09-T05` boundary.
- **FR-006 (`F09-T06`)**: Stock ledger/reservation/expiry and concurrency behavior MUST remain exactly within the authoritative `F09-T06` boundary.
- **FR-007 (`F09-T07`)**: Discount usage limits MUST remain exactly within the authoritative `F09-T07` boundary.
- **FR-008 (`F09-T08`)**: The provider port/registry, versioned configuration API/dashboard settings,
  fake-provider contract test, and real Sadad create/callback/Verify adapter MUST remain within `F09-T08`.
  Sadad MUST NOT be described as having webhook, inquiry, refund, partial-refund, or sandbox capability
  without additional provider documentation. Exact endpoints, fields, redirect uncertainty, response-code
  policy and enablement gates are governed by `plan/contracts/sadad-ipg-v1.md`.
- **FR-009 (`F09-T09`)**: Fulfillment, tracking, cancellation, return/refund, and reconciliation MUST remain exactly within the authoritative `F09-T09` boundary.
- **FR-010 (`F09-T10`)**: App/dashboard connection MUST include checkout initiation, provider redirect,
  non-authoritative return handling, authoritative status/receipt display, order operations, and Dashboard
  Home commerce widgets.
- **FR-011 (`F09-T11`)**: Revenue from real payment/refund information MUST remain exactly within the authoritative `F09-T11` boundary.
- **FR-012 (`F09-T12`)**: OpenAPI/client, tests, mock removal, and evidence MUST remain exactly within the authoritative `F09-T12` boundary.

### Payment Architecture Requirements

- **PA-001**: Sadad MUST be the first and only real provider implemented in Phase 09; a fake provider MAY
  be used only to prove the shared provider contract.
- **PA-002**: Phase 09 MUST use one enabled, configured default provider and MUST NOT implement patient
  selection, automatic failover, priority routing, or provider switching during an attempt.
- **PA-003**: Provider endpoints MUST be selected from adapter-owned allowlists; dashboard input MUST NOT
  supply an arbitrary provider host or URL.
- **PA-004**: Provider credentials MUST be write-only, versioned, encrypted at rest with a key held outside
  the database, absent from logs/responses, and changed only through audited ADMIN operations.
- **PA-005**: A browser callback MUST never mark a payment paid. Only provider server-side Verify can
  create the successful payment, consume stock reservation, advance the order, or create revenue.
- **PA-006**: Sadad request signing MUST use the documented
  `Base64(TripleDES-ECB-PKCS7(TerminalId;OrderId;Amount))` protocol, with deterministic compatibility
  fixtures derived from sanitized sample inputs.
- **PA-007**: If Sadad Verify does not return a response, the same attempt MUST be retried without changing
  provider. Ambiguous outcomes MUST become reconciliation work, never automatic failover.
- **PA-008**: The provider unit for Sadad MUST remain `UNCONFIRMED` and a fail-closed go-live prerequisite
  until current acceptance/merchant documentation confirms it; the supplied guide does not name IRR or TOMAN.
- **PA-009**: Sadad MUST receive a generated numeric-long provider OrderId that is unique and non-repeated
  per transaction; the internal Order UUID and a random in-memory number MUST NOT be used as that contract.
- **PA-010**: The Sadad callback MUST accept the documented HTTP POST independently of patient session,
  freeze its actual Content-Type/casing from acceptance evidence, correlate only to a persisted attempt,
  redact cardholder fields, and return a safe code-owned redirect.
- **PA-011**: Production enablement MUST remain fail-closed until the guide/sample redirect discrepancy,
  protocol version, date formats, amount unit, registered IP/domain and acceptance environment are confirmed.
- **PA-012**: Phase 09 TOMAN semantics apply only to store/commerce money and MUST NOT reinterpret or migrate
  the existing medical-service/appointment IRR contract from completed phases.

### Key Entities *(include if feature involves data)*

- **Catalog, Category, Product, and SKU**: The sellable-commerce information named by the roadmap.
- **Price, Tax, and Shipping**: Commercial values governed by the `F09-T01` contract and preserved by the applicable order snapshot.
- **Cart and Address**: Patient checkout inputs named by the `F09-T02` migration task.
- **Order and Payment**: The purchase record and its authoritative payment information.
- **PaymentProviderConfig / Revision / CredentialVersion**: Clinic-owned provider selection and immutable,
  encrypted configuration history used by attempts.
- **PaymentAttempt**: One idempotent provider-bound payment try containing both commerce TOMAN and exact
  provider amount/unit snapshots.
- **Inventory Ledger and Reservation**: Inventory accountability and availability concepts named by `F09-T06`.
- **Discount**: A commercial offer subject to the `F09-T07` usage-limit boundary.
- **Fulfillment, Tracking, Return, Refund, and Reconciliation**: The order-after-payment concepts named by `F09-T09`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the validated Phase 09 inventory journey, zero attempted concurrent order flows result in negative stock.
- **SC-002**: In the validated payment journey, each duplicate payment notification produces at most one authoritative payment effect.
- **SC-003**: In the validated order-history journey, a later price change does not alter the commercial value retained by an earlier order.
- **SC-004**: In the validated commerce journey, the dashboard manages the same order through delivery or refund and its order/revenue widgets derive only from real transactions.
- **SC-005**: Zero raw provider credentials, arbitrary provider URLs, full cardholder data, or provider
  secrets are returned by APIs or emitted in test-observed logs.
- **SC-006**: Rotating the default Sadad configuration after token creation does not alter the configuration,
  amount, provider, or verification behavior of the existing attempt.
- **SC-007**: A Sadad callback followed by any repetition of callback or Verify results in one successful
  Payment, one stock-consumption effect, one order transition, and one revenue effect.
- **SC-008**: Provider contract tests prove that only the documented/allowlisted Sadad endpoints and the
  frozen Mushroom routes are used, provider OrderId is durable and unique, and callback cardholder fields
  never reach persistence, API responses, URLs or test-observed logs.

## Assumptions

- `plan/phases/09-COMMERCE-PAYMENTS.md` and `plan/STATUS.md` remain the execution source of truth; this
  preparation keeps stable task IDs and completion state but adds owner-approved architecture, dependencies,
  acceptance detail, and a safe serialized batch map.
- Phase 09 has the stated prerequisites of `Phase 02 DONE` and required job infrastructure from `Phase 08`;
  its authoritative phase file now records explicit dependencies and a conservative serialized batch map.
- Commerce policy is frozen as tax-inclusive TOMAN, receipt-only, pickup/courier snapshots, audited manual
  refund and 90-day credential crypto-shred. Sadad amount unit, protocol/environment, redirect, callback/date
  transport, IP/domain and credentials are `SADAD_GO_LIVE_BLOCKED` only; they cannot enable Sadad or close the
  phase but do not block `F09-T01` or provider-neutral commerce work.
- Provider configuration and payment entity fields are frozen by the active documentation-only `F09-T01`
  claim and remain subject to `F09-T02` migration review; this specification does not authorize product code.
- Current patient-store and dashboard-commerce local data are pre-existing UI placeholders. Their replacement is not authorized by this preparation and remains within the authoritative task boundaries, including `F09-T12` for mock removal.
