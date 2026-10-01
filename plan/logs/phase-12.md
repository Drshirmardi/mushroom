# Phase 12 Execution Evidence

## F12-T06 — object-storage applicability review

Task ID: F12-T06
Completed at: 2026-10-01 17:45 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B03 (reduced)
Reviewed by: Codex /root

Changed files:

- `plan/contracts/phase-12-object-storage-decision.md`
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Verification:

- Source-consumer inventory across API routes/services, Prisma schema/migrations, app/dashboard/web source, workspace
  packages, dependency manifests and deployment configuration → PASS: no multipart/upload transport, presigned URL,
  object-store SDK, bucket configuration, file/attachment/media model or API-backed product consumer exists.
- Phase 10 contract/migration cross-check → PASS: chat attachment is explicitly `DEFERRED / NOT_APPLICABLE FOR MVP`;
  its persistence migration explicitly creates no attachment transport or storage.
- No-storage-infrastructure/dependency/configuration review and `git diff --check` → PASS.

Result:

- Object storage remains `N/A` for the initial release. The decision records no provider/bucket/configuration and a
  mandatory product-owner re-entry review for any future real binary consumer, including private access, validation,
  quarantine, retention/disposition, restore and secret boundaries.
- No object-storage infrastructure, dependency, schema, secret, deployment, provider contact, push or PR was added.

Batch exclusions and next action:

- `F12-T03` remains `BLOCKED` and unchecked. Docker Desktop's engine is not running and no local PostgreSQL runtime
  exists; start a local disposable runtime before running the frozen capacity profiles. A real/shared database must not
  be used as a substitute.
- `F12-T05` remains `BLOCKED` and unchecked. The project owner must obtain written Liara evidence for daily backup,
  continuous WAL/archive, restore/PITR and supported RPO/RTO. The official Liara CLI documents manual backup creation,
  listing and download only; that is insufficient for recovery acceptance.
- Do not start F12-B04 in this handoff.

## F12-T02 REWORK — lossless Sadad financial integer serialization

Task ID: F12-T02
Completed at: 2026-10-01 17:20 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B02-R1
Reviewed by: Codex /root

Corrective finding:

- The original F12-T02 adapter passed `Amount` and `OrderId` as `bigint.toString()` values into `JSON.stringify`,
  making frozen `Number`/`Number(Long)` fields quoted JSON strings. Its `response.json()` path could also coerce an
  unsafe provider financial integer before Verify performs immutable amount/order matching.

Changed files:

- `apps/api/src/modules/commerce/payments/sadad-payment-provider.adapter.ts`
- `apps/api/test/sadad-payment-provider.adapter.spec.ts`
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Verification:

- API test TypeScript compilation → PASS.
- Focused `sadad-payment-provider.adapter.spec.ts` → PASS (1 file, 4 tests). A loopback HTTP server captures raw
  request text: ordinary values and `9223372036854775807` boundaries are unquoted JSON numeric literals; unsafe
  Number coercion and int64 overflow reject before fetch. The same loopback raw Verify response preserves exact
  `OrderId` and `Amount` values through adapter financial parsing. No external Sadad request occurs.
- `@sabz-zendegi/api-client` resolver diagnosis → worktree preparation cause confirmed: dashboard's workspace junction
  targets the correct package but its ignored `dist/index.js` export was absent in this newly prepared worktree.
  `pnpm --filter @sabz-zendegi/api-client build` recreated it without source drift; dashboard test → PASS (18 files,
  61 tests) and dashboard typecheck → PASS.
- `git diff --check` and owned-path review → PASS.

Result and remaining gates:

- Fetch serialization never converts bigint to JavaScript Number; bounded integer literals remain exact on the wire.
  Fetch response parsing captures top-level financial integer literals from raw JSON before native JSON parsing can
  lose precision, then Verify converts the exact decimal text to bounded bigint.
- The correction keeps the Nest runtime transport `SADAD_GO_LIVE_BLOCKED`; it does not provision infrastructure,
  contact Sadad, expose credentials, enable/default a provider, deploy, push, or create a PR.
- The disposable workspace harness was not reasserted in this corrective run because it requires a parent
  `DATABASE_URL`, which is absent from this worktree environment. That does not reclassify the resolver as a product
  defect; its affected package build, dashboard test and typecheck were rerun successfully.

Next batch:

- `F12-B03` remains eligible and unclaimed. Do not start it in this handoff.

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
