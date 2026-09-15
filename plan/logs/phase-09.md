# Phase 09 Execution Evidence

## F09-T07 — discount eligibility and usage limits

Task ID: F09-T07
Completed at: 2026-09-11 19:16 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B07
Status: DONE — review gate passed

Implementation:

- Added one clinic-scoped, immutable-code discount model and additive PostgreSQL migration for immutable order-linked
  reservations. Code is NFKC/trim/uppercase canonicalized, follows `[A-Z0-9_-]{3,40}`, and fixed TOMAN or bps pricing
  is server-calculated with integer arithmetic only.
- Checkout accepts one optional canonical code, locks discount capacity with the order transaction, snapshots line/order
  discount amounts and payload, and creates its ACTIVE discount reservation only with the inventory reservation.
  Global/per-patient active-or-consumed limits, expiry, release and later consume hooks remain transactional.
- Added ADMIN-only audited list/create/update/activation endpoints, generated OpenAPI/client support, and converted
  dashboard `/discounts` from hard-coded cards to the authenticated API source of truth.
- No provider, Sadad call, amount conversion, credential, cancellation/refund/fulfillment endpoint or user-owned
  `.gitignore` change was included.

Checks completed:

- PostgreSQL migration integration → PASS (3/3): empty-database replay, idempotent non-sensitive seed and Phase-08
  upgrade through the additive migration; SQL table, code, positive-amount and order uniqueness constraints pass.
- PostgreSQL checkout integration → PASS: ADMIN authorization/audit, canonical fixed-TOMAN code, transactional
  inventory/discount reservation, immutable discounted order snapshot and canonical idempotency behavior.
- Prisma validate/generate, API typecheck, OpenAPI export/client generation and client build → PASS.
- Dashboard typecheck and production build (including `/discounts`) → PASS.
- Manual migration/schema/controller/service/diff scope review and `git diff --check` → PASS; no plaintext credentials,
  TOMAN×10 conversion, provider activation/network call, or Sadad sample/PDF path found.

Result:

- `F09-T07` is accepted for the isolated commit `feat(F09-T07): enforce commerce discount limits`.
- Next eligible batch: `F09-B08 / F09-T08`; it is not claimed or started here.

## F09-T06 — atomic inventory reservations and ledger

Task ID: F09-T06
Completed at: 2026-09-11 15:02 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B06
Status: DONE — review gate passed

Implementation:

- Checkout now reserves every order SKU in its existing PostgreSQL transaction. The conditional stock update makes
  sellable inventory (`onHandQuantity - reservedQuantity`) atomic; a short SKU rolls back the order, snapshot,
  reservations, ledger and cart clearing together.
- Added append-only, globally idempotent `RECEIPT`, `ADJUSTMENT`, `RESERVATION`, `RELEASE` and `CONSUMPTION`
  ledger operations. Existing ADMIN on-hand adjustment is serialized through this ledger and rejects a target below
  current reservation. Initial ADMIN SKU stock receives one receipt entry.
- Added internal idempotent release/consume operations and a bounded, clock-injected `SKIP LOCKED` expiry worker.
  The configurable TTL safely defaults to 20 minutes. Expiry releases exactly once and system-cancels only a safe
  `PENDING_PAYMENT` order; a verifying/reconciliation attempt stays fail-safe without release or cancellation.
- No schema or migration change was needed: F09-T02 already supplied the required reservation, ledger, FK, unique
  and stock check constraints. No provider, Sadad, outbox event, public cancellation, OpenAPI/client or UI behavior
  was added.

Checks completed:

- Real PostgreSQL `inventory-concurrency.integration.spec.ts` and
  `inventory-reservation-expiry.integration.spec.ts` → PASS (6/6): multi-checkout contention/no oversell,
  multi-SKU full rollback, idempotent release/consume and ledger entries, injected-clock expiry replay/recovery,
  ambiguous payment hold, and expiry/consume race with one terminal movement.
- Real PostgreSQL `admin-commerce-catalog.integration.spec.ts` and
  `commerce-checkout.integration.spec.ts` → PASS (2/2): initial receipt/admin adjustment audit, lower-than-reserved
  rejection, checkout snapshot/idempotency regression and atomic reservation.
- Real PostgreSQL `outbox.integration.spec.ts` → PASS (2/2): existing outbox behavior remains unchanged.
- Real PostgreSQL `migrations.integration.spec.ts` → PASS (3/3): empty replay, seed twice and final Phase 08 to
  Phase 09 upgrade. `prisma migrate status`, `prisma validate`, `prisma generate`, API typecheck/build and a
  disposable shadow-database `prisma migrate diff --from-migrations --to-schema` → PASS; drift is zero.
- Manual transaction/schema/migration/contract review, confidential-path and prohibited `TOMAN × 10` scan, and
  `git diff --check` → PASS. Accepted migrations, `providerUnit=UNCONFIRMED` and
  `SADAD_GO_LIVE_BLOCKED` remain unchanged; no credential, Sadad call, sample/PDF or user-owned `.gitignore` change
  is included.

Result:

- `F09-T06` is accepted for the isolated task commit `feat(F09-T06): add atomic inventory reservations`.
- Next eligible batch: `F09-B07 / F09-T07`; it is not claimed or started here.

## F09-T05 — idempotent checkout, shipping and immutable order snapshots

Task ID: F09-T05
Completed at: 2026-09-11 14:32 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B05
Status: DONE — review gate passed

Implementation:

- Added an additive `commerce_shipping_rates` migration and idempotent non-sensitive seed of the owner-approved
  `25,000 TOMAN` initial `COURIER` rate. It is clinic-scoped PostgreSQL configuration; `PICKUP` has no mutable
  rate and remains server-priced at zero.
- Added ADMIN-authorized, audited courier-rate API/dashboard management. A missing or inactive courier rate
  removes the option and checkout rejects it fail-closed; changes affect only newly created immutable order
  snapshots.
- Added patient-owned address CRUD, server-priced shipping options, idempotent checkout and patient order
  retrieval. Checkout snapshots line/product/price/tax/discount/shipping/address/commercial data and audits the
  accepted checkout; it neither reserves nor mutates inventory/ledger, which remains F09-T06 scope.
- Added the task-owned OpenAPI and generated client slice plus app checkout/order loading, empty, error and
  retry behavior. Neither the API nor UI sends a client-selected checkout amount.

Checks completed:

- Real PostgreSQL `commerce-checkout.integration.spec.ts` → PASS: ADMIN authorization/audit, patient address
  ownership, server-priced options, COURIER and free PICKUP checkout, idempotency/reuse conflict, historical
  snapshot integrity after catalog/address mutation, immutable snapshot trigger, no reservation/ledger mutation,
  empty cart and inactive-rate fail-closed behavior.
- Real PostgreSQL `migrations.integration.spec.ts` → PASS (3/3): clean migration replay, idempotent seed and
  Phase 08 baseline upgrade with the new additive migration and rate constraint coverage.
- `prisma validate`, `prisma generate`, migration deploy/status and a temporary shadow-database
  `prisma migrate diff --from-migrations --to-schema` → PASS; schema/migration drift is zero.
- API build/typecheck, API-client generated freshness/build/test, app and dashboard typecheck/test/production
  build → PASS. App tests: 11 files / 32 tests; dashboard tests: 12 files / 39 tests.
- Manual migration/schema/controller/OpenAPI/client/document review, credential/`TOMAN × 10` scan and
  `git diff --check` → PASS. F09-T02 migration is unmodified; no plaintext credential, real provider call,
  `.gitignore` change or Sadad sample/PDF path is included.

Result:

- `F09-T05` is accepted for the isolated task commit `feat(F09-T05): add immutable commerce checkout`.
- Next eligible batch: `F09-B06 / F09-T06`; it is not claimed or started here.

## F09-T01 — freeze قرارداد commerce و payment-provider

Task ID: F09-T01
Completed at: 2026-09-10 04:36 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B01
Reviewed by: Codex /root

Changed files:

- `plan/STATUS.md`
- `plan/phases/09-COMMERCE-PAYMENTS.md`
- `plan/contracts/commerce-payment-provider-v1.md`
- `plan/contracts/sadad-ipg-v1.md`
- `plan/decisions/ADR-0009-multi-provider-payment-architecture.md`
- `specs/007-adopt-phase-09/**`

Migrations:

- ندارد — `F09-T02` مالک schema/migration است.

Tests run:

- `git diff --check` → PASS
- Cross-document gate/money marker review across Phase 09 plan, contracts, ADR and Spec Kit → PASS
- Lifecycle/error/capability matrix review: TOMAN/IRR separation, `UNCONFIRMED`,
  `SADAD_GO_LIVE_BLOCKED`, all Sadad capability states, and stable errors → PASS
- Scope review: no `apps/**`, `packages/**`, Prisma, migration, OpenAPI/generated-client or confidential
  sample path is in this task diff; no path was staged before review → PASS
- `speckit-analyze` cross-artifact review of `spec.md`, `plan.md` and `tasks.md` against constitution → PASS
  after correcting the stale provider-refund wording in `F09-T09` to audited manual refund.

Result:

- Owner-approved tax-inclusive TOMAN/receipt-only policy, `taxAmountToman=0`, `PICKUP`/`COURIER` shipping
  snapshots, manual tracking, cancellation/return/manual-refund lifecycle, and credential crypto-shred policy
  are frozen → PASS.
- Store/commerce TOMAN is explicitly isolated from existing medical-service and appointment IRR values → PASS.
- Provider-neutral lifecycle, authorization, endpoint, money, idempotency, error and capability matrices are
  frozen for dependent tasks → PASS.
- Sadad unknown acceptance details are explicitly `SADAD_GO_LIVE_BLOCKED`; `providerUnit=UNCONFIRMED` cannot
  become enabled/default, invoke a real request, or infer `TOMAN × 10` → PASS.
- `sandbox`, `inquiry`, `webhook`, `refund` and `partialRefund` remain unsupported; no synthetic success path
  is authorized → PASS.

Known limitations:

- `SADAD_GO_LIVE_BLOCKED` remains until the owner/merchant supplies current Amount unit/formula, protocol and
  environment, redirect shape, callback Content-Type/casing, date format/timezone, registered egress IP and
  callback domain, and credential/test-environment confirmation. This blocks Sadad go-live and Phase 09 final
  closure, not provider-neutral Phase 09 implementation.

Next batch:

- `F09-B02 / F09-T02` is eligible after this task commit. It is not claimed by this batch.

## F09-T02 — commerce/payment persistence foundation

Task ID: F09-T02
Completed at: 2026-09-10 06:20 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B02
Status: DONE — review gate passed

Implementation candidate:

- one additive Phase 09 Prisma migration for catalog/category/product/SKU, TOMAN price/tax snapshots,
  inventory/ledger/reservations, cart/wishlist/address, discount foundation, immutable order snapshots,
  provider config/revision/credential-version, payment attempts/payments/refunds, FK/unique/check constraints
  and immutability/link triggers;
- non-sensitive idempotent catalog/inventory development seed only; no provider config, credential or payment
  seed data;
- PostgreSQL migration test coverage for empty replay, idempotent seed, Phase 08→09 upgrade and required
  money/stock/provider/default/config-revision/providerOrderId/duplicate-payment constraints.

Checks completed:

- `prisma validate` → PASS.
- `prisma generate` → PASS; generated client has no tracked diff.
- `tsc -p tsconfig.test.json --noEmit` → PASS.
- Manual migration SQL review → PASS for bigint TOMAN-only commerce money, no medical/appointment IRR changes,
  `UNCONFIRMED` provider-unit gate, disabled/default go-live check, immutable snapshots/revisions, encrypted-only
  credential columns and relevant FK/unique/check constraints.
- Plaintext-provider/PII/`TOMAN × 10` scan over task-owned schema, seed and migration test → PASS; the only
  marker is the frozen-contract evidence for the prohibited conversion. No Sadad sample/PDF path was read,
  staged or modified.
- `git diff --check` → PASS.

Database and review gate:

- PostgreSQL 16.14 repository connection health check → PASS; migration ledger was at final Phase 08 before the
  isolated suite began.
- `test/migrations.integration.spec.ts` with dotenv-loaded repository configuration → PASS (3/3): fresh empty
  migration replay, migration deploy plus seed twice, all Phase 09 money/stock/default/config-revision/
  providerOrderId/duplicate-payment constraints, immutable snapshots/revisions, and final Phase 08→09 upgrade.
- Shadow-database `prisma migrate diff --from-migrations --to-schema` → PASS; zero schema/migration drift.
- Final `prisma validate`, `prisma generate`, TypeScript migration-test compile and `git diff --check` → PASS.
- Final main-agent scope review → PASS: only the claimed Prisma schema/migration/seed/test and Phase 09 status/
  evidence/checklist paths are included; no API/UI/OpenAPI/client, real credential, Sadad network activity, or
  confidential sample/PDF path is included.

Result:

- `F09-T02` is accepted and ready for the isolated task commit `feat(F09-T02): add commerce payment persistence`.
- Next eligible batch after that commit: `F09-B03 / F09-T03`; it is not claimed or started here.

## F09-T03 — dashboard catalog management

Task ID: F09-T03
Completed at: 2026-09-10 20:05 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B03
Status: DONE — review gate passed

Implementation:

- ADMIN-only, audited category/product/SKU/price/inventory API with pagination, DTOs and stable commerce
  errors; product lifecycle is limited to `DRAFT → ACTIVE → ARCHIVED`.
- Integer TOMAN SKU price/tax inputs and string DTO outputs preserve the F09-T01 money boundary; no medical
  service or appointment IRR value is interpreted or changed.
- `/store` loads and mutates only the real catalog API, including loading, error, empty and retry states;
  `/store-builder` now previews only real active catalog data. Scoped local product/banner source-of-truth data
  was removed, while unsupported store-presentation behavior remains outside this task.
- The task-owned OpenAPI document, generated client types and client adapter were exported from the runtime
  document; inventory mutation now has an explicit response DTO.

Checks completed:

- PostgreSQL API integration (`admin-commerce-catalog.integration.spec.ts`) → PASS: STAFF rejection, ADMIN
  category/product/SKU/inventory mutations, invalid lifecycle and inventory validation, pagination and audit
  events. The test removes only its UUID-suffixed data after every run.
- Dashboard commerce adapter tests → PASS (4/4): real category/product loading, valid empty state, forbidden
  and unavailable state separation, bearer-authenticated generated mutation bodies and truthful failures.
- API OpenAPI runtime-versus-checked-in contract plus catalog integration tests → PASS (6/6).
- `pnpm --filter @sabz-zendegi/api-client test` and generated-client freshness → PASS.
- API typecheck, dashboard typecheck and dashboard production build (including `/store` and `/store-builder`)
  → PASS.
- Manual API/controller/DTO/OpenAPI and dashboard source-of-truth review, `git diff --check`, scoped mock scan
  and final ownership review → PASS. No plaintext credential, `TOMAN × 10`, provider activation/call, Sadad
  sample/PDF path, Prisma migration, app/cart/checkout/order/discount/reservation behavior or user-owned
  `.gitignore` change is in the task candidate.

Result:

- `F09-T03` is accepted for the isolated commit `feat(F09-T03): connect dashboard catalog management`.
- Next eligible batch: `F09-B04 / F09-T04`; it is not claimed or started here.

## F09-T04 — patient catalog, wishlist and cart

Task ID: F09-T04
Completed at: 2026-09-10 21:17 +03:30
Agent/Thread: Codex /root
Batch ID: F09-B04
Status: DONE — review gate passed

Implementation:

- Added PATIENT-only, permission-scoped catalog browse/search/detail endpoints and patient-clinic scoping;
  only ACTIVE products with an active category and at least one active SKU are visible. Prices and taxes cross
  the API boundary as integer TOMAN strings.
- Added self-scoped persisted cart and wishlist reads/mutations. SKU validation is clinic-local and active;
  cart quantities are idempotent set operations. Cart updates deliberately create no reservation and write no
  inventory ledger entry.
- Replaced in-scope app catalog, product detail, wishlist and cart source-of-truth data with authenticated
  generated-client requests and truthful loading, error, empty and retry states. Checkout, orders, addresses,
  shipping, discounts, payment/provider and Sadad work remain unmodified.
- Exported and regenerated this endpoint slice in OpenAPI/API client; no Prisma schema or migration changed.

Checks completed:

- Real PostgreSQL API integration (`patient-commerce-catalog.integration.spec.ts`,
  `patient-cart.authorization.spec.ts`) → PASS (2/2): authentication, active-catalog visibility, clinic and
  patient isolation, persisted cart/wishlist mutation, invalid input and no stock reservation/ledger write.
- API OpenAPI contract test, API typecheck, and API-client test/typecheck → PASS.
- App commerce adapter test, app typecheck and production build → PASS.
- `prisma generate`, `prisma migrate status` and `prisma migrate deploy` against repository PostgreSQL → PASS;
  all 24 migrations are applied and the schema is up to date.
- Manual controller/service/DTO/app/generated-diff review, in-scope local-catalog mock scan and
  `git diff --check` → PASS.

Review gate:

- PASS — only task-owned patient-commerce API, app store source, generated client, test and Phase 09 planning
  paths are included. No plaintext credential, `TOMAN × 10`, real provider invocation/enablement, Sadad sample
  or PDF path, migration/schema, checkout/order/discount/reservation behavior, or user-owned `.gitignore`
  change is included.

Result:

- `F09-T04` is accepted for the isolated commit `feat(F09-T04): connect patient commerce catalog`.
- Next eligible batch: `F09-B05 / F09-T05`; it is not claimed or started here.

## F09-T08 — provider-neutral payment orchestration

Task ID: F09-T08
Reviewed at: 2026-09-12 03:21 +03:30
Batch ID: F09-B08
Status: DONE — accepted for the isolated task commit

Safe work completed:

- Provider-neutral port/registry and an isolated dormant Sadad adapter declare the frozen capability matrix; a
  fake provider exists only inside the contract suite and is never registered by the production module.
  The two frozen server-to-server Sadad endpoints are code-owned allowlist constants; no generic provider URL,
  redirect shape or transport is exposed or enabled.
  `SADAD_GO_LIVE_BLOCKED` rejects enable/default, provider calls and the unauthenticated callback endpoint.
- ADMIN-only provider configuration revisions are immutable, idempotent and audited; credentials use AES-256-GCM
  with a random nonce and store only ciphertext, nonce, authentication tag and external key-version identifier.
  Responses and audit metadata remain write-only/redacted.
- The provider settings dashboard and generated API slice expose only configured state, revision, capability and
  status; no editable endpoint or raw secret is exposed.
- The additive idempotency-key migration was added without rewriting accepted Phase 09 migrations.
- Credential rotation retires the prior encrypted version without changing its immutable revision. A daily,
  unref'ed retention worker crypto-shreds only retired material older than 90 days when every dependent revision
  is inactive and all of its attempts are terminal; active or reconciliation-dependent material remains intact.

Checks completed:

- `prisma validate`, `prisma generate`, API typecheck and dashboard typecheck → PASS.
- PostgreSQL migration replay/empty database, Phase 08→09 upgrade, idempotent seed and constraint suite → PASS.
- `payment-provider-contract.spec.ts` and PostgreSQL `payment-provider-config.integration.spec.ts` → PASS;
  combined suite `migrations.integration`, provider contract and config integration: 9/9 PASS.
- `payment-credential-retention.spec.ts` and the configuration rotation integration check → PASS: status changes
  from `ACTIVE` to `RETIRED`, and the shred query permits only terminal dependencies before it nulls encrypted
  material and marks `CRYPTO_SHREDDED`.
- PostgreSQL concurrent rotation check → PASS: transaction-scoped advisory locking yields adjacent immutable
  revision numbers and exactly one current credential, without leaking either synthetic credential value.
- PostgreSQL synthetic-provider verification regression → PASS: injected internal `0` followed by `100` creates
  exactly one Payment, consumes exactly one inventory reservation, transitions the Order once to `PAID`, and
  never reaches the dormant Sadad adapter or performs a network request.
- Owner/PHP-sample evidence added to `sadad-ipg-v1`: RIAL conversion is adapter-only and overflow-guarded;
  JSON request/Verify, Tehran clock formatting, Form Data callback allowlist and all conflicting redirect
  profiles have synthetic contract coverage. These are protocol-profile evidence only; no merchant acceptance,
  transport, enabled/default provider or operational credential was added.
- Additive PostgreSQL sequence migration and concurrent allocator integration test → PASS: provider-order IDs are
  positive numeric, durable and unique under concurrent transactions, with no UUID/client-derived value.
- Synthetic Verify outcome policy coverage → PASS: `-1` records FAILED, `101` records EXPIRED and timeout records
  REQUIRES_RECONCILIATION without a Payment, PAID transition or provider failover.
- Current re-review (`2026-09-12`) → PASS: `prisma validate/generate/migrate status`, 6 targeted test files
  (16/16), OpenAPI export plus generated-client freshness/typecheck, API/dashboard typecheck, dashboard build and
  `git diff --check` all pass. Patient payment-attempt creation was called twice with one idempotency key while
  blocked: both returned `SADAD_GO_LIVE_BLOCKED` and persisted zero attempts. The confirmed adapter-only `TOMAN ×
  10` mapping has integer/overflow tests; no real Sadad request, provider enablement, plaintext credential,
  secret response/log/audit value, or confidential Sadad sample/PDF path exists in task-owned changes.
- Transport-injected orchestration re-review (`2026-09-12`) → PASS on real PostgreSQL: concurrent identical
  synthetic creates acquire a transaction-scoped advisory lock, allocate one durable numeric provider OrderId and
  call the synthetic transport once; duplicate callback and Verify `0` then `100` produce exactly one Payment and
  one inventory consume. This service has no route to invoke it and cannot activate Sadad; the public payment
  attempt and callback routes still return `SADAD_GO_LIVE_BLOCKED`.
- Callback mismatch regression (`2026-09-12`) → PASS: the reconciliation transition commits before the stable
  mismatch error is returned, so no transaction rollback can erase it; no Payment is created. Targeted PostgreSQL
  test and API typecheck pass after this correction.
- Verify guard regression (`2026-09-12`) → PASS: only `VERIFYING` attempts without an existing Payment may create
  a financial effect. A reconciliation attempt with mismatched provider OrderId/Amount is rejected and leaves the
  order without a Payment; PostgreSQL contract coverage and API typecheck pass.
- Synthetic non-success orchestration regression (`2026-09-12`) → PASS on real PostgreSQL: injected Verify
  `-1`, `101` and timeout results finish as `FAILED`, `EXPIRED` and `REQUIRES_RECONCILIATION` respectively,
  with no Payment, `PAID` transition or inventory consumption.
- Full blocked-batch verification (`2026-09-12 00:37 +03:30`) → PASS: Prisma validate/generate/migrate status;
  empty-database migration replay and Phase 08→09 upgrade/seed checks; all six targeted real-PostgreSQL suites
  (16/16); API typecheck and OpenAPI export; generated-client freshness/typecheck; dashboard typecheck/build;
  and `git diff --check`. The migration smoke runner requires its repository `DATABASE_URL` to be forwarded to
  the test process; with that normal local configuration it passes and did not expose a migration defect.

Owner decision and remaining production gate:

- On `2026-09-12`, the owner explicitly separated merchant onboarding/acceptance from software completion.
  This task is DONE because its dormant/provider-neutral criteria are evidenced above. `SADAD_GO_LIVE_BLOCKED`
  still prohibits enable/default, a real Sadad attempt, PaymentRequest/Verify transport, runtime callback and any
  production-readiness claim.
- Phase 12 now owns the unresolved current environment/endpoint profile, static egress IP, HTTPS callback
  domain/path, merchant/test credentials outside Git, controlled acceptance transaction, observed callback
  Content-Type/casing, Amount/redirect/Verify validation, monitoring/alerting and production sign-off.
  `TransactionDate` is optional/tolerant and has no financial-effect dependency.
- Final T08 re-review PASS: 6 targeted real-PostgreSQL suites (16/16), empty-database replay and Phase 08→09
  upgrade/seed, Prisma validate/generate/migrate status, API/OpenAPI, generated-client/dashboard typechecks,
  dashboard build and `git diff --check`. The Verify Token-signature fixture uses only a synthetic key.

## F09-T09 — commerce fulfillment and refunds

Task ID: F09-T09
Reviewed at: 2026-09-12 23:56 +03:30
Batch ID: F09-B09
Status: DONE — accepted for the isolated task commit

Worktree-preserving verification record:

- `prisma validate`, `prisma generate`, API typecheck, generated-client freshness/typecheck, dashboard typecheck,
  `prisma migrate deploy`, `prisma migrate status`, and a direct repository-database `SELECT 1` passed.
- The additive `20260912034000_phase_09_order_operations` migration applied successfully to the repository
  PostgreSQL target; no accepted migration was rewritten.
- The mandatory isolated migration replay did not start: `test/migrations.integration.spec.ts` connects to the
  repository-derived administrative `/postgres` endpoint to create its disposable database, then receives
  `read ECONNRESET`; its cleanup reports `Connection terminated unexpectedly`. The same failure recurred when
  the smoke suite was run alone. A combined PostgreSQL suite consequently failed downstream after the reset.
- PostgreSQL/Docker recovery review (`2026-09-13`) → PASS: the isolated empty replay, Phase 08→09 upgrade and
  idempotent seed checks pass (3/3); migration status is current. The commerce regression suite passes (16/16),
  including inventory reservation/expiry concurrency and synthetic Verify exactly-once protection. API
  typecheck/OpenAPI export, generated-client freshness/build, dashboard typecheck/build and `git diff --check`
  pass. The migration uses additive enum/table/field changes only, no provider refund route or transport exists,
  and the user-owned `.gitignore` remains excluded.

## F09-T10 — connected commerce payment experience

Task ID: F09-T10
Reviewed at: 2026-09-13 21:07 +03:30
Batch ID: F09-B10
Status: DONE — accepted for the isolated task commit

- Patient checkout now sends the persisted order ID to the payment page. Payment creation uses an idempotency
  key and no client-supplied amount/provider; `SADAD_GO_LIVE_BLOCKED` visibly stops the flow without a fake
  token, redirect, callback or successful result.
- Result, receipt and tracking re-read patient-owned API state. The minimal commerce order read model includes
  redacted tracking and refund statuses; a receipt exists only after a Payment aggregate is created by the
  accepted verification boundary and excludes provider tokens, credentials and raw callback fields.
- PostgreSQL API integration → PASS: synthetic verified payment produces the owner receipt once, a second
  patient receives 404, and the serialized receipt has no provider token. Existing blocked-attempt coverage
  confirms two Sadad attempts return `SADAD_GO_LIVE_BLOCKED` and persist no attempt.
- Dashboard `/orders` calls existing ADMIN lifecycle, tracking, cancellation/return/refund and reconciliation
  endpoints. Home uses only persisted order/reconciliation operational counts and intentionally contains no
  revenue calculation.
- Verification PASS: `prisma generate`, `migrate deploy/status`, idempotent seed, empty replay plus Phase 08→09
  upgrade/seed smoke (3/3), API typecheck, OpenAPI export/client generate/build and OpenAPI contract (6/6),
  PostgreSQL commerce checkout integration (2/2), app tests (33/33), dashboard tests (41/41), app/dashboard
  typechecks and production builds, plus `git diff --check`.

## F09-T12 — final verification gate (BLOCKED)

Task ID: F09-T12
Reviewed at: 2026-09-14 20:13 +03:30
Batch ID: F09-B12
Status: BLOCKED — no task commit

- PASS: PostgreSQL migration smoke (empty replay, Phase 08→09 upgrade and idempotent seed), `prisma validate`,
  `migrate status`, and a disposable-shadow `migrate diff` all passed with zero drift.
- PASS: all 10 targeted PostgreSQL commerce regressions (23/23) and new lifecycle coverage exercise ADMIN
  fulfillment, idempotent manual refund, completion-only evidence, audit redaction, receipt status, synthetic
  payment Verify, Sadad fail-closed behavior, provider configuration/order ids, inventory and catalog boundaries.
- PASS: API/app/dashboard typechecks; app tests (33/33), dashboard tests (43/43); API OpenAPI export and generated
  client generate/check/build/test; API and app production builds. The generated OpenAPI/client reflects the
  completion-only refund evidence contract.
- Fix verified in scope: refund action DTO now permits no evidence for approve/manual-execution; the service still
  rejects completion without `REFUND_MANUAL_EVIDENCE_REQUIRED`.
- BLOCKER: a temporary LAN-origin runtime let a disposable patient register, log in, read the persisted catalog,
  add a real seeded SKU to the cart, and reach checkout with persisted PICKUP/Courier choices. At checkout the UI
  reported its transport error and the API saw no order POST. The in-app browser cannot reach localhost, while
  its only reachable LAN origin is HTTP; this is consistent with the client-side `crypto.randomUUID()` idempotency
  key being unavailable in an insecure context. This is an environment limitation, not authorization to weaken
  production idempotency or fabricate browser evidence. Temporary configuration was restored; no provider was
  enabled or contacted.
- Chrome continuation (`2026-09-14 03:22 +03:30`): all standard repository ports are healthy (`localhost:3000`,
  `3001`, `3002`, and API `3003`; API `/v1/health/live` returns 200). Local Chrome is installed and running, but
  the available browser-automation provider lists only the in-app browser and rejects its `chrome` target. Thus
  no Chrome localhost navigation, secure-context/`crypto.randomUUID()` inspection, or Chrome console/network
  capture was possible. No LAN configuration, security control, fallback or fabricated success was added.
- Owner-provided Chrome evidence (`2026-09-14`): a manual localhost run confirmed a secure context and native
  `crypto.randomUUID`, then reached `POST /v1/patients/me/orders` with `PICKUP` and a valid idempotency key. The
  sanitized diagnosis found its cart also contained two stale disposable `EXP-*` test SKUs with zero available
  quantity; neither had an ACTIVE reservation, so the reported 409 is confirmed as
  `COMMERCE_INVENTORY_INSUFFICIENT`, not an expiry-worker or checkout transaction defect. Exact test-only cart,
  inventory, SKU, product and category artifacts were removed after read-only verification; no production inventory
  was changed or fabricated.
- Fix verification: checkout retains a cryptographically generated idempotency key for the same effective payload,
  rotates it only when shipping/address changes, and discards it only after a successful order. Stable checkout
  error codes now render explicit Persian messages; cart clearing remains success-only. Targeted real-PostgreSQL
  checkout/inventory/expiry/cart suites passed (9/9); app adapter tests passed (5/5), full app tests passed (34/34),
  app typecheck and `git diff --check` passed. The expiry worker's clock-controlled regression re-ran and left no
  `EXP-*` fixture inventory behind.
- Owner payment-boundary evidence (`2026-09-14`): a fresh retry of checkout succeeded and navigated to the
  persisted order's payment page. Its `POST /v1/patients/me/orders/{orderId}/payment-attempts` returned the
  expected `503 SADAD_GO_LIVE_BLOCKED` with no eligible provider. The app truthfully displayed that the gateway is
  not activated for acceptance and that no payment or transfer occurred. No Sadad token, redirect, successful
  Payment, provider transport, credential, cookie, raw header or personal identifier was captured in evidence.
  This is PASS for the Phase 09 fail-closed payment boundary, not a defect.
- Automated-browser groundwork (`2026-09-14`): root test-only `@playwright/test` and a Chrome-channel config were
  added without a bundled-browser download, traces, videos, HAR, storage state or screenshots. The first localhost
  test passes against system Chrome (1/1), proving hostname `localhost`, secure context and native
  `crypto.randomUUID`. The disposable multi-context patient/admin lifecycle remains required before acceptance.
- Console report: the supplied `reportAllChanges` stack lacks a project source map/path and is consistent with
  extension/DevTools instrumentation. Pending the owner's Guest/Incognito reproduction with extensions disabled,
  it is treated as third-party browser-tooling noise; no project source was changed for it.
- Safe next action: await the owner's remaining disposable localhost evidence for persistence/session refresh,
  patient-history/isolation, Dashboard cancellation-release and Console attribution. Then perform final review,
  evidence/status synchronization and the isolated `fix(F09-T12): complete commerce browser verification` commit.

## F09-T12 — final verification gate (DONE)

Task ID: F09-T12
Reviewed at: 2026-09-15 18:41 +03:30
Batch ID: F09-B12
Status: DONE — Phase 09 is `READY_FOR_REVIEW`, not closed

- Chrome-channel Playwright ran the complete localhost-only journey twice consecutively with independent Patient A,
  Patient B and ADMIN browser contexts and real PostgreSQL. Each run used a fresh run-scoped category/product/SKU/
  inventory fixture, real patient register/login, server-backed catalog/cart/checkout and a persisted Courier rate.
  It asserted `localhost`, `isSecureContext`, native `crypto.randomUUID`, cart reload, one `201` PICKUP order and
  the stable payment-page number/amount across reload and a new patient session.
- The payment boundary returned the expected `503 SADAD_GO_LIVE_BLOCKED`; the UI showed the truthful blocked message.
  Database assertions proved zero PaymentAttempt and Payment rows, with no token, redirect or non-localhost request.
  Sadad was not enabled, defaulted or contacted.
- Patient B saw no Patient A history and received `404` for direct order, receipt and payment-attempt access.
  ADMIN saw the same order in the real `/orders` UI, cancelled it through that UI, and the browser observed neither
  overlay nor project page/console error. Database assertions proved exactly one ACTIVE reservation and RESERVATION
  ledger effect after checkout, then exactly one RELEASED reservation and RELEASE effect with reserved quantity back
  to baseline after cancellation. PaymentAttempt/Payment remained zero; Patient A subsequently saw `CANCELLED`.
  The same authorized revenue query before and after was byte-for-byte unchanged.
- Fixture teardown runs in `finally`, validates exact run identity before each deletion, removes only exact
  disposable rows in FK order, and asserts no user/category/product/SKU/inventory/cart/address/order/reservation/
  ledger/payment/audit artifact remains. The two final sequential runs and a post-run database check passed; a
  separately validated orphan from an earlier failed run was also removed by exact IDs before final evidence.
- Verification PASS: `prisma validate`, `prisma generate`, `prisma migrate status`; empty replay, Phase 08→09
  upgrade and idempotent seed smoke (3/3); disposable-shadow migration diff (no difference); complete API suite
  (72 files, 320 tests); targeted real-PostgreSQL commerce/payment/inventory/expiry/catalog/revenue suites;
  app/dashboard/web tests (34/44/9), API/app/dashboard/web typechecks, API/app/dashboard/web production builds;
  OpenAPI export plus API-client generate/check/test/build; Chrome E2E twice; mock/secret/artifact review; and
  `git diff --check`.
- Review PASS: updated dashboard action handlers preserve structured status/code, render controlled Persian errors,
  refresh authoritative data on success/conflict/error, and do not allow an unhandled handler rejection to become a
  Next overlay. Refund completion remains service-enforced by `REFUND_MANUAL_EVIDENCE_REQUIRED`; the DTO only makes
  evidence optional for earlier lifecycle actions. The user-owned `.gitignore`, confidential Sadad sample/PDF/
  credential material and all provider activation/network paths remain outside the task commit.
- Spec Kit analyze/converge: no actionable Phase 09 implementation gap was found; no convergence tasks were added.
  Next action: `independent Phase 09 closure review` only.

## F09-T11 — commerce revenue reporting

Task ID: F09-T11
Reviewed at: 2026-09-13 21:24 +03:30
Batch ID: F09-B11
Status: DONE — accepted for the isolated task commit

- The ADMIN revenue API is a bounded (maximum 367 clinic-local days) direct PostgreSQL read: gross is the sum of
  `Payment.commerceAmountToman` in the persisted verified-payment aggregate; refunds subtract only when their
  own status is `COMPLETED` and their actual `completedAt` lies in the selected interval. It serializes exact
  integer TOMAN values as strings and returns the authoritative clinic timezone. It neither reads nor exposes
  callback payloads, PaymentAttempt, provider amount/unit, unpaid orders, carts, catalog prices, or credentials.
- PostgreSQL API integration → PASS (2/2): empty ranges return zero rather than synthetic revenue; two Payment records across the Asia/Tehran midnight boundary count once;
  inactive-clinic data and an unpaid order do not count; `REQUESTED`, `APPROVED`, `MANUAL_EXECUTION_PENDING` and
  `REJECTED` refunds do not subtract; two completed partial refunds subtract exactly once; ADMIN succeeds and
  STAFF is denied. Day and month bucket assertions and invalid-range rejection pass.
- `/revenue` now consumes the generated ADMIN API client and presents loading, empty, forbidden, error/retry and
  persisted chart states. The previous local revenue data source was removed; dashboard Home remains unchanged
  because it intentionally has no accepted revenue source in this task.
- Verification PASS: API and dashboard typechecks; targeted PostgreSQL integration (2/2); dashboard adapter
  tests (2/2); runtime OpenAPI export; generated client generation and check/build. No migration was needed and
  no Sadad provider was enabled, defaulted, contacted, or given credentials.

## F09-CLOSE — independent Phase 09 closure review

Reviewed at: 2026-09-15 20:05 +03:30
Baseline: `b5d3eda test(F09-T12): verify commerce payment phase`
Status: DONE (CLOSED)

- Independent commit/evidence review verified the ordered, isolated `F09-T01` through `F09-T12` commits and
  their frozen commerce TOMAN versus medical-service IRR boundary. The commercial snapshot, server-authoritative
  checkout/discount/shipping policy, inventory ledger/reservation/expiry safeguards, immutable provider revision,
  redacted encrypted credential lifecycle, Verify-only exactly-once financial effect, fulfillment/refund/
  reconciliation, owner/clinic authorization, receipt and verified-payment-minus-completed-refund revenue paths
  are covered by the fresh PostgreSQL and browser evidence below.
- Fresh verification PASS: PostgreSQL healthy; `prisma validate`, `prisma generate`, `prisma migrate status`, empty
  replay plus Phase 08→09 upgrade/idempotent seed (3/3), and an isolated disposable-shadow `migrate diff` with no
  difference. Full API suite: 72 files / 320 tests PASS. Targeted real-PostgreSQL commerce/payment/inventory/
  refund/revenue suite: 6 files / 19 tests PASS.
- Fresh integration/client/UI PASS: OpenAPI export and generated-client freshness/test/build; API/app/dashboard/web
  typechecks; API/app/dashboard/web production builds; app/dashboard/web tests (34/44/9). A fresh system-Chrome,
  localhost-only Phase 09 Playwright journey PASS (1/1): secure context/native `crypto.randomUUID`, Patient A/B
  isolation, truthful `503 SADAD_GO_LIVE_BLOCKED` with zero attempts/payments, ADMIN Dashboard cancellation,
  exactly-one reservation release/ledger effect, unchanged revenue and run-scoped cleanup.
- Post-run database assertion PASS: zero `f09e2e-*` category/product/inventory artifacts and zero enabled/default
  Sadad config. Source/artifact review found no tracked Sadad PDF/sample/credential, test trace/video/HAR/
  storage state, or active Sadad network transport. Removing the former remote web font left the verified journey
  without non-localhost requests; unrelated legacy remote assets outside this Phase 09 route are not commerce
  source-of-truth or a provider path.
- Spec Kit analyze/converge PASS: all 12 requirements map to accepted tasks and no convergence task was appended.
  A historical statement in `specs/007-adopt-phase-09/plan.md` incorrectly said that
  `SADAD_GO_LIVE_BLOCKED` blocked closure; it is now synchronized with the frozen contract, ADR and Phase 12:
  it blocks only enable/default, real request/Verify/callback runtime and production readiness. Merchant
  onboarding, static egress IP, HTTPS callback domain, credentials outside Git and controlled acceptance remain
  Phase 12 gates, not a Phase 09 closure blocker.
- Worktree review PASS: only this closure documentation and the user-owned `.gitignore` were dirty; `.gitignore`
  was neither edited nor staged. No product code, migration, generated artifact, provider activation or Phase 10
  change was made by closure review.

Next eligible work: `F10-B01 / F10-T01` only; it remains `NOT_STARTED` and unclaimed.
