---

description: "One-to-one Spec Kit adoption of the authoritative Phase 09 roadmap tasks"

---

# Tasks: Adopt Phase 09 — Commerce, Inventory & Payments

**Input**: `/specs/007-adopt-phase-09/` and authoritative `plan/phases/09-COMMERCE-PAYMENTS.md`.

**Roadmap boundary**: `T001`–`T012` are Spec Kit labels only. The authoritative roadmap IDs below remain the execution, claim, evidence, and commit identities. No task is split, merged, renamed, reordered, claimed, or completed by this adoption.

**Execution status**: Phase 09 is `NOT_STARTED`; `F09-T01` is unclaimed. Consult `plan/STATUS.md` and the authoritative phase checklist for live state. This file does not authorize implementation.

## Format

`[Spec Kit ID] [Story?] [Authoritative roadmap ID] Description`. No `[P]` marker is assigned: the authoritative source has no batch map or per-task `Depends on` fields. Task implementation paths and ownership must be set only by a future coordinator’s compliant batch claim.

## Phase 1: Commerce Contract and Persistence

- [ ] T001 F09-T01: قرارداد catalog/SKU/price/tax/shipping/order/payment/refund
- [ ] T002 F09-T02: migration catalog/inventory/cart/address/order/payment

## Phase 2: Catalog and Store Experience — User Story 1 (P1)

- [ ] T003 [US1] F09-T03: dashboard catalog/category/product/inventory management
- [ ] T004 [US1] F09-T04: app browse/search/detail/wishlist/cart

## Phase 3: Checkout and Inventory Integrity — User Story 2 (P2)

- [ ] T005 [US2] F09-T05: checkout، shipping و order snapshot
- [ ] T006 [US2] F09-T06: stock ledger/reservation/expiry و concurrency
- [ ] T007 [US2] F09-T07: discount usage limits

## Phase 4: Payment and Lifecycle Operations — User Story 3 (P3)

- [ ] T008 [US3] F09-T08: payment adapter و signed/idempotent webhook
- [ ] T009 [US3] F09-T09: fulfillment، tracking، cancellation، return/refund و reconciliation

## Phase 5: Connected Commerce Results — User Story 4 (P4)

- [ ] T010 [US4] F09-T10: اتصال app/dashboard و Dashboard Home commerce widgets
- [ ] T011 [US4] F09-T11: revenue از payment/refund واقعی
- [ ] T012 [US4] F09-T12: OpenAPI/client، tests، حذف mock و evidence

## Dependencies & Execution Order

Phase 09 requires `Phase 02 DONE` and job infrastructure required from Phase 08. The exact authoritative source order is:

```text
F09-T01, F09-T02, F09-T03, F09-T04, F09-T05, F09-T06,
F09-T07, F09-T08, F09-T09, F09-T10, F09-T11, F09-T12
```

The source defines no individual `Depends on` fields or batch map. Before execution, the coordinator must validate the phase prerequisites and unresolved policy blocker, freeze relevant contracts, define non-overlapping owned paths, serialize shared transaction/client surfaces, and claim a batch under `plan/05-AGENT-WORKFLOW.md`.

### Source-Implied Gates (not new dependencies)

- `F09-T01` owns commercial-contract definition before later persistence, checkout, payment, lifecycle, and revenue work relies on it.
- `F09-T02` is the named migration boundary; future execution must preserve a single writer for Prisma/schema/migrations.
- `F09-T05` and `F09-T06` jointly touch checkout/order snapshot and inventory integrity but retain their distinct authoritative boundaries; their shared transactional surface must be coordinated, not merged.
- `F09-T08` owns adapter and signed/idempotent webhook; browser callback remains non-authoritative.
- `F09-T09` owns lifecycle/reconciliation; `F09-T10`–`F09-T11` must consume real authoritative order/payment/refund sources.
- `F09-T12` owns OpenAPI/client, tests, mock removal, and evidence; generated-client work has one future owner after contracts are frozen.

## Parallel Opportunities

None declared. Any future parallelism is a coordinator decision after policy, ownership, contract, transaction-boundary, generated-client, and verification review.

## Notes

- `plan/` wins on any conflict.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md`.
