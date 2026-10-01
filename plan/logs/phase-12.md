# Phase 12 Execution Evidence

## F12-T04 — measured query, pool and timeout review

Task ID: F12-T04
Batch ID: F12-B04
Completed at: 2026-10-02 +03:30
Agent/Thread: Codex /root
Review result: PASS; accepted and ready for its independent task commit.

Decision and scope:

- The accepted F12-T03 mixed profile (`17,990/18,000`, `99.944444%`, p95 `21.8106ms`) supplied no measured
  query, connection-pool or timeout bottleneck. This task therefore made no speculative runtime, index, datastore
  or scale-topology change.
- A new opt-in disposable-PostgreSQL regression test records `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, FORMAT JSON)`
  for the active-offerings directory, patient appointment-history and payment-reconciliation release query shapes.
  All plans completed with clinic scoping and measurable planning/execution timings; the test deliberately records
  rather than invents an unapproved performance threshold.
- The same test starts 25 concurrent short database sleeps through the application Prisma service and observes the
  existing bounded pool (configured maximum `20`) without exceeding it. A controlled `statement_timeout` cancellation
  is then required to surface, and a subsequent query proves connection recovery. This is local fault injection, not
  a production timeout setting change.

Verification, environment and review:

- `pnpm --filter @sabz-zendegi/api test:phase-12-performance` → PASS (`1` file, `2` tests; `16.28s`). The initial
  test instrumentation accidentally observed lazy Prisma promises and selected a void `pg_sleep` result; both were
  corrected before this accepted run. Neither was a product finding or used as performance evidence.
- `pnpm --filter @sabz-zendegi/api typecheck` (including Prisma generation) → PASS.
- `git diff --check` → PASS. The test-only owned-path review → PASS: one opt-in API performance test and command,
  plus coordinator-only Phase 12 checklist/status/evidence changed; no schema, migration, dependency, runtime pool,
  index, secret, provider setting or unrelated path changed.
- The test used only the run-owned local `postgres:16-alpine` container for F12-B04 on loopback with a separate
  parent database. Its generated child database was absent after cleanup. No shared/Liara/production database or
  Sadad endpoint was contacted; this evidence does not claim production or Liara capacity.

Result:

- `F12-T04` is DONE with an evidence-based no-change decision. Future changes to pool size, indexes, timeouts or
  topology require a newly measured bottleneck and applicable change control.

## F12-T03 — capacity profiles and chat acceptance

Task ID: F12-T03
Batch ID: F12-B03-R3
Completed at: 2026-10-02 +03:30
Agent/Thread: Codex /root
Review result: PASS; accepted and ready for its independent task commit.

Scope and contract correction:

- Frozen mixed acceptance is the prior durable run's `17,990/18,000` successful requests (`99.944444%`) and p95
  `21.8106ms`; it meets the authoritative `>=99%` success and p95 `<=750ms` contract. The ten 401 responses were
  caused by a test token issued before setup and rotated only by loop second; they are a harness artifact, not a
  product/capacity failure. No mixed rerun occurred.
- The harness now reads each JWT's actual integer `exp` claim and rotates the same persisted Session token with a
  30-second safety margin. The old 15-minute comment and iteration-based rotation are removed. The all-route-2xx
  condition remains only in the short preflight, not as a mixed acceptance gate.
- Boundary preflight: PASS — test TypeScript compilation plus the opt-in two-second mixed wiring run passed; all eight
  selected routes were 2xx, clinical access audits were written, a forced pre-expiry rotation issued a distinct valid
  token for the persisted Session, and its child database cleanup completed.

Frozen chat execution:

- Durable stdout: `%TEMP%/mushroom-f12-t03-chat-acceptance.log`; stderr:
  `%TEMP%/mushroom-f12-t03-chat-acceptance.log.err`.
- Exit code: `0`; Vitest: `1` file / `2` tests passed; reported duration: `2202.78s` (`2200.62s` tests).
- The accepted workload remained exact: `20 msg/s × 30 min`, a `61s` gap, then `50 msg/s × 5 min`. The test's
  per-batch `<=1000ms` assertion passed throughout. The final invariant passed: each conversation has count and
  maximum sequence both equal to `511`, so no durable sequence gap remains.
- Stderr contained one non-failing pg deprecation warning about overlapping `client.query()` execution; it did not
  alter the exit code, timing assertions or final invariants and is not treated as an acceptance failure.

Environment, review and cleanup:

- Only run-owned local PostgreSQL was used: `postgres:16-alpine`, loopback `127.0.0.1:17781`, 1 GiB / 2 CPUs and
  label `codex.task=F12-T03`. No shared/production/Liara database or Sadad endpoint was contacted; this result does
  not claim production capacity or Liara readiness.
- API typecheck (including Prisma generation) → PASS. `git diff --check` → PASS. Owned-path review → PASS: only the
  capacity commands/harnesses and coordinator-only Phase 12 status/evidence/checklist changed; no payment runtime,
  schema/migration, dependency, workflow, secret or F12-T05/T06 path changed.
- The chat child database was absent after the test cleanup; the labeled run-owned container was then stopped and its
  `--rm` removal completed. Mixed, booking-conflict and simulated-Sadad results were preserved and not rerun.

Next batch:

- `F12-B04` is not claimed or started. `F12-T05` remains independently BLOCKED pending written Liara WAL/archive,
  restore/PITR and RPO/RTO capability evidence.

## F12-T03 — serial acceptance R2 (REWORK)

Task ID: F12-T03
Batch ID: F12-B03-R2
Run: 2026-10-01 22:22–22:53 +03:30
Result: REWORK; unchecked, unclaimed, no task-completion commit.

Durable logs:

- stdout: `%TEMP%/mushroom-f12-t03-serial-acceptance.log`
- stderr: `%TEMP%/mushroom-f12-t03-serial-acceptance.log.err`

Preflight and mixed result:

- Preflight PASSed before the acceptance run: all eight selected routes were 2xx; empty clinical timeline/history
  emitted audits; rotating and post-profile tokens were verified against the persisted fixture Session; child-database
  cleanup passed. A real credential was also required by `/v1/me`; Session alone fixes the clinical audit FK but not
  current-account availability.
- Mixed executed the frozen `10 req/s × 1,800 s` profile: `18,000` requests, `17,990` success, `99.944444%`, p95
  `21.8106ms`. The threshold checks pass, but the explicit per-route all-2xx gate failed: ten `401`s appeared at
  token-expiry boundaries (`/assessments` 1, timeline 1, appointments 2, history 2, `/me` 1, directory 1,
  onboarding 1, booking-eligibility 1). Clinical audit count was `4,497` and the post-profile token was tied to the
  persisted Session.
- Exit codes: mixed `1`; chat `-1` (not started by the serial runner after mixed failed). Therefore there is no R2
  chat result for the frozen `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000ms` batches or its final
  invariants. The known prior diagnostic evidence remains preserved and is not a substitute for this acceptance run.

Correction (2026-10-02):

- The frozen mixed acceptance contract is only `>=99%` success and p95 `<=750ms`. R2's `17,990/18,000`
  (`99.944444%`) and p95 `21.8106ms` therefore PASS. The previous per-route all-2xx assertion was not an
  authoritative acceptance gate. Its ten 401s arose because the 10-minute JWT was issued before loop setup but was
  rotated only at the loop's second-600 boundary; they are a known harness artifact, not a product/capacity failure.
- F12-B03-R3 uses the token's actual JWT `exp` claim plus a safety margin, validates that boundary in a short
  preflight, and then runs only the still-unverified frozen chat workload. R2 mixed, booking-conflict and
  simulated-Sadad results are retained and are not rerun.

## F12-T03 — capacity profile execution (REWORK)

Task ID: F12-T03
Batch ID: F12-B03-R1
Executed at: 2026-10-01 18:20–21:35 +03:30
Agent/Thread: Codex /root
Review result: REWORK; unchecked, unclaimed and not committed.

Run-owned environment:

- Docker Desktop engine `28.4.0`; container `mushroom-f12-t03-postgres` on `postgres:16-alpine` / PostgreSQL `16.14`.
- Container constraints: 1 GiB memory, 2 CPUs; random loopback-only host port `17781`; label `codex.task=F12-T03`.
- Every test database was a uniquely named child of the local run-owned parent. No shared, production, Liara or Sadad
  service was contacted. Results do not demonstrate production capacity or Liara readiness.

Verification and findings:

- Harness typecheck and short preflight exercised migration, seed, authentication, selected routes and child-database
  cleanup. The preflight is explicitly non-acceptance; its opt-in two-second duration does not change the approved
  30-minute profile.
- The first durable mixed run completed `1,800` seconds and `18,000` requests, with p95 `43.78ms`, but failed at
  `20.83%` success after the initial harness omitted token rotation. That result is diagnostic only.
- After rotating the synthetic token during the profile, the second durable mixed run completed `1,800` seconds and
  `18,000` requests, p95 `48.84ms`, and `11,250/18,000` successful requests (`62.5%`): FAIL against the frozen
  `>=99%` criterion. The contract and thresholds were not changed.
- Diagnostic preflight produced: `/v1/me` → `401` (synthetic patient has no durable session); `/v1/patients/me/clinical/timeline`
  and `/v1/patients/me/clinical/history` → `503` (fixture has no clinical journey data). Assessment, onboarding,
  booking eligibility, directory and appointment-list journeys returned `200`.
- Booking conflict and simulated-only Sadad financial idempotency were independently verified on a separate disposable
  child database: `patient-appointments.integration.spec.ts` and `commerce-checkout.integration.spec.ts` → `2 files,
  8 tests PASS`. This includes one-slot conflict protection, duplicate callback/Verify, retry/reconciliation,
  mismatch rejection and exactly-one financial effect; no Sadad transport was used.
- The earlier Phase-10 chat workload has no durable final result for this run and is not accepted here. Its frozen
  `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000ms` contract remains unchanged; historical
  `1015ms`/`1032ms`, CI isolation and scheduled/manual outcome remain inputs, not a replacement execution.

Safe next action:

- Build a valid durable-session fixture and clinical timeline/history fixture for every selected authenticated release
  journey, ensure the test token is valid through the post-profile booking check, rerun the short preflight, then
  rerun only the approved mixed profile and the still-unverified frozen chat profile with durable logs. Keep F12-T03
  unchecked until those runs satisfy their frozen gates. Do not start F12-B04.

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
