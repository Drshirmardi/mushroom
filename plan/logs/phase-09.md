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
