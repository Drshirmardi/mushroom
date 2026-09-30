# Phase 12 Execution Evidence

## F12-T02 — Liara release path and Sadad software completion

Task ID: F12-T02
Completed at: 2026-09-30 23:06 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B02
Reviewed by: Codex /root

Changed files:

- `deploy/phase-12-liara-release.md`
- `apps/api/.env.example`, environment validation and the ignored local API `.env` template
- Sadad adapter/payment port/orchestration and focused payment tests
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Migrations, dependencies, generated API client and public API contract:

- none

Verification:

- API typecheck (including Prisma client generation) → PASS
- focused simulated Sadad adapter, payment contract and environment-validation tests: 3 files / 12 tests → PASS
- disposable PostgreSQL payment-provider configuration test → PASS; confirms encrypted revision handling and public
  callback/config enablement remain `SADAD_GO_LIVE_BLOCKED`
- disposable PostgreSQL commerce checkout test: 2 tests → PASS; confirms timeout/reconciliation, explicit same-attempt
  Verify retry, duplicate callback/Verify, mismatched amount/order and exactly one financial effect
- staged release-path and external-gate review → PASS
- `git diff --check` → PASS

Result:

- The deployment record fixes separate Liara staging/production, isolated PostgreSQL/HTTPS, immutable artifact
  promotion and owner-authorized rollback without provisioning any provider resource or performing a deployment.
- The Sadad adapter now serializes the frozen PaymentRequest and Verify protocol through a transport abstraction;
  simulated transport is explicit and test-only. The Nest-registered transport remains blocked, so an environment
  value cannot connect, enable/default, create a live attempt or accept a runtime callback.
- Non-success request results are persisted safely; request/Verify timeouts become reconciliation work and an explicit
  retry can use only the same timed-out attempt. Verify success still requires immutable order/amount/unit matching
  before the existing idempotent financial finalization.
- Merchant credentials remain only in encrypted credential revisions. The new environment entries are non-secret
  deployment controls or the external encryption-key reference; the local ignored template contains placeholders only.

Known limitations and gates:

- No real Sadad request, merchant acceptance test, static outbound-egress confirmation, credential provisioning,
  callback activation, enable/default, production deployment or release sign-off occurred. `SADAD_GO_LIVE_BLOCKED`
  remains required until all owner/merchant evidence is accepted by F12-T13.
- A full disposable-workspace test attempt stopped in the unrelated dashboard package before the API suite because its
  local resolver could not load `@sabz-zendegi/api-client`. Targeted API typecheck and all F12-T02 payment tests above
  passed; this does not represent an asserted whole-workspace PASS.

Next batch:

- `F12-B03` is eligible and unclaimed. Do not start it in this handoff.

## F12-T01 — target release, SLO, traffic profile and environment strategy

Task ID: F12-T01
Completed at: 2026-09-30 22:00 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B01
Reviewed by: Codex /root

Changed files:

- `plan/contracts/phase-12-release-envelope.md`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none

Tests run:

- release-envelope required-control traceability scan → PASS
- external-gate owner/boundary review → PASS
- no-secret/no-runtime owned-path review → PASS
- `git diff --check` → PASS

Result:

- The target release and approved F12-T02 Sadad extension are recorded without claiming payment activation or
  acceptance completion.
- Liara staging/production and manual artifact promotion/rollback are fixed; static outbound egress confirmation is
  assigned to the project owner and blocks only real Sadad connection/payment sign-off.
- Capacity, availability, RPO/RTO, secret rotation/key-readability, object-storage N/A and fail-closed Sadad rules are
  executable task inputs with owning future tasks.

Known limitations:

- Liara static outbound egress, merchant acceptance, backup/secret-store capability and monthly availability evidence
  remain future external/implementation gates. They do not block F12-T01.

Next batch:

- F12-B02 / F12-T02 remains unclaimed.
