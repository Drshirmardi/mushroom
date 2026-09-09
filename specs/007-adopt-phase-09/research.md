# Phase 09 Planning Research

## Decision: Preserve the Phase 09 roadmap verbatim

**Rationale**: `plan/phases/09-COMMERCE-PAYMENTS.md` defines twelve stable task IDs, UI scope, phase prerequisites, blockers, and exit criteria. `plan/STATUS.md` is the live authority for execution status.

**Alternatives considered**: Regenerating, decomposing, renaming, reordering, pre-claiming, or treating this adoption as Phase 09 progress are rejected.

## Decision: Leave commercial-policy selection unresolved

**Rationale**: The authoritative phase explicitly identifies payment gateway, tax/invoice, shipping, and refund policy as blockers. Selecting any of them would redesign the roadmap and requires owner direction.

**Alternatives considered**: Choosing a provider, assuming tax treatment, inventing delivery terms, or defining a refund policy in these documents is rejected.

## Decision: Preserve transactional and idempotency boundaries by task

**Rationale**: The roadmap explicitly assigns checkout/order snapshot to `F09-T05`, stock ledger/reservation/expiry/concurrency to `F09-T06`, signed/idempotent webhook to `F09-T08`, and fulfillment through reconciliation to `F09-T09`. Engineering standards separately require atomic or ledger-based inventory, idempotent payment webhook/consumers, and no external side effect before transaction commit.

**Alternatives considered**: Combining order, stock, payment, and refund work into one task; choosing a transaction implementation; or moving lifecycle behavior earlier is rejected.

## Decision: Retain real payment/refund revenue as the only revenue source

**Rationale**: `F09-T11` explicitly requires revenue from real payment/refund information, while phase exit criteria require commerce widgets to arise only from real transactions.

**Alternatives considered**: Continuing dashboard fixture totals, deriving authoritative revenue from browser callbacks, or accepting catalog-price aggregation as settled revenue is rejected.

## Decision: Keep generated client work single-writer and task-owned

**Rationale**: The repository’s generation command exports the runtime OpenAPI document before generating `packages/api-client` output, and its README prohibits manual generated-file edits. The roadmap assigns OpenAPI/client work to `F09-T12`; the workflow requires one coordinated owner for generated-client/shared-contract surfaces.

**Alternatives considered**: Hand-editing generated output, assigning concurrent writers, or moving generated-client ownership into a different Phase 09 task is rejected.

## Decision: Do not infer parallel lanes

**Rationale**: The source has no individual dependency graph or batch map. Shared catalog/order/payment/inventory persistence, generated client, and UI source replacement demand later coordinator-owned write-set and verification decisions.

**Alternatives considered**: Marking tasks parallel, assigning owners, or claiming `F09-T01` is rejected.
