---

description: "Actionable one-to-one execution map for authoritative Phase 09 roadmap tasks"

---

# Tasks: Phase 09 — Commerce, Inventory & Multi-provider Payments

**Input**: `/specs/007-adopt-phase-09/`, `plan/phases/09-COMMERCE-PAYMENTS.md`, ADR-0009 and
`plan/contracts/{commerce-payment-provider-v1,sadad-ipg-v1}.md`.

**Roadmap boundary**: `T001`–`T012` are Spec Kit labels only. `F09-T01`–`F09-T12` remain the claim,
evidence and commit identities. Every checklist item below maps one-to-one to one roadmap task; implementation
may use checkpoints but must retain that roadmap ID and one final task-level commit.

**Execution status**: `F09-B08/F09-T08` is DONE in `plan/STATUS.md`. Sadad acceptance facts remain
`SADAD_GO_LIVE_BLOCKED` for runtime/production only and are a Phase 12 gate, not a Phase 09 completion blocker.

**Tests**: Tests are required because the phase specification explicitly requires financial idempotency,
inventory concurrency, authorization, redaction, migration, contract and browser evidence.

## Phase 1: Contract and persistence foundation

**Goal**: Freeze product/provider behavior and create the safe persistence baseline used by all stories.

**Independent test**: Contract review has no unresolved commercial/lifecycle/capability decision and proves
that `UNCONFIRMED` Sadad cannot be enabled/default. Migration and plaintext-secret persistence proof belong to
`F09-T02`.

- [x] T001 F09-T01 Freeze tax-inclusive/receipt-only TOMAN policy, pickup/courier snapshots, audited manual
  refund, 90-day credential crypto-shredding, and the store-TOMAN versus medical-service-IRR boundary plus
  lifecycle/error/authorization/endpoint matrices. Record Sadad amount/version/environment/redirect/callback/
  date/IP-domain/credential uncertainty as `SADAD_GO_LIVE_BLOCKED`, reject enabled/default while
  `providerUnit=UNCONFIRMED`, and freeze unsupported capabilities in the task-owned plan/contracts/spec docs.
- [x] T002 F09-T02 Implement and verify catalog, SKU, inventory, cart, wishlist, address, order snapshot, discount, provider-config revision, encrypted credential version, payment-attempt, payment and refund persistence in `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/<phase-09-foundation>/migration.sql`, `apps/api/prisma/seed.ts`, and `apps/api/test/migrations.integration.spec.ts`

**Checkpoint**: Contract is frozen and Phase 08→09 plus empty-database migrations replay without drift.

---

## Phase 2: User Story 1 — Trustworthy catalog and cart (Priority: P1)

**Goal**: ADMIN manages the real catalog/inventory and the patient browses, saves and carts the same data.

**Independent test**: A product/SKU created by an authorized dashboard user is searchable in the patient app;
wishlist/cart survive reload and unauthorized cross-patient access fails.

- [x] T003 [US1] F09-T03 Implement authorized/audited category, product, SKU, price and inventory-management API plus dashboard loading/error/empty flows in `apps/api/src/modules/commerce/catalog/**`, `apps/api/test/admin-commerce-catalog.integration.spec.ts`, `apps/dashboard/src/features/store/**`, `apps/dashboard/src/features/store-builder/**`, `apps/dashboard/src/data/store.ts`, and the task-owned generated slice in `packages/api-client/**`
- [x] T004 [US1] F09-T04 Implement patient catalog browse/search/detail, persisted wishlist and cart APIs and replace local app sources in `apps/api/src/modules/commerce/catalog/**`, `apps/api/src/modules/commerce/cart/**`, `apps/api/test/patient-commerce-catalog.integration.spec.ts`, `apps/api/test/patient-cart.authorization.spec.ts`, `apps/app/src/app/(app)/store/**`, `apps/app/src/stores/cart.ts`, `apps/app/src/stores/wishlist.ts`, `apps/app/src/lib/data/catalog.ts`, and the task-owned generated slice in `packages/api-client/**`

**Checkpoint**: User Story 1 is independently usable with real catalog/cart data and no in-scope local source
of truth.

---

## Phase 3: User Story 2 — Safe checkout and inventory integrity (Priority: P2)

**Goal**: Checkout creates immutable commercial history while concurrent stock and discount use remain safe.

**Independent test**: A cart checks out idempotently; later catalog mutation does not alter the order; competing
reservations never oversell or exceed discount limits.

- [x] T005 [US2] F09-T05 Implement idempotent checkout, patient address/shipping selection and immutable line/price/tax/discount/shipping snapshots in `apps/api/src/modules/commerce/checkout/**`, `apps/api/src/modules/commerce/orders/**`, `apps/api/test/checkout-order-snapshot.integration.spec.ts`, `apps/app/src/app/(app)/store/checkout/page.tsx`, `apps/app/src/app/(app)/store/orders/page.tsx`, and the task-owned generated slice in `packages/api-client/**`
- [x] T006 [US2] F09-T06 Implement inventory ledger, atomic reservation/consume/release, expiry/retry jobs and PostgreSQL concurrency coverage in `apps/api/src/modules/commerce/inventory/**`, `apps/api/src/modules/outbox/**` only where the accepted commerce event contract requires it, `apps/api/test/inventory-concurrency.integration.spec.ts`, `apps/api/test/inventory-reservation-expiry.integration.spec.ts`, and `apps/api/test/outbox.integration.spec.ts`
- [x] T007 [US2] F09-T07 Implement server-authoritative discount eligibility, reservation and global/per-patient usage limits with dashboard management in `apps/api/src/modules/commerce/discounts/**`, `apps/api/test/discount-usage-concurrency.integration.spec.ts`, `apps/dashboard/src/features/discounts/**`, `apps/dashboard/src/app/(app)/discounts/page.tsx`, and the task-owned generated slice in `packages/api-client/**`

**Checkpoint**: User Story 2 proves immutable totals, non-negative stock and repeat-safe discount use.

---

## Phase 4: User Story 3 — Multi-provider foundation and Sadad operations (Priority: P3)

**Goal**: ADMIN configures a safe default provider; Sadad payment is authoritative only after idempotent Verify;
the same order proceeds through fulfillment or evidence-backed refund/reconciliation.

**Independent test**: A sanitized Sadad-compatible attempt survives credential rotation; callback/Verify replay
including `ResCode=100` creates one business effect; an unsupported refund cannot be marked successful.

- [x] T008 [US3] F09-T08 Implement provider port/registry, fake-provider contract suite, exact frozen ADMIN/patient/dormant-callback routes, versioned encrypted dashboard configuration, and the `plan/contracts/sadad-ipg-v1.md` PaymentRequest/redirect/Form-Data parser/Verify/retry adapter with durable numeric provider OrderId and cardholder redaction in `apps/api/src/modules/commerce/payments/**`, `apps/api/test/payment-provider-contract.spec.ts`, `apps/api/test/sadad-adapter.spec.ts`, `apps/api/test/payment-idempotency.integration.spec.ts`, `apps/api/test/payment-provider-config.integration.spec.ts`, `apps/dashboard/src/features/settings/settings-page.tsx`, and the task-owned generated slice in `packages/api-client/**`; production acceptance is Phase 12 work.
- [x] T009 [US3] F09-T09 Implement authorized fulfillment, tracking, cancellation, return, policy-backed
  audited manual refund and reconciliation without synthetic success in `apps/api/src/modules/commerce/orders/**`,
  `apps/api/src/modules/commerce/payments/**`, `apps/api/test/order-fulfillment-refund.integration.spec.ts`,
  `apps/dashboard/src/features/orders/**`, `apps/dashboard/src/app/(app)/orders/page.tsx`, and the task-owned
  generated slice in `packages/api-client/**`

**Checkpoint**: User Story 3 manages one authoritative order from configured provider through delivery or
refund/reconciliation with audit and no duplicated financial effect.

---

## Phase 5: User Story 4 — Connected commerce results (Priority: P4)

**Goal**: Patient and dashboard surfaces show the real purchase lifecycle and revenue derives only from
authoritative payments/refunds.

**Independent test**: The patient completes checkout→Sadad→verified receipt→tracking while dashboard sees the
same order and payment/refund-driven widgets/revenue.

- [x] T010 [US4] F09-T10 Connect patient payment/result/receipt/tracking and dashboard commerce/order/Home widgets with truthful states in `apps/app/src/app/(app)/store/payment/page.tsx`, `apps/app/src/app/(app)/store/order-success/page.tsx`, `apps/app/src/app/(app)/store/order-tracking/page.tsx`, `apps/dashboard/src/features/orders/**`, `apps/dashboard/src/features/dashboard/dashboard-page.tsx`, and frontend connection tests adjacent to those features. The patient receipt is strictly Payment-backed and redacted; `SADAD_GO_LIVE_BLOCKED` has no fake redirect or success; operational widgets exclude revenue.
- [ ] T011 [US4] F09-T11 Implement documented revenue formulas/read models from verified Payment minus accepted Refund only, with clinic timezone/currency boundaries and dashboard views in `apps/api/src/modules/commerce/reporting/**`, `apps/api/test/commerce-revenue.integration.spec.ts`, `apps/dashboard/src/features/revenue/**`, `apps/dashboard/src/app/(app)/revenue/page.tsx`, `apps/dashboard/src/data/revenue.ts`, `apps/dashboard/src/features/dashboard/dashboard-page.tsx`, and the task-owned generated slice in `packages/api-client/**`

**Checkpoint**: User Story 4 exposes no mock order/revenue totals and no callback/unpaid order counts as income.

---

## Phase 6: Final verification and evidence

**Goal**: Prove the complete Phase 09 vertical slice and prepare it for independent phase closure review.

- [ ] T012 [US4] F09-T12 Export and verify final OpenAPI/generated client, remove remaining in-scope commerce mocks, run migration/authorization/concurrency/provider/redaction/retry/browser gates, and record evidence in `packages/api-client/**`, `apps/api/test/openapi-contract.spec.ts`, `apps/api/test/**`, `apps/app/src/**`, `apps/dashboard/src/**`, `plan/logs/phase-09.md`, `plan/STATUS.md`, `plan/phases/09-COMMERCE-PAYMENTS.md`, and `specs/007-adopt-phase-09/**`

## Dependencies & execution order

```text
F09-T01 → F09-T02 → F09-T03 → F09-T04 → F09-T05 → F09-T06 → F09-T07
        → F09-T08 → F09-T09 → F09-T10 → F09-T11 → F09-T12
```

- `F09-T01` freezes all commercial decisions and isolates unconfirmed external Sadad facts as
  `SADAD_GO_LIVE_BLOCKED`; those facts cannot enable Sadad or issue a real request.
- `F09-T02` is the exclusive schema/migration/seed baseline.
- `F09-T05` creates order snapshots; `F09-T06` adds safe reservation/consumption; `F09-T07` freezes the
  payable discounted amount before provider work.
- `F09-T08` requires order and reservation semantics and owns provider/config/crypto/payment behavior.
- `F09-T09` requires an authoritative payment and frozen refund policy.
- `F09-T10`–`F09-T11` consume accepted real sources; `F09-T12` is the final cross-surface gate.

## Parallel opportunities

None are declared by default. The authoritative batch map uses one task per batch because Prisma, commerce
module wiring, transaction state, generated client, dashboard Home and the shared PostgreSQL test lifecycle
overlap. A future coordinator may introduce parallel checkpoints only after freezing non-overlapping owned
paths; roadmap task IDs and final task commits remain unchanged.

## Implementation strategy

1. Complete the active contract-finalization batch only (`F09-B01` / `F09-T01`).
2. Keep Sadad fail-closed for runtime until Phase 12 acceptance; retain `UNCONFIRMED` for real attempts while
   testing the owner-confirmed dormant RIAL conversion only inside the adapter.
3. Complete and commit each roadmap task independently before claiming its successor.
4. Endpoint-owning tasks update their OpenAPI/client slice through the generated workflow; `F09-T12` performs
   final freshness, mock and integrated evidence review.
5. Never commit the confidential Sadad PDF/full legacy sample, real provider credentials, generated crypto
   secrets, full callback payloads, or cardholder PII.

## Format validation

- 12 checklist tasks map one-to-one to `F09-T01`–`F09-T12`.
- Every task includes an exact planned path; only `F09-T01` is currently claimed and it remains unchecked
  until evidence and review pass.
- Story labels map to US1–US4; foundational tasks intentionally have no story label.
- No `[P]` task is declared because the default execution map is serialized.
