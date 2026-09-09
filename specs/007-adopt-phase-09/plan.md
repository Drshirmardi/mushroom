# Implementation Plan: Adopt Phase 09 — Commerce, Inventory & Payments

**Branch**: `codex/phase-09-commerce-inventory-payments` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

## Summary

Preserve a one-to-one Spec Kit representation of the authoritative twelve-task Phase 09 roadmap. `plan/` remains the execution source of truth. This is documentation-only preparation; it neither claims nor implements a Phase 09 task.

## Technical Context

**Language/Version**: Existing TypeScript monorepo.
**Primary Dependencies**: Existing patient app, dashboard, API, PostgreSQL integration tests, OpenAPI export, and generated API client; none are added by this adoption.
**Storage**: Existing PostgreSQL. Catalog, inventory, cart, address, order, payment, and related commerce persistence remain `F09-T02`-owned; fields, relations, migrations, and constraints are not frozen here.
**Testing**: Existing targeted domain/API/PostgreSQL checks, concurrency coverage, OpenAPI/client freshness checks, and connected frontend validation. The authoritative final quality/evidence boundary is `F09-T12`.
**Target Platform**: Existing patient app, administrator dashboard, and API.
**Project Type**: Existing monorepo.
**Performance Goals**: No adoption-added performance target.
**Constraints**: Preserve the roadmap; money is integer/BigInt with explicit currency; payment webhooks and queue consumers are idempotent; inventory requires a ledger or atomic update; external effects occur only after the main transaction commits; sensitive creates are idempotent; shared migrations, contracts, and generated client have one owner per future batch.
**Scale/Scope**: Twelve stable tasks, `F09-T01`–`F09-T12`; Phase 09 is `NOT_STARTED` and `F09-T01` is unclaimed. Phase 02 and required Phase 08 job infrastructure are phase prerequisites.

## Constitution Check

*GATE: Passed before research and after design.*

- This is a phase-level documentation adoption only. It does not claim a task, create a batch, change phase status, or modify product code, migrations, generated clients, Phase 08 artifacts, or plan execution records.
- The Phase 09 source scope, stable IDs, listed order, UI scope, prerequisites, blocker statement, and exit criteria are copied without redesign. The source supplies no per-task dependencies or batch map; none is invented.
- Existing app/dashboard/API architecture and the generated-client workflow remain authoritative. Future batches must assign one owner for Prisma/migrations, OpenAPI export/generated client, contracts, authentication/module wiring, and other shared surfaces.
- Payment/inventory boundaries are recorded only as existing engineering standards and explicit Phase 09 outcomes: no negative stock, no duplicate payment effect, immutable historical price, non-authoritative browser callback, and real payment/refund revenue. This adoption chooses no gateway, tax/invoice policy, shipping policy, refund policy, schema, transaction strategy, or endpoint.
- The unresolved payment-gateway, tax/invoice, shipping, and refund-policy blocker remains a prerequisite decision for the relevant future task; it is not resolved or converted into a task by this plan.

Post-design re-check: passed. The design artifacts preserve task-owned concepts and risks without adding a data schema, API contract, provider, policy, task dependency, claim, or implementation decision.

## Project Structure

```text
specs/007-adopt-phase-09/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/phase-09-adoption.md
├── checklists/requirements.md
└── tasks.md

plan/phases/09-COMMERCE-PAYMENTS.md
apps/api/{prisma,src/modules/**,test}/
apps/app/src/app/(app)/store/**
apps/app/src/stores/{cart,wishlist}.ts
apps/dashboard/src/{app/(app),features,data}/{store,store-builder,orders,discounts,revenue}/**
packages/api-client/
```

The paths identify current product surfaces only. They neither assign task ownership nor authorize a change. Existing local store/revenue data are observed placeholders, not a Phase 09 implementation baseline.

## Preserved Roadmap Sequence

1. `F09-T01` — قرارداد catalog/SKU/price/tax/shipping/order/payment/refund.
2. `F09-T02` — migration catalog/inventory/cart/address/order/payment.
3. `F09-T03` — dashboard catalog/category/product/inventory management.
4. `F09-T04` — app browse/search/detail/wishlist/cart.
5. `F09-T05` — checkout، shipping و order snapshot.
6. `F09-T06` — stock ledger/reservation/expiry و concurrency.
7. `F09-T07` — discount usage limits.
8. `F09-T08` — payment adapter و signed/idempotent webhook.
9. `F09-T09` — fulfillment، tracking، cancellation، return/refund و reconciliation.
10. `F09-T10` — اتصال app/dashboard و Dashboard Home commerce widgets.
11. `F09-T11` — revenue از payment/refund واقعی.
12. `F09-T12` — OpenAPI/client، tests، حذف mock و evidence.

The source declares no individual `Depends on` fields or batch map. This plan retains listed order but neither manufactures hard dependencies nor declares parallel lanes, ownership, task status, or claims.

## Dependency and Boundary Risks

- **Phase-level blocker — owner decision required**: `plan/phases/09-COMMERCE-PAYMENTS.md` names payment-gateway selection, tax/invoice, shipping, and refund policy as blockers. No task that must choose among those alternatives can safely be claimed until the owner resolves the applicable policy; this adoption does not select one.
- **Contract before persistence and commerce flow**: `F09-T01` owns catalog/SKU/price/tax/shipping/order/payment/refund contract definition. `F09-T02`, `F09-T05`, `F09-T08`, `F09-T09`, and `F09-T11` must not independently freeze or diverge from it.
- **Transactional boundary**: `F09-T05` owns checkout/order snapshot, `F09-T06` owns stock ledger/reservation/expiry/concurrency, `F09-T08` owns signed/idempotent webhook, and `F09-T09` owns post-payment lifecycle/reconciliation. A future coordinator must serialize any shared order/payment/inventory transaction surface and confirm commit-before-external-side-effect behavior without merging task boundaries.
- **Idempotency boundary**: Checkout-sensitive creates, inventory reservation effects, signed payment webhooks, refunds, reconciliation, and any durable consumer need repeat-safe keys and outcomes under the engineering standards. The roadmap assigns these behaviors to their named tasks; this plan does not prescribe an implementation or identifier scheme.
- **Generated-client ownership**: The existing workflow exports runtime OpenAPI then generates `packages/api-client/openapi.json` and `src/schema.generated.ts`; generated outputs must not be hand-edited. `F09-T12` owns the Phase 09 OpenAPI/client work. Earlier tasks may define or implement their own authoritative scope, but a future batch must assign one explicit writer for OpenAPI export and generated client after the relevant endpoint set is frozen.
- **Current UI placeholder surface**: Store/cart/wishlist and dashboard store/order/revenue data currently include local placeholder state. `F09-T04`, `F09-T10`, `F09-T11`, and `F09-T12` have adjoining scopes; contract readiness and non-overlapping write sets must be frozen before source replacement. This preparation does not alter those files.
- **Order and revenue source-of-truth risk**: `F09-T10` dashboard widgets and `F09-T11` revenue must follow real payment/refund records, while `F09-T09` owns fulfillment/cancellation/return/refund/reconciliation. Browser callback data must not become authoritative, and historical price must remain immutable after mutation of catalog values.

These are source-derived coordination risks and existing engineering rules, not new dependencies or authorization to start work.
