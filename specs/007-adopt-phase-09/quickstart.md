# Phase 09 Preparation Quickstart

Live execution state is authoritative in [`plan/STATUS.md`](../../plan/STATUS.md): `F09-B01/F09-T01` is the
active documentation-only contract batch.

## Preconditions for future execution

- Phase 02 remains `DONE`, and the job infrastructure required from Phase 08 is available.
- Commerce policy is frozen: tax-inclusive TOMAN, receipt-only, pickup/courier snapshots, audited manual
  refunds, and 90-day credential crypto-shredding. Sadad acceptance facts remain `SADAD_GO_LIVE_BLOCKED`.
- Before real Sadad validation, provision a non-secret test plan plus registered static egress IP, registered
  callback domain and provider credentials outside the repository.
- Confirm the exact purchase redirect shape (`/Purchase` in the guide versus `/Purchase/Index?token=...` in
  the sample), Amount unit, protocol version, and date/time serialization before enabling the provider.
- The current coordinator has claimed only the contract-owned paths; no migration, code, generated-client or
  confidential-input work is authorized in this batch.
- Existing non-secret environment, PostgreSQL, authorized patient/dashboard actors, API contract generation, and browser validation tooling are available.

## Future task-level verification boundary

- `F09-T01`: freeze commerce policy, provider-neutral port, immutable config binding, money units,
  Sadad mapping, lifecycle/error matrix and deployment prerequisites.
- `F09-T02`: fresh migration replay and integrity checks for commerce plus config/credential revisions,
  attempts, payments and refunds; prove no plaintext secret persistence.
- `F09-T03`: dashboard authorization and management checks for catalog/category/product/inventory.
- `F09-T04`: patient browse/search/detail/wishlist/cart checks using truthful loading, error, forbidden, and empty states.
- `F09-T05`: checkout/shipping/order-snapshot coverage, including a later catalog-price mutation not changing retained order history.
- `F09-T06`: PostgreSQL-backed stock ledger/reservation/expiry and concurrent demand coverage proving no negative stock.
- `F09-T07`: discount usage-limit coverage, including repeat and concurrent use where relevant.
- `F09-T08`: provider registry/config API, write-only secret behavior, fake-provider contract test, Sadad
  exact endpoint/field mapping, durable numeric provider OrderId, TripleDES compatibility, callback transport,
  Verify `0/100`, retry, rotation, mismatch, redaction and no-failover coverage.
- `F09-T09`: authorized fulfillment/tracking/cancellation/return/refund/reconciliation lifecycle coverage.
- `F09-T10`: patient app/dashboard and Dashboard Home commerce widget connection checks against real sources.
- `F09-T11`: revenue coverage showing real payment/refund inputs and no placeholder commercial totals.
- `F09-T12`: OpenAPI export/client freshness, targeted tests, in-scope mock removal, evidence, and phase-level integrated review.

## Integrated phase gate

1. Manage catalog and inventory through the authorized dashboard, then browse and prepare the same product in the patient app.
2. Check out a permitted cart and confirm the order retains its applicable commercial snapshot.
3. Exercise competing stock demand and repeated Sadad callback/Verify; confirm stock is never negative and
   payment/order/revenue effects occur once.
4. Rotate the default/provider credentials after token creation and confirm the existing attempt still uses
   its immutable original revision.
5. Confirm callback is not authoritative, Verify amount/order must match, and ambiguous timeout becomes
   retry/reconciliation without provider failover.
6. Confirm the callback accepts the provider's acceptance-proven HTTP POST without patient session, cardholder fields are
   discarded/redacted, and only a code-owned `303` result redirect is emitted.
7. Confirm payment/refund information drives order lifecycle, reconciliation, revenue, and commerce widgets.
8. Manage the same order through fulfillment/tracking or permitted cancellation/return/refund in the dashboard.
9. Verify OpenAPI/client freshness, credential/cardholder redaction, in-scope mock removal, evidence, and all
   authoritative exit criteria.

**Pass criteria**: every Phase 09 exit criterion passes, all connected in-scope surfaces use real sources, and status/checklists/evidence change only after the authoritative review gate.

## Safety boundary

The active `F09-T01` claim authorizes only the contract documents, status and task evidence. The confidential
Sadad PDF/sample must not be committed, copied into generated artifacts, or used as a source of credentials.
Product implementation, migrations, generated-client work and Phase 08 changes remain outside this batch.
