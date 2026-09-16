# Phase 09 Adoption Contract Boundary

`plan/phases/09-COMMERCE-PAYMENTS.md` is authoritative for Phase 09 scope, task IDs, dependencies,
serialized batch map, prerequisites, blockers, exit criteria, and execution state. Owner-approved payment
decisions are recorded in ADR-0009 and `plan/contracts/commerce-payment-provider-v1.md`; the exact Sadad
endpoint/field/error boundary is `plan/contracts/sadad-ipg-v1.md`, and the planned internal interface surface
is mirrored in `contracts/payment-provider-v1.md`. Commercial policy is frozen as integer `TOMAN` for store
only (existing medical-service/appointment `IRR` is unchanged); unresolved external Sadad acceptance facts
are `SADAD_GO_LIVE_BLOCKED` and cannot enable/default the provider. This mirror does not claim product
implementation.

## Stable task ownership

| Authoritative task | Preserved boundary |
|---|---|
| `F09-T01` | Freeze commerce policy and provider-neutral/Sadad-first contract. |
| `F09-T02` | Commerce plus versioned provider-config/attempt/payment/refund migration. |
| `F09-T03` | dashboard catalog/category/product/inventory management. |
| `F09-T04` | app browse/search/detail/wishlist/cart. |
| `F09-T05` | checkout، shipping و order snapshot. |
| `F09-T06` | stock ledger/reservation/expiry و concurrency. |
| `F09-T07` | discount usage limits. |
| `F09-T08` | Provider registry/configuration, frozen internal routes, and exact Sadad create/redirect/acceptance-proven-callback/Verify adapter. |
| `F09-T09` | fulfillment، tracking، cancellation، return/refund و reconciliation. |
| `F09-T10` | اتصال app/dashboard و Dashboard Home commerce widgets. |
| `F09-T11` | revenue از payment/refund واقعی. |
| `F09-T12` | OpenAPI/client، tests، حذف mock و evidence. |

## Non-negotiable Phase 09 outcomes

- Stock does not become negative.
- Duplicate payment effects do not occur.
- A later price mutation does not change retained historical order value.
- Browser callback is not authoritative.
- Sadad Verify `0/100` creates each financial/order/inventory/revenue effect at most once.
- Every attempt remains bound to its immutable provider/config revision and exact provider amount/unit.
- Sadad provider OrderId is durable, numeric-long, unique and distinct from the internal Order UUID.
- Raw credentials and arbitrary provider endpoint input are unavailable to dashboard/API consumers.
- The dashboard manages the same order through delivery or refund.
- Order and revenue widgets use only real transactions.

## Shared-surface rule

Future execution must preserve one coordinated owner for schema/migrations, shared commercial contracts,
credential encryption, OpenAPI export/generated client, authentication/module wiring, and shared test-database
lifecycle. Endpoint-owning tasks generate their accepted slice; `F09-T12` owns final freshness/evidence.
Generated output is never manually edited. The active `F09-B01/F09-T01` claim is limited to the contract,
planning/status and evidence paths named in `plan/STATUS.md`; this adoption document does not expand it.
