# Implementation Plan: Adopt Phase 09 — Commerce, Inventory & Payments

**Branch**: `codex/phase-09-commerce-inventory-payments` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

## Summary

Prepare the authoritative twelve-task Phase 09 roadmap for execution with the owner-approved multi-provider
architecture and the reviewed Sadad purchase protocol. `plan/` remains the execution source of truth. This
is documentation-only preparation; it neither claims nor implements a Phase 09 task.

## Technical Context

**Language/Version**: Existing TypeScript monorepo.
**Primary Dependencies**: Existing patient app, dashboard, NestJS API, PostgreSQL integration tests,
Phase 08 outbox/retry infrastructure, OpenAPI export, generated API client, Node authenticated encryption,
and provider HTTP/crypto facilities. No real payment-provider SDK is selected by this preparation.
**Storage**: Existing PostgreSQL. `F09-T02` owns catalog, inventory, cart, address, order, provider-config
revision, encrypted credential version, payment-attempt, payment, and refund persistence after `F09-T01`
freezes the contract.
**Testing**: Targeted domain/API/PostgreSQL checks, stock/payment concurrency, provider contract tests,
sanitized Sadad crypto fixtures, callback/Verify replay, credential rotation/redaction, OpenAPI/client
freshness, and connected browser validation. The authoritative final quality/evidence boundary is `F09-T12`.
**Target Platform**: Existing patient app, administrator dashboard, and API.
**Project Type**: Existing monorepo.
**Performance Goals**: No adoption-added performance target.
**Constraints**: Commerce uses integer TOMAN; provider conversion is adapter-owned and snapshotted;
Sadad is the only real Phase 09 provider; callback is non-authoritative; Verify is idempotent and retryable;
provider/config cannot change during an attempt; automatic failover is forbidden; inventory uses a ledger or
atomic update; secrets are versioned/write-only/encrypted/redacted; provider hosts are allowlisted; shared
migrations, contracts, generated client, module wiring, and test DB have one owner per batch.
**Scale/Scope**: Twelve stable tasks, `F09-T01`–`F09-T12`; all are DONE and Phase 09 is awaiting independent
closure review only. Phase 02 and required Phase 08 job infrastructure are phase prerequisites.

## Constitution Check

*GATE: Passed before research and after design.*

- `F09-T01` is a claimed documentation-only contract batch. It changes no product code, migrations, generated
  clients or Phase 08 artifacts.
- Stable roadmap IDs and phase scope are preserved. Owner-approved architecture, source-derived Sadad
  requirements, task dependencies, acceptance boundaries, and a conservative serialized batch map are added
  to make the roadmap executable without changing completion state.
- Existing app/dashboard/API architecture and the generated-client workflow remain authoritative. Future batches must assign one owner for Prisma/migrations, OpenAPI export/generated client, contracts, authentication/module wiring, and other shared surfaces.
- ADR-0009 records the accepted provider-neutral architecture, Sadad-first scope, immutable config binding,
  TOMAN commerce boundary, no-failover routing, and authoritative Verify. Exact persistence and code remain
  task-owned.
- Commerce policy is frozen. Sadad amount unit/current protocol/version/environment, redirect, callback/date
  transport, IP/domain and credentials are `SADAD_GO_LIVE_BLOCKED`: they block real enablement and closure,
  not the `F09-T01` contract or provider-neutral work.

Post-design re-check: passed. The design artifacts add only owner-approved/source-derived boundaries and
future task detail. They do not claim the phase, write implementation, migrate data, generate the client, or
mark any roadmap task complete.

## Project Structure

```text
specs/007-adopt-phase-09/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/phase-09-adoption.md
├── contracts/payment-provider-v1.md
├── checklists/requirements.md
└── tasks.md

plan/phases/09-COMMERCE-PAYMENTS.md
plan/decisions/ADR-0009-multi-provider-payment-architecture.md
plan/contracts/commerce-payment-provider-v1.md
plan/contracts/sadad-ipg-v1.md
apps/api/{prisma,src/modules/**,test}/
apps/app/src/app/(app)/store/**
apps/app/src/stores/{cart,wishlist}.ts
apps/dashboard/src/{app/(app),features,data}/{store,store-builder,orders,discounts,revenue}/**
packages/api-client/
```

The paths identify planned product surfaces. Exact write ownership is assigned only in a future batch claim.
Existing local store/revenue data are placeholders, not a Phase 09 implementation baseline. The confidential
Sadad guide and legacy .NET sample remain external inputs and are not product source files.

## Preserved Roadmap Sequence

1. `F09-T01` — قرارداد catalog/SKU/price/tax/shipping/order/payment/refund.
2. `F09-T02` — migration catalog/inventory/cart/address/order/payment.
3. `F09-T03` — dashboard catalog/category/product/inventory management.
4. `F09-T04` — app browse/search/detail/wishlist/cart.
5. `F09-T05` — checkout، shipping و order snapshot.
6. `F09-T06` — stock ledger/reservation/expiry و concurrency.
7. `F09-T07` — discount usage limits.
8. `F09-T08` — provider registry/configuration and Sadad create/callback/Verify adapter.
9. `F09-T09` — fulfillment، tracking، cancellation، return/refund و reconciliation.
10. `F09-T10` — اتصال app/dashboard و Dashboard Home commerce widgets.
11. `F09-T11` — revenue از payment/refund واقعی.
12. `F09-T12` — OpenAPI/client، tests، حذف mock و evidence.

The detailed dependencies and default serialized batch map now live in
`plan/phases/09-COMMERCE-PAYMENTS.md`. `F09-B12/F09-T12` is accepted; no successor task is claimed before
independent Phase 09 closure review.

## Dependency and Boundary Risks

- **Sadad go-live gate**: commercial policy is frozen. Sadad amount unit/formula, active protocol/environment,
  redirect, callback/date transport, IP/domain and credentials are explicitly `SADAD_GO_LIVE_BLOCKED`; an
  unconfirmed config cannot become enabled/default or issue a real request.
- **Contract before persistence and commerce flow**: `F09-T01` owns catalog/SKU/price/tax/shipping/order/payment/refund contract definition. `F09-T02`, `F09-T05`, `F09-T08`, `F09-T09`, and `F09-T11` must not independently freeze or diverge from it.
- **Transactional boundary**: `F09-T05` owns checkout/order snapshot, `F09-T06` owns stock
  ledger/reservation/expiry/concurrency, `F09-T08` owns provider-bound attempts and authoritative Verify, and
  `F09-T09` owns post-payment lifecycle/reconciliation. Their shared state is serialized by the phase map.
- **Idempotency boundary**: Checkout, reservation, callback, Verify (`ResCode=0/100`), refund,
  reconciliation, and durable retry must be repeat-safe and create each business effect at most once.
- **Provider configuration boundary**: attempts bind immutable config revisions; credentials are write-only,
  encrypted and retained only for the approved verification/reconciliation window. Dashboard never controls
  arbitrary provider endpoints.
- **Sadad environment boundary**: production verification requires registered static egress IP, registered
  callback domain, confirmed amount unit, current credentials, current protocol/date formats, and resolution
  of the guide/sample purchase-redirect discrepancy. `plan/contracts/sadad-ipg-v1.md` is the exact field,
  endpoint and ResCode implementation reference.
- **Generated-client ownership**: The existing workflow exports runtime OpenAPI then generates `packages/api-client/openapi.json` and `src/schema.generated.ts`; generated outputs must not be hand-edited. `F09-T12` owns the Phase 09 OpenAPI/client work. Earlier tasks may define or implement their own authoritative scope, but a future batch must assign one explicit writer for OpenAPI export and generated client after the relevant endpoint set is frozen.
- **Current UI placeholder surface**: Store/cart/wishlist and dashboard store/order/revenue data currently include local placeholder state. `F09-T04`, `F09-T10`, `F09-T11`, and `F09-T12` have adjoining scopes; contract readiness and non-overlapping write sets must be frozen before source replacement. This preparation does not alter those files.
- **Order and revenue source-of-truth risk**: `F09-T10` dashboard widgets and `F09-T11` revenue must follow real payment/refund records, while `F09-T09` owns fulfillment/cancellation/return/refund/reconciliation. Browser callback data must not become authoritative, and historical price must remain immutable after mutation of catalog values.

These are accepted/source-derived coordination rules. The active authorization is the final verification-only
`F09-T12` claim recorded in `plan/STATUS.md`; it cannot expand product scope.
