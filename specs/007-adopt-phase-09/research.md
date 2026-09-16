# Phase 09 Planning Research

## Decision: Preserve the Phase 09 roadmap verbatim

**Rationale**: `plan/phases/09-COMMERCE-PAYMENTS.md` defines twelve stable task IDs, UI scope, phase prerequisites, blockers, and exit criteria. `plan/STATUS.md` is the live authority for execution status.

**Alternatives considered**: Regenerating, decomposing, renaming, reordering, pre-claiming, or treating this adoption as Phase 09 progress are rejected.

## Decision: Use provider-neutral payments with Sadad as the first provider

**Rationale**: The owner explicitly requires multi-provider support, dashboard configuration, and Sadad as
the first and only real Phase 09 provider. ADR-0009 keeps commerce/order/payment orchestration independent of
Sadad while avoiding speculative implementation of a second gateway.

**Alternatives considered**: Direct Sadad coupling, implementing several real gateways now, patient gateway
selection, priority routing, and automatic failover are rejected for this phase.

## Decision: Bind every attempt to an immutable provider-configuration revision

**Rationale**: Changing default provider, TerminalId, MerchantId, TerminalKey, mode, or credential must not
change the meaning or verification path of an earlier attempt. A mutable config foreign key does not preserve
this invariant.

**Alternatives considered**: Storing only `providerCode`, binding a mutable config row, or copying raw secrets
onto each attempt are rejected.

## Decision: Keep commerce in integer TOMAN and provider units explicit

**Rationale**: The owner chose TOMAN for product-facing commerce. The Sadad guide calls the request field
`Amount` but names neither IRR nor TOMAN, so Sadad conversion cannot yet be frozen. Both commerce amount and
exact provider amount/unit must be retained on the attempt.

**Alternatives considered**: Ambiguous `amount`, floating point, or hardcoded TOMAN×10 without current
provider confirmation are rejected.

## Decision: Treat Sadad callback as a trigger for authoritative Verify

**Rationale**: The official guide defines HTTP POST callback followed by server-side Verify and prohibits
service delivery before successful Verify. It instructs retry when Verify has no response and states that an
unverified successful transaction is automatically returned after 15 minutes. Verify `ResCode=0` and
repeat-success `ResCode=100` are final success outcomes.

**Alternatives considered**: Marking payment paid from callback, calling the callback a signed webhook,
switching provider after timeout, or treating the 15-minute automatic return as a merchant refund are rejected.

## Decision: Freeze a separate Sadad protocol contract before implementation

**Rationale**: The official guide defines PaymentRequest and Verify server endpoints, required fields,
form-POST callback fields, unique numeric-long OrderId, limited Token lifetime and ResCode behavior. It does
not state the Amount unit or exact Token query shape for the purchase redirect. The legacy .NET sample uses
`/Purchase/Index?token=...` while the guide names `/Purchase`; therefore
`plan/contracts/sadad-ipg-v1.md` records exact known behavior and fail-closed confirmation gates.

**Alternatives considered**: Treating the sample redirect as authoritative, assuming Rial from convention,
using the internal Order UUID, accepting JSON-only callback, or copying every callback/cardholder field into
persistence are rejected.

## Decision: Use the legacy .NET sample only as a compatibility reference

**Rationale**: The sample confirms request/Verify fields and TripleDES/ECB/PKCS7 behavior, but stores
credentials in a cookie, accepts arbitrary gateway URLs, uses random order IDs instead of a durable unique
provider-order sequence, exposes exception detail,
enables obsolete transport behavior, and has no durable idempotency. Only sanitized protocol fixtures may be
derived from it.

**Alternatives considered**: Porting the controller line-by-line or committing the full confidential sample
into product source are rejected.

## Decision: Keep provider configuration secure and dashboard-manageable

**Rationale**: Dashboard management requires persisted credential changes, while the guide marks all
merchant information confidential. Config changes create immutable revisions; credentials are write-only,
authenticated-encrypted with a key outside PostgreSQL, redacted, and audited. Provider endpoints are adapter
allowlists, not editable URL fields.

**Alternatives considered**: Plaintext database values, readable secret APIs, environment-only credentials
that dashboard cannot rotate, and arbitrary endpoint input are rejected.

## Decision: Freeze commerce policy and isolate external Sadad uncertainty

**Rationale**: The owner approved tax-inclusive TOMAN pricing with `taxAmountToman=0`, receipt-only (not a
formal tax invoice), pickup/courier shipping snapshots, manual ADMIN tracking, audited case-by-case manual
refund, and 90-day post-terminal credential crypto-shredding. Sadad Amount/formula, protocol/environment,
redirect, callback transport/date format, deployment identity and credentials remain `SADAD_GO_LIVE_BLOCKED`:
they stop enablement, real calls, acceptance validation and phase closure, not `F09-T01` or provider-neutral
commerce implementation.

**Alternatives considered**: Inventing an Amount conversion, treating automatic reversal as refund support,
or allowing an unconfirmed Sadad config to become enabled/default are rejected.

## Decision: Preserve transactional and idempotency boundaries by task

**Rationale**: The roadmap assigns checkout/order snapshot to `F09-T05`, stock
ledger/reservation/expiry/concurrency to `F09-T06`, provider-bound create/callback/Verify to `F09-T08`, and
fulfillment through reconciliation to `F09-T09`. Engineering standards require atomic or ledger inventory,
idempotent consumers, and no external side effect before transaction commit.

**Alternatives considered**: Combining order, stock, payment, and refund work into one task; choosing a transaction implementation; or moving lifecycle behavior earlier is rejected.

## Decision: Retain real payment/refund revenue as the only revenue source

**Rationale**: `F09-T11` explicitly requires revenue from real payment/refund information, while phase exit criteria require commerce widgets to arise only from real transactions.

**Alternatives considered**: Continuing dashboard fixture totals, deriving authoritative revenue from browser callbacks, or accepting catalog-price aggregation as settled revenue is rejected.

## Decision: Keep generated client work single-writer and task-owned

**Rationale**: The repository’s generation command exports the runtime OpenAPI document before generating `packages/api-client` output, and its README prohibits manual generated-file edits. The roadmap assigns OpenAPI/client work to `F09-T12`; the workflow requires one coordinated owner for generated-client/shared-contract surfaces.

**Alternatives considered**: Hand-editing generated output, assigning concurrent writers, or moving generated-client ownership into a different Phase 09 task is rejected.

## Decision: Default to serialized roadmap batches

**Rationale**: Shared catalog/order/payment/inventory persistence, generated client, module wiring, and test
database make early parallelism unsafe. The authoritative phase now records explicit dependencies and one-task
default batches; a future coordinator may open parallel lanes only after contract/write-set isolation.

**Alternatives considered**: Pre-declaring parallel implementation or claiming `F09-T01` during planning is
rejected.
