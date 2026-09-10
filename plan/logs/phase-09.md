# Phase 09 Execution Evidence

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
