# Phase 09 Adoption Contract Boundary

`plan/phases/09-COMMERCE-PAYMENTS.md` is authoritative for Phase 09 scope, task IDs, ordering, prerequisites, blockers, exit criteria, and execution state. This document adds no endpoint, route, schema, payment provider, signing scheme, invoice/tax policy, shipping policy, refund policy, generated-client output, or implementation decision.

## Stable task ownership

| Authoritative task | Preserved boundary |
|---|---|
| `F09-T01` | قرارداد catalog/SKU/price/tax/shipping/order/payment/refund. |
| `F09-T02` | migration catalog/inventory/cart/address/order/payment. |
| `F09-T03` | dashboard catalog/category/product/inventory management. |
| `F09-T04` | app browse/search/detail/wishlist/cart. |
| `F09-T05` | checkout، shipping و order snapshot. |
| `F09-T06` | stock ledger/reservation/expiry و concurrency. |
| `F09-T07` | discount usage limits. |
| `F09-T08` | payment adapter و signed/idempotent webhook. |
| `F09-T09` | fulfillment، tracking، cancellation، return/refund و reconciliation. |
| `F09-T10` | اتصال app/dashboard و Dashboard Home commerce widgets. |
| `F09-T11` | revenue از payment/refund واقعی. |
| `F09-T12` | OpenAPI/client، tests، حذف mock و evidence. |

## Non-negotiable Phase 09 outcomes

- Stock does not become negative.
- Duplicate payment effects do not occur.
- A later price mutation does not change retained historical order value.
- Browser callback is not authoritative.
- The dashboard manages the same order through delivery or refund.
- Order and revenue widgets use only real transactions.

## Shared-surface rule

Future execution must preserve one coordinated owner for schema/migrations, shared commercial contracts, OpenAPI export/generated client, authentication/module wiring, and shared test-database lifecycle. Existing OpenAPI export followed by `packages/api-client` generation remains the repository workflow; generated output must not be manually edited. This does not move that ownership from `F09-T12`, create a batch, or claim a task.
