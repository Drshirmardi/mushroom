# Feature Specification: Adopt Phase 09 — Commerce, Inventory & Payments

**Feature Branch**: `codex/phase-09-commerce-inventory-payments`
**Created**: 2026-09-09
**Status**: Phase 09 is `NOT_STARTED`; live execution state remains in `plan/STATUS.md`.
**Input**: Adopt the authoritative Phase 09 roadmap into Spec Kit without activating implementation.

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

### User Story 3 - Operate commerce and payments (Priority: P3)

An authorized dashboard user manages catalog, inventory, discounts, fulfillment, cancellation, return/refund, and reconciliation while payment confirmation comes only from the authoritative payment path.

**Why this priority**: The dashboard must manage the same order through delivery or refund, and browser callbacks are explicitly non-authoritative.

**Independent Test**: An authorized dashboard user manages an order from fulfillment through a permitted cancellation, return, or refund path, while repeated payment notifications do not duplicate payment effects.

**Acceptance Scenarios**:

1. **Given** a payment notification is repeated, **When** it is processed, **Then** the payment effect is recorded at most once.
2. **Given** an order is fulfilled, cancelled, returned, or refunded, **When** an authorized dashboard user manages it, **Then** the order lifecycle and reconciliation use the same authoritative order.

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
- A browser callback arrives without authoritative payment confirmation, or a signed webhook fails validation.
- An unauthorized patient or dashboard user attempts a commerce, payment, fulfillment, return, refund, or revenue action.
- A return, refund, cancellation, delivery-tracking update, or discount usage limit conflicts with the current order lifecycle.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (`F09-T01`)**: The catalog/SKU/price/tax/shipping/order/payment/refund contract MUST remain exactly within the authoritative `F09-T01` boundary.
- **FR-002 (`F09-T02`)**: The catalog/inventory/cart/address/order/payment migration boundary MUST remain exactly within the authoritative `F09-T02` boundary.
- **FR-003 (`F09-T03`)**: Dashboard catalog/category/product/inventory management MUST remain exactly within the authoritative `F09-T03` boundary.
- **FR-004 (`F09-T04`)**: Patient-app browse/search/detail/wishlist/cart behavior MUST remain exactly within the authoritative `F09-T04` boundary.
- **FR-005 (`F09-T05`)**: Checkout, shipping, and order snapshot behavior MUST remain exactly within the authoritative `F09-T05` boundary.
- **FR-006 (`F09-T06`)**: Stock ledger/reservation/expiry and concurrency behavior MUST remain exactly within the authoritative `F09-T06` boundary.
- **FR-007 (`F09-T07`)**: Discount usage limits MUST remain exactly within the authoritative `F09-T07` boundary.
- **FR-008 (`F09-T08`)**: The payment adapter and signed/idempotent webhook MUST remain exactly within the authoritative `F09-T08` boundary.
- **FR-009 (`F09-T09`)**: Fulfillment, tracking, cancellation, return/refund, and reconciliation MUST remain exactly within the authoritative `F09-T09` boundary.
- **FR-010 (`F09-T10`)**: App/dashboard connection and Dashboard Home commerce widgets MUST remain exactly within the authoritative `F09-T10` boundary.
- **FR-011 (`F09-T11`)**: Revenue from real payment/refund information MUST remain exactly within the authoritative `F09-T11` boundary.
- **FR-012 (`F09-T12`)**: OpenAPI/client, tests, mock removal, and evidence MUST remain exactly within the authoritative `F09-T12` boundary.

### Key Entities *(include if feature involves data)*

- **Catalog, Category, Product, and SKU**: The sellable-commerce information named by the roadmap.
- **Price, Tax, and Shipping**: Commercial values governed by the `F09-T01` contract and preserved by the applicable order snapshot.
- **Cart and Address**: Patient checkout inputs named by the `F09-T02` migration task.
- **Order and Payment**: The purchase record and its authoritative payment information.
- **Inventory Ledger and Reservation**: Inventory accountability and availability concepts named by `F09-T06`.
- **Discount**: A commercial offer subject to the `F09-T07` usage-limit boundary.
- **Fulfillment, Tracking, Return, Refund, and Reconciliation**: The order-after-payment concepts named by `F09-T09`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the validated Phase 09 inventory journey, zero attempted concurrent order flows result in negative stock.
- **SC-002**: In the validated payment journey, each duplicate payment notification produces at most one authoritative payment effect.
- **SC-003**: In the validated order-history journey, a later price change does not alter the commercial value retained by an earlier order.
- **SC-004**: In the validated commerce journey, the dashboard manages the same order through delivery or refund and its order/revenue widgets derive only from real transactions.

## Assumptions

- `plan/phases/09-COMMERCE-PAYMENTS.md` and `plan/STATUS.md` remain the execution source of truth; this adoption changes no task IDs, ordering, status, dependencies, claims, acceptance criteria, or completion evidence.
- Phase 09 has the stated prerequisites of `Phase 02 DONE` and required job infrastructure from `Phase 08`; its source declares no individual task `Depends on` fields or batch map.
- The phase-level blocker remains unresolved: payment gateway, tax/invoice, shipping, and refund policy selection require owner direction before the relevant implementation tasks can be claimed.
- Exact fields, lifecycle states, gateway, payment signature scheme, invoice/tax treatment, shipping provider, refund policy, routes, migrations, and generated output remain owned by their authoritative future task.
- Current patient-store and dashboard-commerce local data are pre-existing UI placeholders. Their replacement is not authorized by this preparation and remains within the authoritative task boundaries, including `F09-T12` for mock removal.
