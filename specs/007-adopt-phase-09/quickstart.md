# Phase 09 Preparation Quickstart

This guide preserves Phase 09 validation gates only. Live execution state is authoritative in [`plan/STATUS.md`](../../plan/STATUS.md): Phase 09 is `NOT_STARTED`, and `F09-T01` is unclaimed.

## Preconditions for future execution

- Phase 02 remains `DONE`, and the job infrastructure required from Phase 08 is available.
- The owner has resolved the applicable payment-gateway, tax/invoice, shipping, and refund-policy blocker before a task needing that policy is claimed.
- A future coordinator has verified task eligibility, frozen only the relevant contract, assigned non-overlapping owned paths, selected a single writer for shared surfaces, and recorded a batch claim in `plan/STATUS.md`.
- Existing non-secret environment, PostgreSQL, authorized patient/dashboard actors, API contract generation, and browser validation tooling are available.

## Future task-level verification boundary

- `F09-T01`: contract review for catalog/SKU/price/tax/shipping/order/payment/refund without choosing unresolved policy outside owner direction.
- `F09-T02`: fresh migration replay and persistence/integrity checks for its named migration scope.
- `F09-T03`: dashboard authorization and management checks for catalog/category/product/inventory.
- `F09-T04`: patient browse/search/detail/wishlist/cart checks using truthful loading, error, forbidden, and empty states.
- `F09-T05`: checkout/shipping/order-snapshot coverage, including a later catalog-price mutation not changing retained order history.
- `F09-T06`: PostgreSQL-backed stock ledger/reservation/expiry and concurrent demand coverage proving no negative stock.
- `F09-T07`: discount usage-limit coverage, including repeat and concurrent use where relevant.
- `F09-T08`: adapter/webhook signature, authorization, replay/idempotency, and non-authoritative browser-callback coverage.
- `F09-T09`: authorized fulfillment/tracking/cancellation/return/refund/reconciliation lifecycle coverage.
- `F09-T10`: patient app/dashboard and Dashboard Home commerce widget connection checks against real sources.
- `F09-T11`: revenue coverage showing real payment/refund inputs and no placeholder commercial totals.
- `F09-T12`: OpenAPI export/client freshness, targeted tests, in-scope mock removal, evidence, and phase-level integrated review.

## Integrated phase gate

1. Manage catalog and inventory through the authorized dashboard, then browse and prepare the same product in the patient app.
2. Check out a permitted cart and confirm the order retains its applicable commercial snapshot.
3. Exercise competing stock demand and payment notification replay; confirm stock is never negative and no payment effect duplicates.
4. Confirm browser callback is not authoritative and payment/refund information drives order lifecycle, reconciliation, revenue, and commerce widgets.
5. Manage the same order through fulfillment/tracking or permitted cancellation/return/refund in the dashboard.
6. Verify OpenAPI/client freshness, in-scope mock removal, required evidence, and all authoritative exit criteria.

**Pass criteria**: every Phase 09 exit criterion passes, all connected in-scope surfaces use real sources, and status/checklists/evidence change only after the authoritative review gate.

## Safety boundary

Do not run this guide as authorization to begin `F09-T01`. Claims, implementation, migrations, generated-client work, Phase 08 changes, plan status changes, and evidence entries remain outside this preparation.
