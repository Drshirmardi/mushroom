# Phase 12 Execution Evidence

## F12-T06-S1 — local real R2 product media acceptance

Completed/reviewed: 2026-10-14 UTC; batch F12-MEDIA-S01; coordinator/reviewer Codex /root, one agent. Baseline front / e49e615eac1a18cd045121c4695d534d3fd41a26, initially clean. Dependencies backend44d472e/dashboarde49e615 accepted. Explicit owner authorization covers disposable local development CRUD in dev-sabz only; ADR-0015 and frozen-contract addenda record this subsequent permission without rewriting historical release decisions. No Phase04C, deployment, bucket configuration or production activation.

### Environment and credentials

- Existing Docker sabz-zendegi-postgres-1 / PostgreSQL16.14 at localhost5432 retained. Original development database had35 migrations and lacked the media migration; it was never migrated, reset or seeded. Created only mushroom_r2_smoke_1065e55bc20f, deployed all36 existing migrations and ran existing development seed there. Used the owner-provided synthetic admin identity only in that disposable database.
- Existing API dev command ran on127.0.0.1:3003; existing Dashboard Next dev command with --hostname127.0.0.1 --webpack on3002. API live/ready and Dashboard/store returned200. Process-local overlay selected scratch DATABASE_URL, development mode and disabled SMS/payment transports; no tracked default activation changed.
- R2 keys already existed in ignored/untracked apps/api/.env; validated endpoint/account, bucketdev-sabz, regionauto and moder2 without displaying keys. Dashboard environment contained no R2 credentials. Task overlay and fixtures were also ignored/untracked; no secret entered tracked config, clients or browser. Credentials were passed in memory, never extracted into stdout.
- Existing R2ProductImageStorage initialized successfully; DNS/TCP443/TLS and SDK HeadBucket returned200. Real put/read/delete proved the credentials' required operations on dev-sabz. Exclusive token-policy scope beyond this bucket was not inspected, and no other bucket was accessed.
- Owner attested Public Development URL and every Custom Domain disabled. Unsigned path-style and virtual-host S3 requests returned400 InvalidArgument while a task object existed; no anonymous bytes were returned. This is the observed response, not a claimed403 or independent Cloudflare control-plane privacy audit. No public access/settings were enabled or modified.

### Real browser/application evidence

Playwright MCP removed previous mock routes and used the actual local Dashboard, API and R2. Product09b2057e-e55f-4d81-b9f3-9aafe18e30e5 / r2-smoke-1065e55bc20f was created through the Dashboard in the synthetic development clinic.

1. Uppy uploaded a2,886,499-byte1200×800 PNG through the editor; PUT200, imagec3feefb9-4b95-42b1-b227-d88cd59adefe and matching quoted ETag. Persisted image READY; existing adapter HeadObject200 and read matched Prisma size658,188. Sharp outputWebP1200×800 without EXIF/ICC/XMP. Authenticated preview200 matched the R2 SHA-256 04268832ff67e5a065e67e76c2bb6db1703eb70bc77fc4c1a4c753ace43f1bc3.
2. Draft public delivery404. Added an active disposable SKU via existing admin endpoint201 and published the fixture200; public delivery200 with bytes identical to authenticated preview. No real patient or production records used.
3. Uppy replacement200 with If-Match of the first generation, new ETag/image8c4a1a28-19c9-41f7-b853-de69970775a6;2000×1200 input became1600×960 WebP /2,812 bytes. Old public generation immediately404; old R2 object eventually404 through normal outbox.
4. Invalid PNG content reached the real API and returned422 with the expected Persian error; current image retained. SVG rejected by Uppy before upload. No unsupported format was accepted.
5. Safely simulated a lost response after a successful real PUT using Playwright route.fetch followed by abort; backend/R2 committed normally. UI offered explicit same-operation retry. Replay200 returned the same image531101f6-f30c-455d-b62e-4175fd18088b, same idempotency key and original If-Match. Real progressbar observed; UI success awaited server confirmation. No database/storage outage injection.
6. Valid multipart request with fresh operation key and stale If-Match returned412 / COMMERCE_IMAGE_REVISION_CONFLICT. Unauthenticated private preview401; authenticated access to a scratch product in another inactive clinic404.
7. Dashboard removal204 / ETag "none" with the current generation's If-Match. Exact DELETE replay204; public route immediately404; editor displayed its no-image fallback.

### Cleanup, verification and issues

- Existing outbox worker completed all six COMMERCE_PRODUCT_IMAGE_CLEANUP events, each DELIVERED on attempt1. No deadline/queue mutation or direct diagnostic deletion. Existing adapter HeadObject returned404 for all three recorded object identities; Prisma image rows for the fixture were0. No unrelated object was listed/deleted.
- API focused storage/processor/configuration tests:3 files /13 PASS. Dashboard controller/API/catalog tests:3 files /24 PASS. API build/Prisma generation and live watcher compilation passed; native Windows Sharp executed successfully. No code changes justified additional generated-contract rebuilds or broad audits.
- Initial diagnostic commands encountered shell/Node stdin quoting and crypto binding issues; corrected only diagnostic execution. Corepack/network and local socket sandbox restrictions required normal approved execution outside the sandbox. No application runtime fix was made.
- Two attempts to replay raw browser multipart request buffers through APIRequestContext returned500 and were discarded as invalid harness evidence; they are not proof of contract replay/conflict behavior. Subsequent actual Uppy same-intent replay200 and correctly constructed multipart stale-version412 establish those checks. Browser selection timing/retained-file restriction was handled by waiting and clearing selection through the existing UI; no upload code changed.
- Automatic review rejected credential stdout extraction and broad Chrome debugging/profile enumeration. Neither executed; continued using owner-supplied credentials and the existing isolated MCP browser, with no profile enumeration or credential stdout workaround.
- Owned API/Dashboard processes stopped and ports3002/3003 released. Dropped only the guarded, task-owned scratch database after R2 cleanup. Removed guarded ignored task overlay/fixtures. Original database remained35 migrations with zero media migration; Docker PostgreSQL and original apps/api/.env preserved.

Main-agent review: scope, frozen contract, real evidence, cleanup, secret handling and remaining limits PASS. Only five governance/evidence documents changed; no application code, database schema/migration, dependency, generated client or architecture change. Diff gate passed before the independent task commit. Local development acceptance DONE; exclusive IAM-policy/control-plane audit, Linux container Sharp execution, production activation and independent Phase12 blockers remain separate. Phase04C is eligible for its separate instruction/claim and has not started.

## F01-R06-B — OTP authentication and session integration

Task ID: `F01-R06-B`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F01-B06-B`
Reviewed by: `Codex /root`

Changed files:

- `apps/api/src/modules/identity/application/{otp-authentication,session-issuer}.use-case.ts`
- `apps/api/src/modules/identity/presentation/http/{auth.controller.ts,dto/otp.dto.ts}` and identity wiring
- checked-in OpenAPI and generated TypeScript client

Tests run:

- PostgreSQL integration: request → verify → passwordless patient/profile/session result, second verify rejection and two-request concurrency → PASS.
- password login/register/session regression (18 tests) and API test typecheck → PASS.
- OpenAPI export plus `openapi-typescript --check` → PASS.

Result:

- public request/resend/verify endpoints are Origin validated, idempotent/rate-limited and do not reveal code or account existence;
- verifier is context-bound HMAC-SHA-256, challenges expire/lock/supersede/consume explicitly and only one concurrent verify succeeds;
- existing users and newly provisioned OTP-only patients receive the same access/refresh session contract; no fake Credential is created.

Known limitations:

- browser/provider acceptance remains in `F01-R06-C`; integration used an internal fake delivery seam and sent no external SMS.

Next batch:

- `F01-B06-C` — web/dashboard UX and deployment evidence.

## F01-R06-A — SMS provider foundation and administration

Task ID: `F01-R06-A`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F01-B06-A`
Reviewed by: `Codex /root`

Changed files:

- `plan/contracts/otp-sms-auth-v1.md`, `plan/decisions/ADR-0014-passwordless-otp-sms-boundary.md`
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261011100000_otp_sms_auth/migration.sql`
- `apps/api/src/modules/communications/sms/**`, runtime/deployment secret contracts and `farazsms@1.1.0`

Tests run:

- Prisma schema format/validate and PostgreSQL 16 full migration replay (34 migrations) → PASS.
- `sms-otp-security.spec.ts`, environment/origin regression and API test typecheck → PASS.
- release pipeline, VPS dev/release behavior, shell syntax and `git diff --check` → PASS.

Result:

- only the real FarazSMS adapter is registered; transport defaults to disabled and external calls require explicit live runtime;
- SMS credentials are write-only, independently AES-256-GCM encrypted and revisioned; ADMIN controls provider state, policy, tests and safe logs;
- new dev secrets are generated on the VPS without entering Git/logs, while release environments still require managed secret files.

Known limitations:

- no real provider credential or SMS was used; live activation remains an explicit ADMIN operation after setting runtime live.

Next batch:

- `F01-B06-B` — OTP engine, public auth and generated client.

## F12-T02-R19 — shared-dev Next watcher warm-up corrective

Task ID: F12-T02-R19
Batch ID: F12-B02-R19
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- `mushroom-dev-app-1` repeatedly started `Next.js 16.3.8 (Turbopack)` and first compilation of `/` took 6.7–7.1
  seconds, while both Docker healthchecks and deployment curl probes had a five-second limit.
- The workflow therefore issued overlapping, aborted root requests and declared the app unavailable before its first
  development compile could complete.

Changed files:

- `deploy/vps/compose.dev.yaml`, `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- dev watcher startup timeout/cadence contract → PASS
- `bash scripts/test-vps-dev.sh` → PASS across first, unchanged, dependency, API-only, frontend-only and lock-contention syncs
- `pnpm release:test` → PASS
- targeted `git diff --check` for task-owned files → PASS

Result:

- **PASS / DONE.** Docker healthchecks were removed only from the three persistent Next development watchers; they
  previously caused parallel first-route compilation. The deployment's existing ordered probes remain authoritative.
- Web, app and dashboard readiness probes now allow 30 seconds, enough for observed 6–7 second initial Turbopack
  compilation without retry pressure. API readiness remains unchanged at five seconds.
- A failed probe now prints the container restart count, OOM flag, exit code and health state before its logs.

Known limitation:

- This eliminates the demonstrated short-timeout and concurrent-warm-up failure. If the app still restarts, the next
  workflow output will identify whether it is an OOM kill; live confirmation requires pushing the corrective to `dev`.

Next work:

- No new batch is claimed; continue Phase 12 according to its eligible task map after live confirmation.

## F12-T02-R18 — shared-dev synchronization corrective

Task ID: F12-T02-R18
Batch ID: F12-B02-R18
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- Rsync reported `cannot delete non-empty directory: apps/api/src/generated` while preserving its excluded Prisma
  child generated on the server.
- The newly dispatched workflow then failed with `another dev sync is active` because the previous remote deployment
  still held the kernel lock after GitHub dispatched the next run.

Changed files:

- `.github/workflows/dev-sync.yml`, `.github/CI.md`
- `scripts/deploy-dev-vps.mjs`
- `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- real lock contention simulation: second deployment waits and then completes → PASS
- first, unchanged, dependency, API-only and frontend-only dev sync simulations → PASS
- generated API directory preservation contract → PASS
- `pnpm release:test` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** Shared-dev GitHub runs are queued instead of canceling a remote deployment mid-flight. A new
  runner waits up to 600 seconds for the server lock before source upload, and the deployment repeats the bounded
  lock acquisition defensively before mutation; the kernel lock remains the single-writer guard.
- Rsync excludes the complete ignored `apps/api/src/generated/` directory, matching the repository's generated-file
  boundary and preventing parent-directory deletion warnings.
- No lock file is deleted and no concurrent deployment bypass is introduced.

Known limitation:

- If a genuinely running deployment holds the lock for more than ten minutes, the new run fails explicitly rather
  than risking concurrent mutation. Live confirmation requires pushing the corrective to `dev`.

Next work:

- No new batch is claimed; continue Phase 12 according to its eligible task map after live confirmation.

## F12-T02-R17 — absolute shared-dev build-context corrective

Task ID: F12-T02-R17
Batch ID: F12-B02-R17
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- The dev workflow reached `mushroom-dev-runtime:local Building` and then BuildKit failed with
  `resolve : lstat /home/***/mushroom/***: no such file or directory` before it could load `Dockerfile.dev`.
- The masked path was the dev environment root rather than its synced `workspace`, proving the relative `../..`
  context was resolved against a different Compose project directory on the VPS.

Changed files:

- `deploy/vps/compose.dev.yaml`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- rendered Docker Compose config resolves bootstrap build context to the supplied absolute workspace → PASS
- `bash scripts/test-vps-dev.sh` → PASS across first, unchanged, dependency, API-only and frontend-only syncs
- `pnpm release:test` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** The runtime image build now uses the same absolute `DEV_WORKSPACE_PATH` already checked against
  `$HOME/mushroom/dev/workspace` by the deployment boundary.
- Image rebuilds no longer depend on the SSH login directory or Docker Compose relative project-directory behavior.
- No runtime environment, secret, database, Caddy, port, staging or production-sim setting changed.

Known limitation:

- Live confirmation requires pushing this corrective to `dev` and observing the next shared-dev workflow.

Next work:

- No new batch is claimed; continue Phase 12 according to its eligible task map after live confirmation.

## F12-T02-R16 — incremental shared-dev sync corrective

Task ID: F12-T02-R16
Batch ID: F12-B02-R16
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `.github/CI.md`
- `scripts/deploy-dev-vps.mjs`
- `deploy/vps/deploy-dev.sh`, `deploy/vps/dev-service.sh`, `deploy/vps/README.md`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `bash scripts/test-vps-dev.sh` → PASS across first, unchanged, dependency, API-only and frontend-only syncs
- `pnpm release:test` → PASS
- shell/Node syntax and `git diff --check` → PASS

Result:

- **PASS / DONE.** The three Next.js services remain genuine persistent `next dev` servers with bind-mounted source
  and HMR. An unchanged or frontend-only push skips bootstrap and all container recreation.
- Dependency installation, API-client build, Prisma generation/migration, runtime-config generation and bounded API
  transpilation are independently fingerprinted. API recreation happens only when its emitted runtime changes.
- Rsync compares content and preserves server-generated Prisma/API-client/API outputs plus environment-specific public
  runtime configuration instead of deleting or retransmitting them from each fresh GitHub runner.

Known limitation:

- GitHub-hosted runner allocation and SSH startup remain fixed external latency. The VPS path no longer performs
  unrelated builds, but it is intentionally not a server-side `git pull` because that would require a repository
  deploy credential on the VPS.

Next task in the active batch:

- `F01-R08` remains claimed for the browser hydration/runtime-config corrective.

## F12-T02-R15 — shared-dev API compiler/runtime isolation corrective

Task ID: F12-T02-R15
Batch ID: F12-B02-R15
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- Live cgroup evidence confirmed the API container exceeded its `1g` limit: `oom=2`, `oom_kill=2`, Docker health was
  `unhealthy`, restart count was `16`, and `OOMKilled=true`.
- The earlier low-memory compiler still remained concurrently resident with the Nest runtime. Current memory after
  the kill was only about `90 MiB`, which represented the surviving wrapper/compiler state rather than peak usage.

Changed files:

- `deploy/vps/dev-service.sh`
- `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- clean bounded TypeScript emit at `640 MiB` → PASS; Nest decorator metadata retained in 111 emitted files
- `pnpm release:test` → PASS
- `bash scripts/test-vps-dev.sh` → PASS, including source-only API recreation without frontend recreation
- shell/Node syntax and `git diff --check` → PASS

Result:

- **PASS / DONE.** Every Git sync now performs migration, optional seed and one bounded API compilation inside the
  one-shot bootstrap container. The persistent API container runs only `dist/main.js`; no TypeScript compiler or
  compiler watcher shares its `1g` cgroup.
- A source-only sync recreates only API after bootstrap completes. Dependency/runtime changes retain the existing full
  service recreation, while Next development watchers remain persistent on ordinary source updates.

External next action:

- Push the corrective to `dev`. The changed runtime fingerprint forces replacement of the existing unhealthy API
  container. No manual server configuration or container deletion is required.

## F12-T02-R14 — low-memory shared-dev API compiler corrective

Task ID: F12-T02-R14
Batch ID: F12-B02-R14
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- After the heap-only R13 corrective, the API readiness endpoint still repeatedly reset the connection while the
  PostgreSQL and frontend containers remained running. Raising the compiler heap alone did not make the shared VPS
  runtime stable and increased the risk of exhausting the existing `1g` container envelope.
- The API dev runner was performing full semantic checking and declaration/declaration-map emission twice at startup:
  once before launch and again when the persistent compiler watch initialized. CI and normal API builds already own
  full typechecking, while shared dev only needs correct JavaScript emission and Nest decorator metadata.

Changed files:

- `apps/api/scripts/dev.mjs`
- `apps/api/test/dev-runtime.spec.ts`
- `deploy/vps/deploy-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- clean TypeScript emit with `--max-old-space-size=640 --noCheck --declaration false --declarationMap false` → PASS
- emitted Nest `design:paramtypes` metadata → PASS (111 files)
- focused API dev-runtime test → PASS (1 file / 3 tests)
- normal API build with full TypeScript checking → PASS
- `pnpm release:test` (including simulated VPS sync) → PASS
- Node/shell syntax and `git diff --check` → PASS

Result:

- **PASS / DONE.** The initial and persistent dev compilers now perform transpile-only emission at a lower heap ceiling
  while retaining the official TypeScript compiler and decorator metadata required by Nest dependency injection.
  Normal CI/build typechecking is unchanged.
- A readiness timeout now emits `docker compose ps` plus the failing service's last 200 log lines, so a future failure
  is actionable directly from GitHub Actions instead of appearing only as repeated curl resets.

External next action:

- Push the corrective to `dev` and rerun `Sync shared dev VPS`. No runtime.env, secret, database, Caddy or port change
  is required.

## F12-T02-R13 — shared-dev API compiler heap corrective

Task ID: F12-T02-R13
Batch ID: F12-B02-R13
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- The API container stayed below its Compose memory limit (`oom=false`) but restarted seven times while readiness on
  host port `3303` returned empty/reset connections.
- The API log terminated inside V8 with `JavaScript heap out of memory` near a `512 MiB` old-space ceiling. This was
  the initial TypeScript compilation run by `apps/api/scripts/dev.mjs`; PostgreSQL remained healthy.

Changed files:

- `apps/api/scripts/dev.mjs`
- `apps/api/test/dev-runtime.spec.ts`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- focused API dev-runtime test → PASS (1 file / 3 tests)
- API build (`tsc -p tsconfig.build.json`) → PASS
- `node --check apps/api/scripts/dev.mjs` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** Initial and watch-mode TypeScript compiler subprocesses now receive a `768 MiB` V8 old-space
  ceiling. The Nest runtime, Compose `1g` API memory limit, other services, database, secrets and release environments
  are unchanged.

External next action:

- Push the corrective to `dev` and rerun `Sync shared dev VPS`. No manual server configuration change is required.

## F12-T02-R12 — shared-dev secret mount name corrective

Task ID: F12-T02-R12
Batch ID: F12-B02-R12
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- After the dev build context was corrected, the runtime image built and the isolated PostgreSQL container became
  healthy. The one-shot bootstrap then stopped at `/run/secrets/DATABASE_URL is not readable`.
- Compose mounts the declared `database_url` secret at `/run/secrets/database_url`; the shared dev loader used the
  upper-case environment-variable name as the filename. The same mismatch affected JWT, refresh pepper and both
  payment-key secrets that API startup would read next.

Changed files:

- `deploy/vps/dev-service.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `pnpm release:test` → PASS, including the lower-case file-secret mapping contract
- `bash scripts/test-vps-dev.sh` → PASS
- `bash -n deploy/vps/dev-service.sh` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** The loader lowercases only the mounted filename while retaining the existing upper-case exported
  environment variable. No secret value, host permission, database state, staging or production-sim path changed.

External next action:

- Push the corrective to `dev` and observe the next `Sync shared dev VPS`. The already-created isolated PostgreSQL
  container and volume are safe to retain; bootstrap will continue idempotently.

## F12-T02-R11 — shared-dev build-context and Caddy corrective

Task ID: F12-T02-R11
Batch ID: F12-B02-R11
Completed at: 2026-10-09 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- After the port collision was corrected, both the main-carried update and a later `dev` push reached the runtime
  image build, then stopped with `resolve : lstat /home/<user>/mushroom/<path>: no such file or directory`.
- `deploy-dev.sh` passed `--project-directory "$workspace"` while `compose.dev.yaml` already used a file-relative
  `context: ../..`. Compose therefore resolved the context two levels above the synced workspace and looked for the
  Dockerfile in a nonexistent host path.
- The live reverse proxy is Caddy, not Nginx; its four dev upstreams still referenced the old `3200–3203` range.

Changed files:

- `deploy/vps/deploy-dev.sh`, `deploy/vps/README.md`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- rendered dev Compose JSON resolves `services.bootstrap.build.context` exactly to the repository/workspace root →
  PASS
- `pnpm release:test` → PASS
- `bash scripts/test-vps-dev.sh` → PASS
- `bash -n deploy/vps/deploy-dev.sh` and `git diff --check` → PASS

Result:

- **PASS / DONE.** The redundant project-directory override is removed, so the absolute Compose file location is the
  base for `../..` and Docker builds from the synced workspace on any deployment-user home path.
- Operator documentation now matches the confirmed Caddy setup and points the four dev hosts to `3300–3303`.
  Application code, databases, secrets, staging, production-sim and immutable release workflows are unchanged.

External next action:

- Apply the four dev runtime/Caddy port substitutions on the VPS, push this commit to `dev`, and rerun the dev sync.

## F12-T02-R10 — shared-dev port collision corrective

Task ID: F12-T02-R10
Batch ID: F12-B15-R1
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed live failure:

- The first `dev` source-sync stopped before Docker operations with `API_PORT crosses into production-sim`.
- The live staging containers correctly occupy `3100–3103`; the server's configured `production-sim/runtime.env`
  reserves `3200–3203`, which were mistakenly selected as the initial dev defaults. The collision guard behaved as
  designed even though production-sim containers were not running.

Changed files:

- `deploy/vps/dev-env.example`, `deploy/vps/README.md`
- `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `bash scripts/test-vps-dev.sh` → PASS; it now configures staging on `3100–3103` and production-sim on
  `3200–3203`, accepts dev on `3300–3303`, and still rejects a deliberate collision.
- `pnpm release:test` → PASS
- exact dev deployment/reference scan and `git diff --check` → PASS

Result:

- **PASS / DONE.** Shared dev defaults and documented Nginx targets are now `3300` web, `3301` app,
  `3302` dashboard and `3303` API. No production-sim setting, container, database, secret or release artifact is
  changed.

External next action:

- Update only `/home/deploy/mushroom/dev/runtime.env` and the four dev virtual-host `proxy_pass` values, push this
  corrective to `dev`, then rerun/observe `Sync shared dev VPS`.

## F12-T02-R9 — fast isolated shared development delivery

Task ID: F12-T02-R9
Batch ID: F12-B02-R9
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Owner request:

- Keep the accepted full CI and immutable-image CD path for `main`, while making ordinary development updates
  available quickly to the team on the same VPS.
- Separate dev from release databases, secrets, ports and state, and identify the exact one-time GitHub/server work.

Changed files:

- `.github/workflows/dev-sync.yml`, `.github/CI.md`
- `deploy/vps/Dockerfile.dev`, `compose.dev.yaml`, `deploy-dev.sh`, `dev-service.sh`, `dev-env.example`, `README.md`
- `scripts/deploy-dev-vps.mjs`, `scripts/test-vps-dev.sh`, `scripts/test-release-pipeline.mjs`
- `plan/decisions/ADR-0013-fast-shared-vps-dev-environment.md`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- `pnpm release:test` → PASS, including production release contract non-regression and dev Compose config validation
- `bash scripts/test-vps-dev.sh` → PASS: first runtime build/install/seed, source-only sync without recreate,
  dependency-triggered install/recreate, one-time seed and staging-port collision rejection
- `bash -n` for the dev deployment/service/behavior scripts and `node --check scripts/deploy-dev-vps.mjs` → PASS
- dev GitHub workflow YAML parse with the installed `js-yaml` parser → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Pushes to the fixed `dev` branch can now rsync source through host-key-pinned SSH without registry
  credentials or image publication. Persistent Nest/Next watchers keep source-only latency low; dependency/runtime
  fingerprints trigger only the necessary bootstrap or recreate.
- Dev uses project `mushroom-dev`, a dedicated PostgreSQL volume, file secrets, workspace/cache/state, loopback ports,
  public URLs and explicit CPU/memory caps. Runtime validation rejects identity/environment mismatches and collisions
  with configured staging or production-sim values. Sadad remains disabled.
- Frontend public runtime configuration is regenerated during every bootstrap so the three browser apps target the
  dev API rather than committed localhost defaults. Prisma uses generation plus forward-only migrate deploy; the
  development seed runs once and no normal path contains reset, down migration or Compose down.
- Existing `main` CI/release/promotion/rollback workflow and production Compose files are unchanged.

External activation and limits:

- Live VPS activation is not claimed: the owner must supply DNS/TLS/access control, synthetic dev secrets,
  `runtime.env`, repository variable `VPS_DEV_CD_ENABLED=true`, and create the `dev` branch as documented.
- Full workspace application tests were not repeated because no application feature or shared contract changed; the
  deployment-specific behavior and existing release contract suites passed. The shared-host capacity must be checked
  before enabling the bounded dev services.

Next batch:

- No batch is started in this handoff. After external setup, capture the first live sync SHA and four endpoint checks.

## F07-T11-R1 — deterministic concurrent prescription test assertion

Task ID: F07-T11-R1
Batch ID: F12-B14-R1
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed failure:

- Pull-request CI run `37727025727` passed the PostgreSQL prescription concurrency test.
- The same product code in post-merge main CI run `37727664058` committed the other concurrent request first. The
  database still produced exactly one revision and rejected the stale competitor with
  `PRESCRIPTION_REVISION_CONFLICT`, but the test hard-coded the first payload as the winner and failed at line 89.
- The failure was isolated to one assertion: 94 other test files and 384 other tests passed.

Changed files:

- `apps/api/test/prescription.integration.spec.ts`
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- comparative CI evidence from runs `37727025727` and `37727664058` → both legal serialization orders observed
- patched main CI run `37729167480` → PASS
- API typecheck, including Prisma generation → PASS
- `git diff --check` → PASS
- local PostgreSQL rerun was unavailable because this host has neither a PostgreSQL listener nor Docker engine; the
  required PostgreSQL integration coverage passed in the main CI service database

Result:

- **PASS / DONE.** The test derives the expected persisted item from the fulfilled concurrent request. It retains
  assertions for one success, one stale conflict, revision number/parentage, issued integrity evidence, immutable
  history and later amendment behavior without imposing an invalid promise-scheduling order.

Next batch:

- No batch is started in this handoff. The requested isolated fast dev environment is eligible as a separate batch.

## F12-T02 — non-root VPS file-secret ownership corrective

Task ID: F12-T02
Batch ID: F12-B02-R8
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed failure:

- Live Release run `37715705119` published the immutable release successfully, then staging migration failed because
  the UID/GID `65532:65532` Distroless API could not read `/run/secrets/database_url`.
- The VPS secret files correctly began as host-owned mode `600`; Compose file secrets are bind mounts and retained
  that ownership rather than remapping it to the application UID.

Changed files:

- `deploy/vps/deploy-release.sh`
- `deploy/vps/README.md`
- `scripts/test-vps-deploy.sh`
- `plan/STATUS.md`
- `plan/logs/phase-12.md`

Verification:

- `bash scripts/test-vps-deploy.sh` → PASS, including permission-helper-before-migration ordering and bounded runtime
- `pnpm release:test` → PASS
- `bash -n deploy/vps/deploy-release.sh` → PASS
- `git diff --check` → PASS
- live host metadata → all staging and production-sim secrets are `deploy:65532` mode `640`
- Release run `37715705119`, attempt 4 → eligibility/publish/deploy-staging PASS
- live staging → PostgreSQL/API/web/app/dashboard healthy; API live/ready and three Next loopback probes PASS

Result:

- **PASS / DONE.** Before migration or rollback activation, the trusted API image runs a short helper as root with no
  network, a read-only root filesystem and only `CHOWN`, `FOWNER` and `DAC_OVERRIDE`. It preserves the host deployment
  user as owner, grants read access only to runtime GID `65532`, and sets mode `640`. Application containers remain
  non-root and secrets are never world-readable.

Known limitation and next action:

- Run `37715705119` is the accepted live baseline. Two sequential update deployments and controlled rollback remain
  F12-T13 evidence. production-sim promotion remains manual and owner-gated.

## F12-T02 — private GitHub Free test-VPS CD boundary

Task ID: F12-T02
Batch ID: F12-B02-R7
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed baseline:

- Protected-main CI run `37711152615` for SHA `fc4f18fa5a8a999b49ff457588104d5a8c3f0d5a` passed.
- Release run `37711880141` passed publication and retained artifact
  `release-fc4f18fa5a8a999b49ff457588104d5a8c3f0d5a`; staging was correctly skipped while CD was disabled.
- Repository Actions metadata reported zero repository variables and zero repository secrets before activation.
- The private organization repository uses GitHub Free, which cannot configure GitHub Environments for a private
  repository; retaining those job references would make live deployment unavailable on the selected plan.

Changed files:

- `.github/workflows/release.yml`
- `.github/workflows/promote.yml`
- `.github/workflows/rollback.yml`
- `.github/CI.md`
- `deploy/vps/README.md`
- `scripts/test-release-pipeline.mjs`
- `specs/010-production-hardening/plan.md`
- `specs/010-production-hardening/quickstart.md`
- `plan/decisions/ADR-0012-free-plan-test-vps-cd.md`
- `plan/STATUS.md`
- `plan/logs/phase-12.md`

Verification:

- `pnpm release:test` → PASS
- all six workflow YAML files parsed → PASS
- actionlint → PASS
- owner-gate, manifest, SSH host-key and least-privilege permission review → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** The one-host non-production rehearsal now uses repository-scoped SSH inputs supported on GitHub
  Free. staging remains gated by `VPS_CD_ENABLED`; production-sim remains manual and actor-gated; immutable digests,
  temporary GHCR authentication and isolated VPS state are unchanged.

Known limitation and next action:

- This shared credential boundary is accepted only for the test VPS. Real production must use separately scoped
  credentials and an approval-capable control plane. Configure the documented repository secrets/variables before
  setting `VPS_CD_ENABLED=true`; live baseline/two-update/rollback evidence remains part of F12-T13.

## F12-T02 — GitHub Free-plan attestation corrective

Task ID: F12-T02
Batch ID: F12-B02-R6
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed release evidence:

- GitHub Actions run `37540615770`, attempt 3, accepted protected-main SHA
  `d922f099594267ec726b3f4527f9b51fefc733b6` and passed build, smoke, High/Critical scan and private-GHCR publish.
- Published immutable references:
  - API: `ghcr.io/drshirmardi/mushroom-api@sha256:ceaf21a494b14b658abdfe4e049507484f7281e31c6c69900b738df905024629`
  - web: `ghcr.io/drshirmardi/mushroom-web@sha256:4d1e7967ef9933800bae859f4f2f41462a42a78537acbca6f6b75319f0e912c1`
  - app: `ghcr.io/drshirmardi/mushroom-app@sha256:4c53b12011fbb1b85487a5c1bbefad81a288996ed2e881bd98ae18a35ffaf7b8`
  - dashboard: `ghcr.io/drshirmardi/mushroom-dashboard@sha256:194858125d169ce2896cfffc18d32f1c536a93f4d74b41483b6b8a8a87ff3ab2`
- The subsequent API attestation step failed with GitHub's explicit `Feature not available` response for a private
  repository in the `Drshirmardi` Free-plan organization. Because manifest upload followed attestations, the valid
  generated manifest was not retained and staging correctly remained skipped.

Corrective contract:

- Upload the strict digest manifest immediately after successful publication, before any optional provenance step.
- Run subject extraction and all four `actions/attest-build-provenance` steps only when repository variable
  `GHCR_ATTESTATIONS_ENABLED` is exactly `true`. Unsupported plans leave it absent or `false`.
- Attestation is supplemental evidence. Publication, immutable manifest validation, staging/promotion and rollback
  continue to use the exact four registry digests and do not weaken their gate when attestation is unavailable.

Verification:

- `pnpm release:test` → PASS, including manifest-before-attestation order and five explicit plan gates
- all six workflow YAML files parsed → PASS
- actionlint `1.7.12` → PASS
- `git diff --check` → PASS

Result:

- **PASS / DONE.** Private GHCR publication remains accepted; the next main run can retain its manifest on the current
  plan without treating an unavailable supplemental GitHub feature as a release failure.

## F12-T02 — private GHCR continuous delivery and VPS rehearsal corrective

Task ID: F12-T02
Batch ID: F12-B02-R5
Completed at: 2026-10-06 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `.github/workflows/{release.yml,promote.yml,rollback.yml,container-checks.yml}`
- `deploy/contracts/release-manifest.schema.json`
- `deploy/vps/{README.md,compose.yaml,deploy-release.sh,env.example}`
- `scripts/{deploy-vps.mjs,release-images.mjs,release-manifest.mjs,test-release-pipeline.mjs,test-vps-deploy.sh}`
- `docker-bake.hcl`, `package.json`
- `README.md`, `.github/CI.md`, `deploy/README.md`, `docs/PRODUCTION.md`
- `specs/010-production-hardening/{spec.md,plan.md,tasks.md,research.md,data-model.md,quickstart.md}` and its
  release-readiness contract/checklist
- coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`

Accepted delivery contract:

- Pull-request CI must pass before merge. A successful CI run for the current protected `main` SHA is the only trigger
  that may build, verify, scan and publish the four private GHCR images. Publication uses the scoped workflow token and
  records OCI source/revision labels plus provenance attestations.
- One strict release manifest binds source SHA, CI/release run IDs and the API/web/app/dashboard repositories to exact
  `sha256` digests. Staging and production-sim consume that manifest without rebuilding or accepting mutable tags.
- The release workflow stops after automatic `staging` delivery. `production-sim` promotion is a separate manual
  workflow that verifies the named release run and successful staging job, then requires the caller to match the
  configured `RELEASE_APPROVER`. GitHub Environment review may add a second approval when the repository plan supports
  it for private repositories.
- Deployment originates on an ephemeral GitHub-hosted runner over host-key-pinned SSH to a restricted non-root user.
  The private GHCR workflow token is piped only to a temporary Docker configuration, used to pull the exact digests,
  logged out and deleted. The VPS stores no registry PAT and runs no persistent runner or polling update agent.
- The VPS contract isolates `staging` and `production-sim` by Compose project, root directory, PostgreSQL database/user,
  volume, secret files, loopback ports, public origins and release state. Sadad is disabled and production data or
  credentials are prohibited.
- Migration is forward-only and completes before application switching. Failed staging verification automatically
  restores the recorded previous application digest set; production-sim rollback remains an explicit owner operation.
  No path resets, reverses or rolls back the database.

Verification:

- SpecKit requirements checklist → 11/11 PASS; pre-implementation checklist → 15/15 PASS
- read-only SpecKit analysis → 33/33 requirements and buildable success criteria mapped; 0 HIGH/CRITICAL findings
- `pnpm release:test` → PASS: triggers/permissions, manual approval, manifest strictness, digest-only references,
  secret/registry policy, Compose interpolation and script syntax
- all six workflow YAML files parsed; pinned `actionlint 1.7.12` → PASS
- `scripts/test-vps-deploy.sh` in a disposable Linux/Node environment → PASS: baseline and sequential staging updates,
  controlled staging failure with automatic application rollback, production-sim failed candidate retention, manual
  rollback, migration-before-switch and ephemeral Docker configuration
- `pnpm lint` → PASS with 0 errors and the same 3 pre-existing dashboard warnings; `pnpm typecheck` → PASS
- `IMAGE_REGISTRY=local IMAGE_TAG=f12-b02-r5 pnpm images:verify` → PASS: all four real images built, non-root smoke
  checks passed, and Trivy reported `0 Critical / 0 High` for API/web/app/dashboard. The shared temporary Trivy cache
  was removed after the run.
- no release container or task-owned Docker volume remained; `git diff --check` → PASS

Result:

- **PASS / DONE for the software/readiness scope.** The repository now contains the standard private-GHCR CI/CD path,
  immutable promotion boundary, non-production VPS deployment contract and rollback controls requested by the owner.

External acceptance still required:

- No package was published and no external server was changed in this batch. Set up a GitHub plan that supports
  Environment secrets for a private repository, configure `VPS_CD_ENABLED`, `RELEASE_APPROVER`, pinned SSH material and
  the two isolated VPS runtime/secret directories, then run and retain evidence for one baseline plus two sequential
  updates and the controlled rollback exercises.
- Until that evidence and the remaining Phase 12 gates exist, F12-T13 must reject production readiness. F12-T05,
  F12-T07, real Sadad acceptance and production deployment remain unchanged and blocked by their own gates.

## F12-T02 — release image build and CI concurrency corrective

Task ID: F12-T02
Batch ID: F12-B02-R4
Completed at: 2026-10-05 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `docker-bake.hcl`
- `scripts/release-images.mjs`
- `package.json`
- `README.md`
- `docs/PRODUCTION.md`
- `.github/workflows/{ci.yml,container-checks.yml}`
- coordinator-only `plan/{STATUS.md,logs/phase-12.md}`

Release build contract:

- Docker Buildx Bake is the single declarative source for the API, web, app and dashboard image targets. The
  `images:print`, `images:build`, `images:verify` and `images:push` package scripts use that same graph.
- The wrapper derives the GitHub owner in Codespaces or from `origin`, normalizes the registry to lowercase, tags a
  clean build with the 12-character source commit and appends `-dirty` to non-published worktree builds. Publishing
  rejects a dirty worktree and prints immutable registry digests after push.
- Container CI selects one target from the same Bake definition per matrix job. No provider SDK, deployment action,
  production secret or Sadad activation was added.

CI cancellation diagnosis:

- GitHub Actions push run `37334407135` ended as `cancelled` while displaying `pnpm test`; no failing assertion was
  reported. Pull-request run `37334669014` ran the same workspace test command successfully and completed its build.
- GitHub's retained run/job logs report only an external cancellation and do not expose the initiator, so a more
  specific cancellation source is not claimed. CI and artifact workflows now use GitHub's documented
  `github.head_ref || github.run_id` pattern: stale runs for one pull-request branch can still cancel, while every
  protected-branch push gets a unique group and therefore cannot be canceled by workflow concurrency.

Verification:

- wrapper syntax, supported-mode rejection, dirty-push rejection, lowercase registry normalization and Bake print
  target/tag assertions → PASS
- workflow YAML parse and concurrency/config review → PASS
- `pnpm install --frozen-lockfile --ignore-scripts` → PASS
- `pnpm lint` → PASS with 0 errors and 3 pre-existing cached dashboard warnings
- `pnpm typecheck` → PASS across all 5 workspaces
- disposable PostgreSQL 16: all 32 migrations and seed → PASS; `pnpm test` → PASS across all 5 workspaces, including
  API 94 files / 382 tests; database/container removed after the run
- `IMAGE_REGISTRY=local IMAGE_TAG=f12-b02-r4 pnpm images:verify` → PASS: four images built and loaded; all four
  disposable smoke checks passed; Trivy 0.75.0 reported `0 Critical / 0 High` for API/web/app/dashboard
- no smoke container remained after verification; `git diff --check` → PASS

Result:

- **PASS / DONE.** One standard command now builds the complete production artifact set, and the misleading
  post-merge cancellation mechanism is corrected without skipping or weakening tests.

Known limitations:

- Images were not pushed and no environment was deployed. Registry authentication and external deployment remain
  explicit operator actions.
- F12-T05 backup/restore and F12-T07 secret-manager evidence remain blocked, and F12-T09 observability remains
  dependency-gated. Production and real Sadad activation still require F12-T13 sign-off.

## F12-T02 — development and production runbook corrective

Task ID: F12-T02
Batch ID: F12-B02-R3
Completed at: 2026-10-05 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/PRODUCTION.md`
- coordinator-only `plan/{STATUS.md,logs/phase-12.md}`

Documentation contract:

- The root README describes the current four-application/PostgreSQL architecture and directs developers to separate
  Development/Codespaces and Production runbooks instead of the stale foundation-era setup.
- The Development runbook covers Node/pnpm/Docker prerequisites, local PostgreSQL, ignored API environment values,
  generated client, Prisma migrate/seed, all application URLs, Codespaces forwarded origins/runtime config, restart,
  reset, update and troubleshooting. Sadad stays disabled and no real data or credential is requested.
- The Production runbook follows the accepted provider-neutral artifact boundary: build the four existing
  Dockerfiles once, smoke and scan actual artifacts, push and record immutable digests, promote those exact digests
  through staging, run migration explicitly, start with file-backed secrets, update without `compose down`, and
  perform application-only rollback while retaining the expanded schema.

Verification:

- all relative Markdown links in the three public documents resolve → PASS
- documented repository paths and root package scripts exist → PASS
- Bash syntax validation for all 36 documented `bash` command blocks → PASS
- documented loopback port variables and required synthetic release variables with
  `docker compose -f compose.production.example.yaml config --quiet` → PASS
- command/config review against `compose.yaml`, `compose.production.example.yaml`, both release Dockerfiles,
  `scripts/ci-container-smoke.mjs`, API environment validation and Phase 12 migration policy → PASS
- no-secret/no-provider-action review → PASS
- `git diff --check` → PASS
- post-push command review after a real Codespaces attempt → PASS: the GHCR namespace is now derived from
  `GITHUB_REPOSITORY`, normalized to lowercase, printed before build and shown as `ghcr.io/drshirmardi` in release
  examples; the literal uppercase `OWNER` placeholder that Docker rejects is no longer copyable.

Result:

- **PASS / DONE.** The documentation is executable against the accepted repository interfaces and makes the local,
  Codespaces, build, promotion, update and rollback paths discoverable without modifying runtime behavior or claiming
  deployment readiness.

Known limitations:

- No image was rebuilt and no environment was deployed for this documentation-only corrective; the previously
  accepted F12-T02 artifact evidence remains authoritative.
- F12-T05 backup/restore and F12-T07 secret-manager evidence remain blocked, and F12-T09 observability remains
  dependency-gated. Production and real Sadad activation still require F12-T13 sign-off.

## F12-T10 — low-downtime migration and application-rollback rehearsal

Task ID: F12-T10
Batch ID: F12-B05-R1
Completed at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Changed files:

- `apps/api/test/phase-12-migration-rollback.integration.spec.ts`
- `deploy/phase-12-migration-rollout.md`
- coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`

Rehearsal design:

- The rollout is **expand → migrate → contract**. Accepted migrations are immutable; migration runs once before
  application promotion and never from ordinary API startup. Contract/removal work is deferred to a separately
  rehearsed later release after the previous artifact is retired.
- Rollback is application-only: retain the expanded schema and return to the previous verified artifact. There is no
  down SQL, `prisma migrate reset`, truncation or destructive data rollback. Any discovered incompatibility requires a
  forward-fix migration that preserves migration history and data.
- The chosen pre-current artifact is `d8e994887a6a78a8f903275459952e6fefc17fd3`; its migration tree is identical
  to the current `df24278` tree. The meaningful historical schema upgrade remains Phase 09 final
  `20260913204000_phase_09_payment_immutability_trigger_fix` through the two accepted Phase 10 migrations. This is
  exercised separately from the artifact-boundary startup sequence.

Verification and measured results:

- A labelled, loopback-only PostgreSQL 16 container `mushroom-f12t10-postgres` supplied uniquely named child
  databases only. No shared, staging or production database was contacted.
- `pnpm --filter @sabz-zendegi/api exec vitest run test/phase-12-migration-rollback.integration.spec.ts
  --no-file-parallelism --reporter=dot` → PASS: 2 tests in `9.42s`. It replayed all 32 migration directories on a
  blank database, `migrate status` reported no pending migration, and it rebuilt the Phase 09 baseline before applying
  the two Phase 10 migrations. The ten chat tables and the two rate-limit indexes exist; the upgraded SQL contains no
  table/column/type drop, truncate or data-delete statement.
- `prisma validate` → PASS; `prisma generate` → PASS in `596ms`; API `typecheck` → PASS.
- Exact promoted-image command `node_modules/prisma/build/index.js migrate deploy` on a fresh measured child database
  replayed all 32 migrations in `6.59s`; subsequent `migrate status` was PASS and `_prisma_migrations` had 32 finished
  rows.
- Clean Git archives excluded all uncommitted F12-T07 work. The previous `d8e9948` API source (Prisma 7.9.1) and
  current `df24278` API source (Prisma 7.10.0) each built as numerical UID/GID `65532:65532` artifacts. Against the
  expanded current schema, readiness passed in the required order: previous `1.70s`, current `1.69s`, previous again
  `1.61s`. The initial previous-artifact attempt exposed only a missing synthetic `TRUSTED_PROXIES` production fixture;
  after adding the documented explicit loopback proxy/origin fixture, no application or schema defect remained.
- `git diff --check` → PASS. No accepted migration was rewritten, removed or created.

Cleanup:

- Child databases, the labelled PostgreSQL container, all three startup containers, both run-owned Docker networks and
  both temporary API image tags were removed. Run-owned source archives and command logs are outside Git and contain
  no real credential or production data.

Result:

- **PASS / DONE.** The rehearsal proves application rollback to the selected previous artifact does not prevent API
  startup or damage data on the expanded schema. It does not claim database rollback, production deployment, backup
  restore, provider readiness or Sadad activation.
- F12-T09 remains unstarted and blocked by F12-T07. F12-T05 and F12-T07 remain untouched.

## F12-T02 corrective provider-neutral OCI artifact extension R7 — DONE

Batch ID: F12-B02-R2
Completed at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Owner-approved final runners are pinned to
`gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e`.
The official Node 24 slim images remain build-only. API, web, app and dashboard final layers have no shell or global
package manager, copy files with numerical ownership `65532:65532`, and run as that numerical non-root identity.
Small Node entrypoints replace shell startup: API reads only declared `*_FILE` inputs before `dist/main.js`; Next writes
only validated public URLs to `public/runtime-config.js` before `server.js`. No real secret, provider provisioning,
production deployment, external Sadad call, enable/default or provider-specific runtime code was introduced.

The API production deploy is intentionally minimal and includes Prisma 7.10.0 as an already locked production
dependency so the standalone, explicit migration command `node_modules/prisma/build/index.js migrate deploy` is
available from the promoted image. This is not a Prisma upgrade, does not alter an advisory resolution, and normal API
startup does not execute migrations. `pnpm why` reconfirmed that the prior `brace-expansion` and `js-yaml` image paths
were copied development/tooling trees, not the production API/web dependency closures; the API's production Swagger
path resolves `js-yaml@5.3.0`, and web has neither path in its production closure.

Verification (all run against disposable, labelled resources and then removed):

- API, web, app and dashboard each built from their production Dockerfile path. Every Next build forced a clean
  API-client build and asserted `packages/api-client/dist/index.js` before the Next build.
- Docker Scout SARIF scans of each actual release image report `0 Critical / 0 High`. The complete machine-readable
  reports are run-owned temporary artifacts outside Git; no scanner result was muted or waived.
- A fresh PostgreSQL 16 database accepted all 32 migrations through the explicit API-image migration command.
  The API liveness and readiness routes, plus all three Next HTTP endpoints, returned `200` through production Compose.
  Compose health checks were recreated after correcting their command to the Distroless Node binary; all four services
  became `healthy`.
- Direct runtime checks proved UID `65532` for API, web, app and dashboard. The same web image tag served separate
  staging and production public URL configurations without rebuild; both served HTTP `200`, the generated files differ
  only in public URL values, and no secret-shaped runtime key was emitted.
- `docker compose config` with synthetic non-secret values and the documentation-only Liara profile gate passed. The
  profile contains only port, health, domain/HTTPS, secret injection and static-outbound-egress guidance; no Liara SDK,
  API or runtime branch appears in the artifacts. Realtime remains single-instance, with multi-instance blocked pending
  an approved distributed Socket.IO/session adapter.
- API typecheck with a build-only disposable `DATABASE_URL`, both Node entrypoint syntax checks, and `git diff --check`
  passed. The pre-existing F12-T07 files remained unstaged and were not reviewed as this task's implementation.

Cleanup removed the named run-owned Compose services, PostgreSQL database/container, network, direct runtime-promotion
containers and all four temporary release-image tags. This evidence proves local artifact behavior only; it does not
claim Liara static-outbound-egress, managed-secret capability, backup/WAL capability, real Sadad acceptance or
production readiness.

Result: **DONE.** F12-T02's corrective extension satisfies its software/artifact acceptance gates. F12-T05 and F12-T07
remain external-evidence blockers for F12-T13. Do not start B05 from this completion.

## F12-T02 corrective provider-neutral OCI image-hardening analysis R6 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

Only API and web were rebuilt for this staged investigation. Complete Docker Scout SARIF reports for both images and
for the two official Node 24 slim bases, plus the base recommendation output, were written outside Git in run-owned
temporary storage. They retain advisory ID, package PURL, installed/source path and fixed-version fields; no secret,
credential or application data was included.

Classification of the API/web Critical/High findings is evidence-based:

- **Debian/base image:** Bookworm contains unfixed `CVE-2026-12087` and `CVE-2026-13221` (both Critical, `perl`),
  and unfixed High findings `CVE-2026-102010`/`CVE-2026-95619` (`gcc-12`), `CVE-2026-103111` (`pcre2`),
  `CVE-2026-48959`, `CVE-2026-48962`, `CVE-2026-57432`, `CVE-2026-82560` (`perl`),
  `CVE-2026-76642`, `CVE-2026-78408`, `CVE-2026-78409`, `CVE-2026-78410` (`util-linux`) and
  `CVE-2026-84782` (`openssl`). Their SARIF locations are Debian package paths and their fixed version is
  `not fixed`.
- **Official Node global tooling:** `brace-expansion`, `undici`, `ip-address`, `tar` and
  `http-cache-semantics` under `/usr/local/lib/node_modules/npm/` are not application runtime dependencies. Their
  reported patched versions include `brace-expansion` `5.0.8` through `5.0.11`, `undici` `6.28.1`,
  `ip-address` `10.3.1` and `tar` `7.5.21`; `CVE-2026-93748` for `http-cache-semantics` is `not fixed`.
  Removing npm/npx/Corepack/pnpm/Yarn from final runners remains a valid future hardening slice, but cannot clear
  the unresolved official base-image gate by itself.
- **Application runtime dependency paths:** only the copied workspace tree produced Critical/High SARIF locations:
  `brace-expansion@2.1.4` (`CVE-2026-102276`, `CVE-2026-102278`; fixes `2.1.5`/`2.1.6`) and
  `js-yaml@4.3.1` (`CVE-2026-84375`; fix `4.3.2`). The scan also sees `brace-expansion@5.0.7` in the base npm tree;
  dependency manifest or lockfile remediation is not started because it overlaps the accepted F12-T08 security
  resource and requires a separate ownership review.

Official-base comparison: Docker Scout recommends official `node:24-bookworm-slim` digest
`sha256:5cbc7caba8c2c0f0bca675d1b61b9f2857e1cf1853c6164ee9dd409501a936e7` (Node `24.21.0`), but its SARIF has
21 Critical/High results, including the unfixed Critical entries above. Official
`node:24-trixie-slim@sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe` has fewer results
(12 High, no Critical), but remains unacceptable for the zero gate: `CVE-2026-102010` and `CVE-2026-95619` for
`gcc-14`, and `CVE-2026-93748` for `http-cache-semantics`, are `not fixed`. Trixie compatibility was therefore not
selected or introduced; no Alpine migration, blanket `apt upgrade`, waiver, mute, dependency-major upgrade or
manifest/lockfile change occurred.

Result: F12-T02 stays `REWORK` and its claim is released. The requested `0 Critical / 0 High` API/web threshold
cannot be reached from either currently scanned official Node 24 slim base without weakening the gate. The exact next
action is to obtain an official compatible Node 24 slim base digest with zero Critical/High findings, or approve a
different supported base-image strategy; only then pin it, remove global package-manager tooling from final runners,
rebuild API/web and rescan before considering app/dashboard or the final smoke. The run-owned API/web tags were
removed; F12-T07 remains untouched and unstaged. Do not start B05.

## F12-T02 corrective provider-neutral OCI artifact extension R5 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

The owner-provided disposable fixtures were used only through temporary mounted secret files and a non-secret active
key-version environment value. Their literal values are intentionally not persisted here, in Git, in `.env.example`,
or in any release artifact. Existing encryption/keyring validation was not changed or weakened.

Verification passed before the security gate:

- API, web, app and dashboard OCI images built successfully; every final image configured non-root user `mushroom`
  (UID `10001`). The clean API-client build assertion remained in every Next build path.
- `docker compose ... config` passed with quoted required interpolation and block-style environment mappings. The
  API image applied all 32 migrations to a fresh run-owned PostgreSQL 16 database using the explicit one-shot command.
- Production Compose started all four services. API liveness/readiness and web/app/dashboard HTTP smoke endpoints all
  returned `200`; every service ran as UID `10001`.
- The same immutable web image digest served two different valid public runtime configurations (staging and
  production) without rebuild; the generated runtime files differed only in public URL values and contained no
  secret-shaped key.
- The Liara documentation-only profile was reviewed with the Compose artifacts: it maps only generic port, health,
  secret-boundary, HTTPS/domain and static-outbound-IP gate guidance. Runtime artifacts contain no Liara SDK, API or
  provider-specific branch; multi-instance realtime remains explicitly blocked.

Docker Scout `1.18.3` scanned every actual release image with the Critical/High filter. The API image digest reported
`2 Critical / 23 High`; each web, app and dashboard image reported `2 Critical / 19 High`. The reported paths include
unfixed Bookworm base-system packages (including `perl`, `util-linux` and `openssl`) plus runtime Node dependency
paths such as `brace-expansion`, `ip-address`, `undici`, `tar` and `js-yaml`; no finding was muted, waived or
reclassified. This is independent of the earlier accepted source dependency audit and prevents a production-readiness
PASS for the artifacts.

Cleanup: the named `mushroom-f12t02-compose-*` services, disposable PostgreSQL container, two runtime-promotion
containers, network and all four run-owned image tags were removed. Temporary run-owned local files could not be
deleted because this session's filesystem policy rejected the removal request; they contain only the non-real
disposable fixtures and scanner reports, are outside Git, and no shared Docker resource or real credential was
touched. F12-T07's pre-existing uncommitted secret-rotation changes remain untouched and unstaged.

Result: retain F12-T02 corrective extension as `REWORK`, release its claim and create no completion commit. The
precise next action is a separately reviewed image-hardening remediation: trace each scanner path, select compatible
patched base-image/runtime dependency changes, then rebuild and rescan all four images without weakening the scan
gate. Do not start B05.

## F12-T02 corrective provider-neutral OCI artifact extension R4 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

The limited Compose corrective change is complete: every required `${VAR:?message}` interpolation is quoted and all
API, web, app and dashboard `environment` declarations are block mappings. `docker compose ... config` resolved the
production example using temporary non-secret values; no required interpolation is unquoted and no flow-style
environment mapping remains. The documentation-only Liara profile remains free of executable provider configuration,
SDK or runtime API, so there is no provider-specific YAML artifact to parse or merge.

The four OCI images rebuilt successfully. The Next build stage rebuilt `@sabz-zendegi/api-client` after removing its
incremental state and asserted `packages/api-client/dist/index.js`; all four final images specify non-root user
`mushroom`. The explicit API-image migration applied all 32 migrations to a fresh, run-owned PostgreSQL 16 database.
The Compose example then started API, web, app and dashboard; web/app/dashboard became healthy and served HTTP 200.

The required API health gate failed. Its mounted **synthetic** `PAYMENT_CREDENTIAL_ENCRYPTION_KEY` was not a canonical
base64 32-byte AES-256 key and its synthetic `PAYMENT_CREDENTIAL_DECRYPTION_KEYS` value was not a valid
`version:canonical-base64-32-byte-key` keyring. Existing validation correctly rejected both values before Nest bound
the health endpoint; the API exited 1/restarted and no API health, runtime-promotion, Liara-profile gate or container
scan can be marked PASS. This is a test-fixture defect, not a claim about deployment readiness, real credentials,
Sadad, Liara or the Compose syntax.

Cleanup: the named `mushroom-f12t02-compose-*` services, its network, disposable PostgreSQL container and all four
run-owned image tags were removed. No shared Docker resource or real secret was touched. The temporary local values
remain non-secret and outside Git. F12-T07's pre-existing uncommitted secret-rotation changes remain untouched and
unstaged.

Result: retain F12-T02 corrective extension as `REWORK`, release its claim and create no completion commit. The exact
safe next action is to use generated canonical base64 32-byte **synthetic** encryption/keyring fixtures, then repeat
the remaining Compose/API health and public-runtime-promotion gates, the Liara documentation-profile review and actual
image container scans. Do not start B05.

## F12-T02 corrective provider-neutral OCI artifact extension R3 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-04 +03:30
Coordinator/Thread: Codex /root

The owner-confirmed incremental-cache corrective change is implemented: `.dockerignore` excludes `*.tsbuildinfo` and
`.turbo`; the Next build stage removes the API-client incremental state and output, rebuilds the client and asserts
`packages/api-client/dist/index.js` before building the selected application. The web image first passed this exact
gate; API, app and dashboard images then passed as well, each configured as non-root `mushroom` (UID `10001`).

Verification completed before the Compose gate:

- Two containers from the same immutable web image, with separate staging and production public URLs, each served
  HTTP `200` and produced different public-only `runtime-config.js` values. No secret was emitted; both ran as UID
  `10001`.
- The API image's explicit migration command was corrected to invoke its bundled Prisma binary rather than triggering
  an on-demand Corepack download. It applied all 32 migrations on a fresh, labelled PostgreSQL 16 disposable database
  and then reported no pending migration. OpenSSL is explicitly installed in build and runner stages so Prisma no
  longer falls back to an undetected OpenSSL variant.
- API container liveness and readiness returned HTTP `200` against the disposable database as UID `10001`.
- A production-Compose smoke prepared a second disposable PostgreSQL 16 database and synthetic mounted secret files;
  the same API image applied all 32 migrations successfully to it.

Required Compose gate failed before any service started. `docker compose ... config` rejects
`compose.production.example.yaml` at line 27: the flow-style `environment` mapping has unquoted `${VAR:?message}`
values, and the `:` in that interpolation is invalid YAML there. Consequently Compose service health, profile smoke
and actual-image container scans remain unrun. This is a repository configuration defect, not a provider, credential,
Sadad or external-service failure.

Cleanup: all named `mushroom-f12t02-*` containers, the run-owned network and the four tagged run-owned images were
removed. No shared Docker resource or real secret was removed; the temporary local directory contains only synthetic
test values and was not removable by this session's filesystem policy.

Result: retain F12-T02 corrective extension as `REWORK`, release its claim and create no completion commit. The next
safe action is to make Compose environment mappings YAML-safe, run `docker compose config`, then repeat the Compose
smoke and run the Liara-profile review and container scans against the already verified images. Do not start B05 or
stage F12-T07 changes.

## F12-T02 corrective provider-neutral OCI artifact extension R2 — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

The project owner confirmed Docker Desktop's Linux engine after moving its data directory: `docker version` reports
client/server `28.4.0`, and `docker run --rm hello-world` passed. The retained F12-T02 deployment artifacts were
verified without changing or staging the pre-existing F12-T07 secret-rotation work.

Verification:

- API OCI build → PASS in 1m25s. The resulting `mushroom-api:f12t02-r2` image configured the non-root `mushroom`
  user. It was removed as a run-owned artifact after the later Next build failure.
- Web OCI build → FAIL in 1m18s. After frozen install and a successful API-client package build, `next build` failed
  with `Module not found: Can't resolve '@sabz-zendegi/api-client'` from `apps/web/src/auth/web-session.ts` and
  `apps/web/src/lib/api.ts`. The same local `pnpm --filter @sabz/web build` passed, so the defect is confined to the
  current Docker workspace dependency/layout resolution rather than the web source or API client export itself.
- App/dashboard images, non-root runtime smoke/health/readiness, public runtime-config promotion check, disposable
  PostgreSQL migration, production-Compose smoke, Liara-profile smoke and image scans were deliberately not run after
  this required build gate failed. No real Sadad call, secret, provider provisioning or production deployment occurred.
- Cleanup → PASS: no `mushroom-*` container existed; the exact run-owned API image tag/digest was removed. No broad
  Docker prune or shared resource cleanup was performed.

Result: keep F12-T02's corrective extension `REWORK` and create no completion commit. The safe corrective action is to
adjust and review the Next Docker build so the workspace client package link and its built export remain resolvable in
the build stage, then rebuild all four images and execute the remaining smoke, one-shot migration, Compose and image
scan gates from new run-owned artifacts. Do not start B05 and do not stage F12-T07 files.

## F12-T02 corrective provider-neutral OCI artifact extension — REWORK

Batch ID: F12-B02-R2
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

Owner-approved change control is recorded in ADR-0011, the Phase 12 release envelope and the SpecKit plan/task map.
The implementation adds provider-neutral non-root OCI definitions for API, web, app and dashboard; standalone tracing
for all Next applications; `PORT`/`HOSTNAME` runtime binding; a fixed public-only runtime URL file; explicit API-image
migration instructions; a production Compose example for external PostgreSQL/file secrets; and a documentation-only
Liara profile. It adds no Liara SDK/API/runtime branch, provider provisioning, real secret, Sadad request, payment
enable/default or production deployment. Existing F12-T07 secret-rotation changes remain unstaged and out of scope.

Verification completed:

- API, web, app and dashboard typechecks → PASS; API Prisma client generation used a non-secret build-only PostgreSQL
  URL.
- `sh -n` for API and Next entrypoints → PASS.
- `git diff --check` → PASS.

Required artifact verification is not complete. Docker Desktop's `com.docker.service` is `Stopped` and a non-elevated
start attempt was denied. Docker Desktop was launched, but `docker version` and the run-owned API build stayed silent
despite the existing Linux-engine pipes; no image was produced. The local `C:` volume also had only about 0.5 GB free.
The run-owned Docker CLI processes were stopped; no container, database, image or provider resource was created.

Result: keep this corrective extension `REWORK` and do not create a completion commit. After an authorized owner
restores a responsive Docker Linux engine with sufficient disk, build all four images, prove non-root runtime config and
health/readiness, run the explicit API-image migration against a fresh disposable PostgreSQL container, validate the
production Compose example, scan the resulting images, and then update the prior F12-T08 artifact-scan N/A evidence
with the actual independent corrective scan. Do not rerun accepted dependency remediation or start B05.

## F12-T08 corrective override compatibility R2 — DONE

Batch ID: F12-B04-R2
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

The official npm registry reports stable `deepmerge-ts@8.0.2` (latest; Node >=16.9) and stable
`mysql2@3.24.5` (latest; Node >=8), satisfying the advisory minima respectively: `GHSA-ggr8-5vv4-36mx >=8.0.0`
and `GHSA-3f6p-5ww8-9rcr >=3.22.0`. A first multi-parent pnpm selector was rejected before any resolution changed;
the supported, bounded selectors are `@prisma/config>deepmerge-ts: 8.0.2` and `prisma>mysql2: 3.24.5`.

`pnpm why` proves the final production paths are only:

- `apps/api > @prisma/client > prisma > @prisma/config > deepmerge-ts@8.0.2`;
- `apps/api > @prisma/client > prisma > mysql2@3.24.5`.

No Prisma 8, MySQL configuration, service, connection, secret, or runtime database-provider change was added.
`pnpm install --frozen-lockfile` passed. Prisma 7.10.0 `validate` and `generate` passed. On the fresh loopback-only,
run-owned `mushroom-f12-b04r2-postgres` PostgreSQL 16 container (label `codex.batch=F12-B04-R2`), all 32 migrations
were applied successfully to one clean database and replayed from zero on a second newly created database; migration
status was up to date for both. This is PostgreSQL-only evidence, not a MySQL configuration exercise.

API/app/web/dashboard typechecks passed. App/web/dashboard test suites passed (`45`, `9`, `61` tests); API build
passed. The recorded disposable integration run `%TEMP%/mushroom-f12-t08-r2-verification.log` shows seed completion
and the focused auth/session, audit redaction, chat rate-limit, Sadad callback/redirect/fail-closed and simulated
payment idempotency suite: 5 files, 25 tests, 103.89 seconds, exit 0. It made no real Sadad call. The final
`%TEMP%/mushroom-f12-t08-pnpm-audit-r2.json` has `0 critical`, `0 high`, `5 moderate`, `0 low` (the pnpm audit
process exit `1` reflects remaining moderate findings, not a Critical/HIGH gate failure).

Main-agent review: PASS. The temporary overrides are limited to the two Prisma transitive paths and their lockfile
resolution; they meet the two advisory patch requirements and all compatibility checks above. Existing F12-T07
uncommitted secret-rotation files and their plan hunks are preserved and excluded from the F12-T08 commit. The
run-owned PostgreSQL container was removed after review. T08 is accepted; B05 remains unstarted.

## F12-T08 corrective dependency remediation R1 — REWORK

Batch ID: F12-B04-R1
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root

The initial run-owned `%TEMP%/mushroom-f12-t08-pnpm-audit.json` was parsed before change: the reported `10 critical`
and `37 high` are **30 unique GHSA advisories**, represented by **35 HIGH/CRITICAL advisory-plus-patched-version
entries** (five `fast-uri` advisories each appear for its two supported major branches), over **47 advisory-path
occurrences** and **18 distinct dependency paths**. They are not 47 different advisories. `pnpm why` was run for
every affected package path. The findings,
their advisory-recommended patched version, and the parent/path decision were:

| Group / resolved package path | Advisory IDs and patched version requested by the advisory | Compatibility-reviewed action |
| --- | --- | --- |
| `apps/{app,dashboard,web} > next` | `GHSA-2xp9-vwfh-vxw4 >=16.3.3`; `GHSA-p293-qw3h-jr36 >=16.3.3`; `GHSA-vcvr-r3jv-pc5j >=16.3.6` (each on all three direct workspace paths) | Direct Next upgrade `16.3.1 → 16.3.8`; its resolved `sharp` path also clears `GHSA-rgj7-g3m4-5g8c >=0.35.4`. |
| `apps/api > @nestjs/platform-fastify > @fastify/middie` | `GHSA-72c6-fx6q-fr5w >=9.3.2`; `GHSA-8p85-9qpw-fwgw >=9.2.0`; `GHSA-cxrg-g7r8-w69p >=9.1.0`; `GHSA-v9ww-2j6r-98q6 >=9.3.2` | Aligned Nest `11.1.8 → 11.2.7`, then a same-major Fastify override after parent inspection; final audit contains no middie finding. |
| `apps/api > @nestjs/platform-fastify` | `GHSA-6v32-fjc9-9qf6 >=11.1.24`; `GHSA-r4wm-x892-vjmx >=11.1.14`; `GHSA-wf42-42fg-fg84 >=11.1.16`; `GHSA-9c5c-9qcx-q35q >=11.2.4` | Direct aligned Nest `common/core/platform-fastify/platform-socket.io/websockets` update to `11.2.7`. |
| `apps/api > {fastify, @nestjs/platform-fastify > fastify}` | `GHSA-247c-9743-5963 >=5.8.5`; `GHSA-jx2c-rxcm-jvmq >=5.7.2`; `GHSA-667r-xxjv-c9mm`, `GHSA-p68q-wchp-6fh7`, `GHSA-hwr6-493r-vm6h`, `GHSA-9q9j-q6p8-xq58` (each `>=5.12.2`) | Direct Fastify `5.6.0 → 5.12.5`; Nest 11.2.7 still pins `5.11.3`, so a bounded `@nestjs/platform-fastify>fastify: 5.12.5` same-major override was independently tested. |
| `apps/api > @fastify/static > glob > minimatch > brace-expansion` | `GHSA-6j4f-fj2g-mc7p >=5.0.10`; `GHSA-qhr7-859c-m2p7 >=5.0.11` | Direct static update `8.3.0 → 10.1.5`; its still-pinned `brace-expansion@5.0.9` received only a same-major patch override to `5.0.11`. |
| `apps/api > @nestjs/core > path-to-regexp` and `apps/api > joi` | `GHSA-j3q9-mxjg-w52f >=8.4.0`; `GHSA-6h2x-m376-mqjq >=18.2.6` | The aligned Nest update clears the former; direct Joi update `18.2.5 → 18.2.9` clears the latter. |
| Fastify AJV chains: `... > {fast-uri@4, ajv > fast-uri@3}` | `GHSA-5jgf-p345-68v8`, `GHSA-f65p-4m7j-42xc`, `GHSA-fph4-wmhf-6fwf` (each `>=4.1.3` / `>=3.1.6` per path); `GHSA-jqff-g426-hqxp >=4.1.3 / >=3.1.6`; `GHSA-qw65-cvwx-89v3 >=4.1.4 / >=3.1.7` | `pnpm why` identified `fast-uri@4.1.2` and `3.1.5`; bounded patch-only overrides select `4.1.4` and `3.1.7` within their existing major ranges. |
| Prisma chains: `apps/api > @prisma/client > prisma > @prisma/config > deepmerge-ts` and `... > prisma > mysql2` | `GHSA-ggr8-5vv4-36mx >=8.0.0`; `GHSA-3f6p-5ww8-9rcr >=3.22.0` | Direct Prisma family update `7.9.1 → 7.10.0` was the current stable parent upgrade; it still resolves `deepmerge-ts@7.1.5` and `mysql2@3.15.3`. No override can satisfy these advisory requirements within their current majors. |

No `pnpm audit --fix --force`, blind major update, waiver, mute, or unreviewed override was used. Each override is
limited to a patched version in the existing dependency major and was followed by frozen-install integrity and
affected-package checks. The intended T08-only files are the dependency manifests, root override policy and
lockfile; the uncommitted F12-T07 `.env.example`, validation, crypto service, tests, deploy procedure and their
shared-plan hunks remain preserved and excluded from any T08 stage/commit.

Verification:

- Per-group `pnpm install --frozen-lockfile` passed after the lockfile was generated; API, app, web and dashboard
  typechecks passed. API build (with disposable local test configuration) and app/web/dashboard builds passed.
  Package tests passed: app `45`, web `9`, dashboard `61`.
- Final `%TEMP%/mushroom-f12-t08-pnpm-audit-final.json` exits `1`, correctly because it reports `0 critical`,
  `2 high`, `6 moderate`, `0 low`. The two HIGH paths are precisely the two unresolved Prisma rows above.
- Disposable PostgreSQL abuse run `mushroom-f12-b04r1-postgres` was loopback-only, labelled `codex.batch=F12-B04-R1`
  and removed after verification. The recorded rerun `%TEMP%/mushroom-f12-t08-abuse-rerun.log` exited `0`: 5 files,
  25 tests, 83.02 seconds. It covers auth/session reuse and audit redaction, chat rate limit, Sadad callback
  allowlisting/redirect/fail-closed behavior, simulated timeout/duplicate-callback financial-effect protection. It
  makes no real Sadad request.
- There is no application Dockerfile, Compose file, Containerfile or committed release image artifact. Therefore
  release-container scanning is `N/A` with evidence, not a vulnerability waiver; the disposable PostgreSQL
  container is not a release artifact.

**Result: REWORK / unchecked.** The remaining HIGH advisories are not hidden. The project owner must approve a
Prisma-major compatibility remediation (Prisma 8 is currently pre-release) or wait for a compatible stable parent
release. Only then may F12-T08 rerun the production audit and abuse suite. F12-T13 release sign-off remains blocked;
no T08 completion commit exists.

## F12-B04 handoff — F12-T07 blocked and F12-T08 rework

Batch ID: F12-B04
Recorded at: 2026-10-02 +03:30
Coordinator/Thread: Codex /root
Result: closed without a successor batch; only F12-T04 is accepted/committed.

### F12-T07 — software rotation coverage, external-capability blocker

- Inventory confirms runtime values are intended for a deployment managed-secret boundary; merchant/terminal material
  remains exclusively in immutable encrypted payment-provider credential revisions. No real secret was read, written,
  logged or committed.
- A real software gap was found and covered: historical credential revisions stored a key version but decrypt used
  only the current key. The prepared versioned managed-secret keyring keeps an old version decryptable after a new
  write key is promoted, rejects malformed/duplicate keyring entries, and fails closed when a required historic key
  is unavailable. The synthetic unit/environment tests pass (2 files, 11 tests), as do a disposable PostgreSQL
  payment-provider configuration and credential-retention run (2 files, 2 tests) and API typecheck.
- `deploy/phase-12-secret-rotation.md` records the 90-day/exposure procedure, rollback, retention and secret-free
  evidence requirements. It expressly does not claim a provider drill or expose a key.
- **BLOCKED / unchecked:** no written Liara evidence yet proves managed runtime secrets, versioned references,
  auditability, or a no-disclosure/no-disruption rotation procedure in the selected staging/production service. The
  project owner must obtain that evidence and authorize a real environment drill. Until then this remains an F12-T13
  release-sign-off gate, and there is no F12-T07 completion commit.

### F12-T08 — scan and abuse review

- `pnpm audit --prod --json` exited `1` and its run-owned JSON is retained at
  `%TEMP%/mushroom-f12-t08-pnpm-audit.json`. It reports `10 critical`, `37 high`, `17 moderate` and `1 low`
  vulnerabilities across 488 production dependencies. Critical findings include the Next.js chain and
  `@fastify/middie`; high findings include Fastify, `@nestjs/platform-fastify`, `@fastify/static`, `joi`,
  `path-to-regexp`, `sharp`, `fast-uri`, `deepmerge-ts`, `brace-expansion` and `mysql2` paths. They are not muted,
  threshold-filtered, waived or treated as a passing result.
- Targeted disposable-PostgreSQL abuse coverage completed successfully: auth session/reuse and audit redaction,
  chat rate limits, Sadad callback allowlisting/redirect profiles/fail-closed gate, and simulated timeout/duplicate
  financial-effect protection. No real Sadad request occurs in these tests.
- No application Dockerfile, Compose file or committed container image artifact exists, so an application-image scan
  is `N/A`; the local PostgreSQL test container is not a release artifact. This does not waive the dependency result.
- **REWORK / unchecked:** an approved, separately reviewed dependency remediation and compatibility plan is required
  before altering direct versions/lockfile across the API and the three Next.js applications. After remediation,
  rerun the production audit and the same abuse coverage; F12-T13 remains blocked until no unreviewed release
  findings remain.

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
# F01-R05 — browser session continuity before protected requests

Task ID: F01-R05
Completed at: 2026-10-08 21:42 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B15-R1
Reviewed by: Codex /root

Changed files:

- `packages/api-client/src/index.ts` and focused request-transport tests
- app/dashboard API clients, session managers, gates and focused session tests
- dashboard directory-settings API/UI and focused response-mapping tests
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Migrations, dependencies and generated API contract:

- none

Verification:

- API client build and tests: 1 file / 5 tests → PASS
- app tests: 12 files / 49 tests → PASS
- dashboard tests: 18 files / 62 tests → PASS
- app and dashboard typechecks → PASS
- app and dashboard production builds → PASS
- `git diff --check` and owned-path review → PASS

Result:

- Every protected app/dashboard request now asks the existing session manager for a valid memory-only access token
  immediately before sending. An expired token is renewed through the existing credentialed, single-flight refresh
  flow; concurrent callers share that refresh and receive the renewed bearer token.
- Refresh/login remain outside the session-aware transport, preventing recursion. Failed refresh removes the stale
  bearer and drives the existing anonymous redirect without persisting tokens in browser storage.
- Access-token TTL remains ten minutes and refresh-session absolute deadlines remain 24 hours or 30 remembered days.
  The authenticated screen is retained while a background renewal runs.
- Dashboard settings now render a 401 as session expiry and reserve the permission-denied message for a real 403.

Known limitation:

- The correction covers HTTP API requests. Existing long-lived socket reconnect behavior was not changed because it
  is outside the reported protected-page regression and the task's frozen scope.

Next task in the active batch:

- `F09-T04-R1` remains claimed and is now active; make catalog browse/search/detail public while retaining protected
  patient commerce mutations.

## F09-T04-R1 — public commerce catalog boundary

Task ID: F09-T04-R1
Completed at: 2026-10-09 01:30 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B15-R1
Reviewed by: Codex /root

Changed files:

- public commerce catalog controller/service plus focused API and OpenAPI contract tests
- app public store route group, protected app/onboarding layouts, optional session context and commerce adapter tests
- generated `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts`
- `plan/STATUS.md`, `plan/phases/12-PRODUCTION-HARDENING.md`, `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- disposable PostgreSQL workspace suite → PASS: 5/5 packages; API 95 files / 385 tests, app 12 / 50,
  dashboard 18 / 62, web 4 / 9 and API client 1 / 5
- API typecheck/build, app typecheck/production build and API-client build → PASS
- focused anonymous catalog, protected cart and OpenAPI security contract checks → PASS
- generated OpenAPI/client freshness, owned-path review and `git diff --check` → PASS

Result:

- **PASS / DONE.** Product browse, search and detail use no bearer token and resolve the deterministic active release
  clinic. Only active products, categories and SKUs are exposed; inactive and other-clinic records remain hidden.
- `/store` and product detail are public app routes. An optional authenticated session may add cart/wishlist state,
  but failure of that protected personalization cannot replace or hide the public catalog.
- Cart, wishlist, address, checkout, order and payment routes keep their existing authentication, ownership and
  authorization boundaries. Anonymous cart access is explicitly covered as `401`.
- No guest cart, role expansion, multi-clinic selector, Prisma migration or payment behavior was introduced.

Known limitation:

- The release contract still assumes one active clinic. Deterministic first-active-clinic selection prevents data
  mixing if inconsistent data temporarily contains more than one, but multi-clinic storefront selection remains out
  of scope.

Next work:

- No new batch is claimed. `F12-T05` and `F12-T07` remain blocked on external provider evidence; `F12-T09` remains
  dependency-gated. `F12-T11` and `F12-T12` remain unclaimed.

## F12-T02-R20 — shared-dev browser hydration and fast frontend sync corrective

Task ID: F12-T02-R20
Completed at: 2026-10-10 02:04 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R20
Reviewed by: Codex /root

Changed files:

- shared Next development-origin helper and all three frontend Next configurations
- shared-dev Compose environment, deployment lifecycle, examples and operator documentation
- focused origin, changed-watcher and release-pipeline contract tests
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- focused development-origin parser checks → PASS
- web, app and dashboard typechecks → PASS
- first, unchanged, dependency, API and individual web/app/dashboard sync simulations → PASS
- release-pipeline contract suite and shell syntax checks → PASS
- local Next 16 public-origin `/_next/hmr` handshake → `101 Switching Protocols`
- GitHub shared-dev sync run `38015897226` for commit `4ef2d24` → PASS
- fresh Chromium check on `https://dev.roxco.ir` → login/register visible, anonymous refresh `401`, no failed requests
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** The three Next development servers normalize the explicit `APP_ORIGINS` URLs into
  `allowedDevOrigins`, so remote HTTPS domains and configured LAN hostnames can establish the HMR connection required
  for client hydration.
- Shared-dev stays in true bind-mounted development mode and performs no full frontend build. A source-only change now
  recreates only the affected persistent watcher; dependency/runtime changes still recreate the complete compatible
  service set.
- Deployment now performs a browser-realistic WebSocket handshake with bounded CDN/watcher warm-up retries against
  every public frontend origin and records successful input hashes only after HTTP and HMR readiness pass.

Known limitation:

- A new public or LAN hostname still has to be added to the explicit origin environment. The deployment reuses the
  existing `APP_ORIGINS`, while a local workspace uses `NEXT_ALLOWED_DEV_ORIGINS` for Next and `APP_ORIGINS` for API
  CORS.

Next work:

- No server-side action remains for this corrective. Add future remote/LAN hostnames to the explicit Next/API origin
  lists before using them.

## F12-T12-R1 — public web self-hosted visual assets and mobile corrective

Task ID: F12-T12-R1
Completed at: 2026-10-10 02:33 UTC
Agent/Thread: Codex /root
Batch ID: F12-B12-R1
Reviewed by: Codex /root

Changed files:

- typed Lucide icon adapter and affected public-web content types
- self-hosted Yekan Bakh FaNum variable font plus Next local-font wiring and typography tokens
- public home page mobile boundary and hero heading typography
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none; the existing `lucide-react` package is used and no runtime asset service was added

Verification:

- `pnpm --filter @sabz/web test` → PASS: 5 files / 12 tests
- `pnpm --filter @sabz/web typecheck` → PASS
- `pnpm --filter @sabz/web exec next build --webpack` → PASS: four static routes
- Chromium widths 320, 390, 768 and 1440 → exact viewport width, zero horizontal document overflow
- browser asset check → local Yekan Bakh WOFF2 loaded, 56 Lucide SVGs, zero Material Symbols or external icon/font request
- mobile document boundary → footer bottom equals document height; no trailing page padding
- GitHub shared-dev sync run `38017448280` for commit `9453128` → PASS
- fresh public Chromium at 390px → same-origin Yekan Bakh, 56 Lucide SVGs, no failed requests/overflow/trailing space
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Missing Material Symbols can no longer become visible icon names or stretch mobile cards. Each
  existing icon token maps to a fitting local Lucide SVG and unsupported future tokens fail typecheck.
- Public web body and display headings use a preloaded, same-origin Yekan Bakh FaNum variable font with local system
  fallbacks, ligatures, kerning and antialiasing.
- The home wrapper clips decorative horizontal paint and no longer adds 80 pixels below the mobile footer.

Known limitation:

- This focused corrective does not complete the broader `F12-T12` browser/device/accessibility release matrix.

Next work:

- No server-side action remains for this corrective.

## F12-T12-R2 — public web alert severity color corrective

Task ID: F12-T12-R2
Completed at: 2026-10-10 19:08 +03:30
Agent/Thread: Codex /root
Batch ID: F12-B12-R2
Reviewed by: Codex /root

Changed files:

- public-web semantic color tokens
- inline authentication error alert styling
- Sonner severity variant styling
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- `pnpm --filter @sabz/web test` → PASS: 5 files / 12 tests
- `pnpm --filter @sabz/web typecheck` → PASS
- `pnpm --filter @sabz/web exec next build --webpack` → PASS: four static routes
- Chromium login flow with unavailable API → Persian auth error rendered through `role=alert` with red
  foreground/background/border
- Chromium information toast → blue foreground/background/border
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Existing API error codes and Persian message mapping are unchanged. Their inline authentication
  presentation now has an explicit destructive theme token and a stronger red visual treatment.
- Sonner no longer forces every severity onto the neutral card palette: success is green, information is blue,
  warning is amber and error is red; default/loading notices remain neutral.

Known limitation:

- This focused corrective does not complete the broader `F12-T12` browser/device/accessibility release matrix.

Next work:

- Push `dev`, observe shared-dev sync and verify the public login failure state.

## F12-T02-R21 — shared-dev stalled frontend recovery

Task ID: F12-T02-R21
Completed at: 2026-10-10 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R21
Reviewed by: Codex /root

Changed files:

- bounded frontend readiness and one-time watcher recovery in `deploy/vps/deploy-dev.sh`
- stalled-app recovery regression coverage in `scripts/test-vps-dev.sh`
- release contract assertions and operator documentation
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- `bash -n deploy/vps/deploy-dev.sh scripts/test-vps-dev.sh` → PASS
- `bash scripts/test-vps-dev.sh` → PASS, including six simulated app timeouts followed by isolated recovery
- `pnpm release:test` → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** A Next development watcher that starts at the container level but does not answer HTTP can no
  longer hold the workflow for repeated 30-second requests over tens of minutes.
- Deployment prints service/container/OOM diagnostics, deletes only that application's derived `.next` cache,
  recreates only that watcher once and runs a bounded second readiness window before accepting or rejecting source.

Known limitation:

- Recovery intentionally runs only once; a persistent application error fails deployment and keeps its diagnostics.

Next work:

- Push `dev`, verify the shared environment and record the external run outcome.

## F12-T02-R22 — stabilize the shared-dev app watcher

Task ID: F12-T02-R22
Completed at: 2026-10-10 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R22
Reviewed by: Codex /root

Changed files:

- shared-dev `apps/app` watcher command in `deploy/vps/dev-service.sh`
- release command contract and operator documentation
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- shell syntax and `bash scripts/test-vps-dev.sh` → PASS
- `pnpm release:test` → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** Live recovery diagnostics proved the app served a root request but Turbopack repeatedly exited
  cleanly after reporting `next.config.ts` changes (`RestartCount=16`, `OOM=false`).
- Only the app now uses Next's webpack development compiler, retaining development HMR while avoiding the observed
  Turbopack/bind-mount restart loop. Web and dashboard keep their existing default compiler.

Known limitation:

- This is deliberately scoped to the live-failing app watcher; it does not change production builds.

Next work:

- Push `dev` and verify all shared-dev frontend origins plus the public app HMR handshake.

## F12-T02-R23 — remove shared-dev frontend memory ceilings

Task ID: F12-T02-R23
Completed at: 2026-10-10 UTC
Agent/Thread: Codex /root
Batch ID: F12-B02-R23
Reviewed by: Codex /root

Changed files:

- restored the original shared-dev app Next command in `deploy/vps/dev-service.sh`
- removed frontend-only memory limits from `deploy/vps/compose.dev.yaml`
- release policy assertion and operator documentation
- `plan/STATUS.md` and `plan/logs/phase-12.md`

Migrations and dependencies:

- none

Verification:

- local app root compilation with Next webpack for diagnosis → PASS in 8 seconds, approximately 1.07 GiB
  `next-server` RSS
- shell syntax and `bash scripts/test-vps-dev.sh` → PASS
- `pnpm release:test` → PASS
- `git diff --check` and owned-path review → PASS

Result:

- **PASS / DONE.** The previous 768 MiB cgroup ceiling was below the measured memory demand of the app's first root
  compilation, so freeing host memory could not help the container. Web, app and dashboard may now use available host
  RAM in shared dev.
- App again uses the original default Next development compiler; this corrective does not change compilation mode,
  production builds, API/database limits or staging configuration.

Known limitation:

- Host-level capacity still must be sufficient; stopped staging containers now make that capacity available to dev.

Next work:

- Push `dev`, verify the shared-dev sync and all public frontend origins.

## F12-T12-R3 — Dashboard operational truthfulness and responsive navigation

Date: `2026-10-10 UTC`

Scope:

- removed fabricated order/message/bot counters and the unconditional message indicator;
- removed mock marketing, automation and bot routes from operational navigation and made direct visits explicitly
  unavailable without rendering sample data;
- exposed the real audit viewer, removed the inert global search, and rendered session-backed account identity;
- resolved the authorized clinic from `/v1/admin/clinic` for CRM instead of accepting a pasted UUID;
- replaced raw chat appointment UUID entry with the real authorized appointment list while retaining server-side chat
  authorization;
- separated health patient-list failure from a valid empty list and added responsive dashboard navigation.

Changed paths:

- `apps/dashboard/src/{app/(app)/**,components/layout/**,features/{health-tracking,messages,store-crm}/**,lib/**}`
- `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`

Verification:

- dashboard Vitest → PASS, `20` files and `66/66` tests;
- dashboard TypeScript and ESLint → PASS;
- operational route/mock and fabricated-badge scans → PASS;
- `git diff --check` → PASS;
- direct `tsc --showConfig` → valid JSON and dashboard `tsc --noEmit` → PASS;
- Next production build could not run inside this executor: Turbopack child CSS processing cannot bind an internal
  port and the webpack path cannot capture child-process `tsc --showConfig` stdout. Both are executor restrictions;
  shared-dev/CI route compilation remains the post-push external verification.

Result:

- **PASS / DONE pending external compile observation.** Operational dashboard navigation no longer reports fabricated
  counts or presents mock feature data as real. Existing API authorization remains authoritative and no backend,
  database, OpenAPI or generated-client contract changed.

Next work:

- Push `dev`, watch the shared-dev workflow, and request representative dashboard routes from
  `https://dev-dashboard.roxco.ir` to confirm compilation.

## F12-T12-R4 — Dashboard settings workflow corrective

Date: `2026-10-10 UTC`

Problem and accepted behavior:

- the old UI created a doctor without a specialty and then attempted to publish it without `specialtyIds`, which the
  accepted API correctly rejects;
- specialties were created as unpublished but had no publish action, so the doctor publication prerequisite could not
  be completed from the dashboard;
- doctor, offering, availability and leave forms shared selection/date state, mutation errors discarded stable API
  codes, fields remained populated after success, and a successful write followed by refresh failure looked like a
  failed write;
- payment credential failures produced no user-facing result.

Implementation:

- added a server-confirmed five-step progress model for published specialty, doctor, service, offering and schedule;
- new specialty/doctor/service/offering records are created active and published with all accepted parent
  prerequisites, while legacy drafts receive explicit completion actions;
- preserved directory/scheduling error codes and mapped duplicate name/offering, invalid publication, invalid input
  and overlap cases to Persian messages;
- separated all form state, converted user-facing toman to the API's IRR contract, named ISO weekdays, retained old
  data when a post-write refresh fails, and moved payment configuration into a collapsed advanced section;
- directory settings now request up to 100 records per accepted list endpoint instead of silently relying on the
  smaller default page.

Verification:

- dashboard Vitest → PASS, `21` files and `69/69` tests;
- dashboard TypeScript and ESLint → PASS;
- settings publication/placeholder scan and `git diff --check` → PASS;
- focused tests cover draft-vs-operational progress, full readiness, specialty publication transport and stable API
  error preservation;
- Next production build remains unavailable in this executor because Next child-process stdout is suppressed; live
  shared-dev `/settings` compilation is the external post-push gate.

Result:

- **PASS / DONE pending external compile observation.** No API, database, OpenAPI, generated-client, permission or
  payment activation contract changed.

Next work:

- Push `dev`, observe the shared-dev sync and request `https://dev-dashboard.roxco.ir/settings`.

## F12-T12-R5 — Dashboard settings pagination contract corrective

Date: `2026-10-10 UTC`

Problem and diagnosis:

- an authenticated Chromium run against `https://dev-dashboard.roxco.ir/settings` confirmed login and refresh both
  returned `200`, so session continuity and account access were valid;
- `/v1/admin/clinic` returned `200`, while all seven paginated directory/scheduling requests returned
  `400 BAD_REQUEST` with `pageSize must not be greater than 50` because the dashboard sent `pageSize=100`;
- `loadDirectorySettings` intentionally aggregates the required sources, so those invalid queries correctly surfaced
  as the generic settings load failure. The R4 assumption that `100` was accepted was incorrect.

Implementation:

- aligned the shared settings list query with the existing API maximum `pageSize=50`;
- extended the adapter regression test to inspect every emitted list URL and require `page=1&pageSize=50`;
- kept API, OpenAPI, database, session, role and permission contracts unchanged.

Verification:

- focused directory settings adapter test → PASS, `7/7` tests;
- full dashboard Vitest → PASS, `21` files and `69/69` tests;
- dashboard TypeScript and ESLint → PASS;
- `git diff --check` → PASS.

Result:

- **PASS / DONE pending post-push shared-dev observation.** The authenticated failure is a frontend/API pagination
  mismatch, not a session, credential or authorization failure.

Next work:

- Push `dev`, observe the shared-dev deployment, and repeat the authenticated browser run to confirm all settings list
  requests return `2xx` and the settings workflow renders.

## F12-T12-R6 — Responsive settings overview and focused editors

Date: `2026-10-10 UTC`

Problem and accepted behavior:

- every settings form was expanded on initial load, making operational status difficult to scan and exposing all
  mutations at once;
- settings must open read-first with server-backed clinic/status summaries, then require an explicit category choice
  before any editable control is shown;
- the selected editor must remain usable on narrow mobile and desktop viewports, keep keyboard focus inside, close by
  Escape/backdrop when idle, and discard unsaved drafts when closed.

Implementation:

- replaced the long initial form stack with a clinic overview, four operational counts, five readiness indicators and
  eight descriptive category cards;
- moved clinic, specialty, doctor, service, offering, schedule, closure/leave and payment forms into one focused
  responsive dialog: full-height on mobile and bounded/scrollable on desktop;
- added focus restore/trapping, body scroll lock, Escape/backdrop close, disabled close during directory/scheduling
  writes and draft reset on open/close;
- preserved every existing API mutation, validation, publication prerequisite, server refresh and stable error message.

Verification:

- dashboard Vitest → PASS, `21` files and `69/69` tests;
- dashboard TypeScript and ESLint → PASS;
- `git diff --check` → PASS.

Result:

- **PASS / DONE pending post-push responsive browser observation.** No API, database, OpenAPI, generated-client,
  authentication, authorization or payment activation contract changed.

Next work:

- Push `dev`, observe deployment, and verify overview/editor behavior at desktop and mobile widths without submitting
  any mutation.


## F12-T12-R7 — Complete settings lifecycle and Sadad credential contract

Date: `2026-10-10 UTC`

Problem and accepted behavior:

- settings records could be created and some could be published, but existing tariffs, schedules, closures and other directory records had no complete edit/delete lifecycle in the dashboard;
- destructive actions must be explicit and dependency-aware, while records already used by bookings or other settings must remain available for deactivation;
- the Sadad editor exposed one ambiguous secret although the runtime adapter requires Merchant ID, Terminal ID and a Base64 TripleDES Terminal Key.

Implementation:

- connected every existing directory and scheduling PATCH/DELETE endpoint to the settings UI, with prefilled edit forms, activate/deactivate controls, inline confirmed deletion and actionable `DIRECTORY_RECORD_IN_USE` feedback;
- made doctor specialties multi-select, made every tariff field editable, and distinguished doctor leave from additional availability in schedule exceptions;
- added typed dashboard adapters for scheduling updates and all supported deletes, including correct handling of empty `204` responses;
- replaced the Sadad secret input with the three issued credential fields and clear replacement/write-only behavior;
- defined the three-field credential DTO in the API/OpenAPI contract, made it required, rejected missing/extra/invalid data, verified the terminal key decodes to exactly 24 bytes, and retained encrypted revision rotation without exposing secret values;
- regenerated the checked-in OpenAPI document and TypeScript client.

Verification:

- API test TypeScript → PASS;
- API OpenAPI contract → PASS, `7/7` tests;
- API production TypeScript/OpenAPI export and generated API-client build → PASS;
- dashboard TypeScript and targeted ESLint → PASS;
- dashboard Vitest → PASS, `22` files and `73/73` tests;
- `git diff --check` → PASS;
- default Next/Turbopack production build could not open its internal CSS worker port in the restricted workspace (`Operation not permitted`); direct TypeScript, ESLint and all dashboard tests passed. The webpack fallback reached Next's TypeScript config probe but hit the repository/toolchain `--showConfig` parsing failure.

Result:

- **PASS / DONE pending post-push shared-dev browser observation.** Payment enablement remains blocked and no migration, role or permission change was introduced.

Next work:

- push `dev`, observe the deployment, then inspect settings cards/editors on desktop and mobile and confirm the three Sadad labels without submitting real credentials.

## F12-T12-R8 — Payment adapter control center and callback guidance

Date: `2026-10-11 UTC`

Problem and accepted behavior:

- payment settings were a Sadad-only credential form and did not expose the registered adapters, per-adapter state, default selection or environment callback information;
- the dashboard must derive public callback guidance from the current environment's public API URL, not from the dashboard/browser origin;
- disabling payment must remain available as an emergency action, while enabling a provider must respect the server-owned `goLiveReady` gate.

Implementation:

- replaced the single form with a registry-driven adapter overview, aggregate online-payment state, adapter cards and a focused adapter detail view;
- added per-adapter enable/disable and default-provider controls through the existing authorized provider-config endpoint, plus a payment-wide off action that disables all currently enabled adapters;
- made provider disable clear `isDefault` atomically so a disabled adapter cannot remain the default;
- added the Sadad credential editor inside its adapter detail and retained encrypted write-only revision rotation;
- added copyable callback, PaymentRequest and Verify addresses, readiness explanation and capability summary;
- built callback URLs from dashboard `PUBLIC_API_URL`, producing `https://dev-api.roxco.ir/v1/payments/providers/sadad/callback` in shared dev and the equivalent API origin in each other environment.

Verification:

- dashboard TypeScript and targeted ESLint → PASS;
- dashboard Vitest → PASS, `22` files and `75/75` tests;
- API test TypeScript → PASS;
- API OpenAPI contract → PASS, `7/7` tests;
- shared-dev runtime config inspection confirms `apiUrl=https://dev-api.roxco.ir`;
- `git diff --check` → PASS.

Result:

- **PASS / DONE pending post-push shared-dev browser observation.** Sadad enable/default remains unavailable while `goLiveReady=false`; no transport, payment-attempt, schema, migration, OpenAPI or credential-storage contract changed.

Next work:

- push `dev`, observe deployment, then inspect adapter overview/detail and responsive callback/credential layouts without entering real credentials.

## F12-T12-R9 — Sadad live runtime and administrator activation

Date: `2026-10-11 UTC`

Problem and accepted behavior:

- the Sadad adapter had a complete dormant protocol implementation, but Nest always registered a blocked transport and
  patient checkout could never receive a provider redirect;
- deployment permission to contact Sadad and clinic administrator enable/default state must remain separate controls;
- callbacks for an attempt already created must remain verifiable after an administrator disables new attempts, and no
  redirect or browser callback may create a financial effect without a matching server-to-server Verify.

Implementation:

- added validated `disabled/live` runtime configuration, bounded request timeout, exact public API callback, result URL
  and code-owned redirect profile; Compose and environment examples pass only these non-secret controls;
- wired the live Nest adapter to the fixed Sadad PaymentRequest and Verify HTTPS endpoints, retaining encrypted
  Merchant ID, Terminal ID and Terminal Key revisions in the database;
- connected patient payment creation to the enabled/default operational revision, moved the external request outside
  the database transaction, returned the allowlisted Sadad redirect to the app and made concurrent idempotent callers
  wait for the same attempt result rather than issuing another OrderId;
- implemented the public form callback, bounded its IP/order replay rate, correlated OrderId/Token, loaded the immutable
  credential revision, ran Verify and redirected with only the internal order ID; `0/100` are authoritative success,
  `-1/101` are non-success, and timeout/unknown results remain `REQUIRES_RECONCILIATION` on the same attempt;
- made a live runtime expose activation availability to Dashboard; enabling a dormant configured provider atomically
  promotes the credential reference into a new immutable `RIAL/goLiveReady` revision, while disabling clears default
  state and blocks only new attempts;
- regenerated OpenAPI/client artifacts, aligned the release/protocol contracts with the owner's explicit live-runtime
  authorization, and added `deploy/sadad-live-runbook.md` with the exact shared-dev callback/result values.

Verification:

- clean disposable PostgreSQL 16: all `33` migrations plus development seed → PASS;
- live provider configuration/activation/callback rate-limit integration → PASS, `1/1`;
- disabled-mode checkout, concurrent idempotency, Verify `0/100/-1/101`, timeout, unknown response, mismatch and
  exactly-one financial effect integration → PASS, `2/2`;
- API test TypeScript and focused config/adapter/runtime/contract/OpenAPI suite → PASS, `5` files and `27/27` tests;
- OpenAPI contract → PASS, `7/7`; generated API client drift check and TypeScript → PASS;
- app TypeScript and Vitest → PASS, `13` files and `52/52` tests;
- dashboard TypeScript, targeted ESLint and Vitest → PASS, `22` files and `75/75` tests;
- API production TypeScript/OpenAPI export and `git diff --check` → PASS.

Result:

- **PASS / DONE.** The repository is live-capable and defaults every deployment to `disabled`. No real credential was
  committed or logged, no external Sadad request was made, and no shared/production environment was mutated.

External activation:

- deploy the commit, apply the runbook values with the exact merchant-confirmed redirect profile, then use Dashboard to
  rotate the three credentials, enable Sadad and select it as default before the controlled low-value acceptance test.

## F12-T12-R10 — Shared-dev API artifact integrity corrective

Task ID: `F12-T12-R10`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F12-B12-R10`
Reviewed by: `Codex /root`

Changed files:

- `deploy/vps/compose.dev.yaml`
- `deploy/vps/deploy-dev.sh`
- `deploy/vps/dev-service.sh`
- `scripts/test-vps-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none.

Tests run:

- `bash -n deploy/vps/deploy-dev.sh deploy/vps/dev-service.sh scripts/test-vps-dev.sh` → PASS.
- `bash scripts/test-vps-dev.sh` → PASS, including an incoherent artifact marker on an unchanged source tree.
- `node scripts/test-release-pipeline.mjs` → PASS.
- `git diff --check` → PASS.

Result:

- an API artifact is accepted only when `apps/api/dist/main.js` exists and `dist/.source.sha256` matches the current
  API input fingerprint;
- compilation removes the whole stale dist directory and writes the marker only after TypeScript emits successfully;
- a same-SHA workflow rerun repairs stale JavaScript and recreates the API container instead of trusting state alone;
- Sadad still defaults to `disabled`, while the explicitly authorized runtime value `live` remains deployable.

Known limitations:

- the real VPS readiness observation occurs after this commit is pushed; the repository tests use an isolated fake
  Docker/Compose boundary and do not read or log any server runtime secret.

Next task:

- observe the shared-dev deployment and then complete the controlled Sadad credential/enablement acceptance flow.

## F12-T12-R11 — Shared-dev bootstrap control propagation corrective

Task ID: `F12-T12-R11`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F12-B12-R11`
Reviewed by: `Codex /root`

Changed files:

- `deploy/vps/compose.dev.yaml`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none.

Tests run:

- `node scripts/test-release-pipeline.mjs` → PASS.
- `bash -n deploy/vps/deploy-dev.sh deploy/vps/dev-service.sh scripts/test-vps-dev.sh` → PASS.
- `bash scripts/test-vps-dev.sh` → PASS.
- `git diff --check` → PASS.

Result:

- Compose now passes dependency install, seed, API client build, Prisma generation, migration, API compile, API source
  fingerprint and public runtime-config controls into the one-shot bootstrap container;
- the prior host-shell-only flags can no longer silently evaluate to `false` inside bootstrap;
- the contract test checks every required Compose mapping and would fail if one is removed.

Known limitations:

- GitHub run `38113797757` provided the failure evidence; the repaired VPS observation follows the corrective push.

Next task:

- observe shared-dev API readiness, then continue the controlled Sadad credential/enablement acceptance flow.

## F12-T12-R12 — Shared-dev bootstrap state reconciliation corrective

Task ID: `F12-T12-R12`
Completed at: `2026-10-11 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F12-B12-R12`
Reviewed by: `Codex /root`

Changed files:

- `deploy/vps/deploy-dev.sh`
- `scripts/test-vps-dev.sh`
- `scripts/test-release-pipeline.mjs`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- no new migration; existing pending migrations are applied only through `prisma migrate deploy`.

Tests run:

- `bash -n deploy/vps/deploy-dev.sh deploy/vps/dev-service.sh scripts/test-vps-dev.sh` → PASS.
- `bash scripts/test-vps-dev.sh` → PASS, including runtime-contract state reconciliation.
- `node scripts/test-release-pipeline.mjs` → PASS.
- `git diff --check` → PASS.

Result:

- `deploy-dev.sh` itself now participates in the runtime fingerprint, so orchestration changes cannot reuse a state
  written by an older contract;
- a runtime-contract change forces API client build, Prisma generation, `prisma migrate deploy`, clean API compile and
  public runtime-config generation before service recreation;
- this repairs the stale state that allowed new refresh-session SQL to run before its existing versioned migration.

Known limitations:

- the live authenticated refresh acceptance check follows deployment because it requires the server database and an
  actual browser session; no credential or token is recorded in repository evidence.

Next task:

- verify shared-dev API health and browser refresh, then continue controlled Sadad activation.

## F01-R06-C — OTP-first web and SMS settings UX

Task ID: `F01-R06-C`
Completed at: `2026-10-12 UTC`
Agent/Thread: `Codex /root`
Batch ID: `F01-B06-C`
Reviewed by: `Codex /root`

Changed files:

- `apps/web/src/components/auth/{LoginForm,SignupForm,OtpAuthForm}.tsx`
- `apps/web/src/services/auth.{ts,test.ts}`
- `apps/dashboard/src/features/settings/{settings-page,sms-settings}.tsx`
- `apps/dashboard/src/lib/sms-settings-api.ts`
- `tests/e2e/phase-12/otp-auth.spec.ts`
- `playwright.otp.config.ts`

Migrations:

- none; the OTP/SMS schema migration and API contract are owned by `F01-R06-A/B`.

Tests run:

- web typecheck → PASS; web Vitest → 5 files / 13 tests PASS.
- dashboard typecheck → PASS; dashboard Vitest → 22 files / 75 tests PASS.
- API typecheck → PASS.
- Chrome browser OTP E2E with intercepted fake transport → 2/2 PASS: request, code input, credentialed verify response,
  refresh cookie and patient-app redirect; password UI regression also passed. No external provider or real SMS was used.
- `next build --webpack` for web and dashboard → PASS.
- `git diff --check` → PASS.

Result:

- login and signup present OTP first and retain password as the explicit alternate route; OTP form supports normalized Persian digits,
  browser autofill/paste, expiry/resend, phone correction, Persian errors and role-aware redirects.
- ADMIN has a responsive read-first SMS settings panel with dynamic provider fields, write-only secret preservation, enable/default,
  controlled connection/test-SMS actions, OTP policy and safe delivery-attempt history.
- default runtime remains fail-closed until an authorized administrator supplies credentials and enables a live provider.

Known limitations:

- plain Turbopack build could not run in the managed sandbox because its CSS worker attempts a forbidden local port bind;
  the equivalent webpack production builds and real Chromium E2E passed.

Deployment observation:

- GitHub Action [38173139936](https://github.com/Drshirmardi/mushroom/actions/runs/38173139936) for `23ffeae` passed in
  2m40s on `2026-10-12`.
- `https://dev-api.roxco.ir/v1/health/ready` returned `{"status":"ok"}` and `https://dev.roxco.ir/login` returned HTTP 200.

## F01-R06-B-R1 — حفظ کدهای پایدار خطای API و تکمیل قرارداد OTP

Task ID: F01-R06-B-R1
Completed at: 2026-10-12 Asia/Tehran
Agent/Thread: Codex /root
Batch ID: F01-B06-B-R1
Reviewed by: Codex /root

Changed files:

- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
- `apps/api/test/http-exception.filter.spec.ts`
- `apps/api/test/otp-error-contract.integration.spec.ts`
- `apps/api/test/openapi-contract.spec.ts`
- `apps/api/test/treatment-plan.integration.spec.ts`
- `apps/web/src/services/auth.ts`
- `apps/web/src/services/auth.test.ts`
- `packages/api-client/openapi.json`
- `packages/api-client/src/schema.generated.ts`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

Migrations:

- none.

Tests run:

- API typecheck → PASS.
- Filter, OpenAPI contract and OTP HTTP integration tests → 3 files / 11 tests PASS; wrong OTP returns HTTP 401 with `OTP_INVALID`.
- Treatment plan integration → 1 file / 3 tests PASS, including registered `CLINICAL_RESOURCE_FORBIDDEN` response.
- API client generation, tests (5/5) and build → PASS.
- Web typecheck and tests (5 files / 14 tests) → PASS.
- `git diff --check` → PASS.
- Full API suite was attempted; it exposed unrelated reminders/outbox and database-fixture/config failures (including suites without `DATABASE_URL`). These remain outside this task and are not represented as passing.

Result:

- Stable literal API error codes are recognized instead of being collapsed into status fallbacks; unknown codes retain the fallback behavior.
- OTP response codes are documented in runtime OpenAPI and generated client types, with UI messages for the OTP account-provisioning and idempotency errors.
- Attachment assessment: the core diagnosis was correct, but limiting the fix to OTP-only registry entries would leave other emitted literal API errors unmapped. The registry now covers those literals as well; non-error role constants are excluded.

Known limitations:

- The broader API test suite has pre-existing/environment-dependent failures described above; focused task acceptance checks pass.

Next batch:

- No batch started; continue the existing Phase 12 eligibility/blockers after this handoff.

## F12-T06-R1 — Store product media backend foundation

Task ID: F12-T06-R1
Status: DONE (backend development slice only)
Completed at: 2026-10-14 Asia/Tehran
Batch ID: F12-MEDIA-B01A / Store Phase 04A
Agent/Thread and reviewer: Codex /root, Store media chat (one agent)
Authority: explicit product-owner storage re-entry approval, recorded in ADR-0015 and the historical F12-T06 decision addendum. Dependencies complete; no competing active owner. Initial-release N/A and independently blocked F12-T05/F12-T07 remain unchanged.
Task commit: `feat(F12-T06-R1): add private product media backend` (created after this evidence and final diff gate).

### Changed files

- `apps/api/.env.example`
- `apps/api/package.json`
- `pnpm-lock.yaml`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261014120000_store_product_image/migration.sql`
- `apps/api/src/app.factory.ts`
- `apps/api/src/common/errors/api-error.ts`
- `apps/api/src/config/environment.validation.ts`
- `apps/api/src/modules/commerce/media/product-image.dto.ts`
- `apps/api/src/modules/commerce/media/product-image.errors.ts`
- `apps/api/src/modules/commerce/media/product-image-processor.ts`
- `apps/api/src/modules/commerce/media/product-image-storage.ts`
- `apps/api/src/modules/commerce/media/product-image-storage.module.ts`
- `apps/api/src/modules/commerce/media/product-image.service.ts`
- `apps/api/src/modules/commerce/media/product-image.controller.ts`
- `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.dto.ts`
- `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts`
- `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.service.ts`
- `apps/api/src/modules/commerce/catalog/patient-commerce-catalog.dto.ts`
- `apps/api/src/modules/commerce/catalog/patient-commerce-catalog.service.ts`
- `apps/api/src/modules/commerce/cart/patient-commerce-cart.service.ts`
- `apps/api/src/modules/outbox/outbox.module.ts`
- `apps/api/src/modules/outbox/outbox.worker.ts`
- `apps/api/src/modules/outbox/product-image-cleanup.handler.ts`
- `apps/api/test/product-image-configuration.spec.ts`
- `apps/api/test/product-image-processor.spec.ts`
- `apps/api/test/product-image-storage.spec.ts`
- `apps/api/test/product-image.integration.spec.ts`
- `apps/api/test/product-image-migration.integration.spec.ts`
- `deploy/docker/api-entrypoint.mjs`
- `packages/api-client/openapi.json`
- `packages/api-client/src/schema.generated.ts`
- `plan/decisions/ADR-0015-store-product-media-development.md`
- `plan/contracts/store-product-media-v1.md`
- `plan/contracts/phase-12-object-storage-decision.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/STATUS.md`
- `plan/logs/phase-12.md`

No dashboard/app source, protected slider-data.ts/justforcheck.md, historical migration, existing test assertion or unrelated user change was modified. Start baseline: branch `front`, clean HEAD `0e9141b16cc5e23ba5412bbc868791797656ef2c`.

### Migration and compatibility

New additive table `commerce_product_images` and READY/DELETE_PENDING enum; unique product ID and object key, restrict FK, WebP/size/dimension checks. Existing CommerceProduct/SKU data and relations are preserved. No backfill or binary database column. Products without an image return nullable metadata. The optional nullable DTO addition preserves existing generated-client consumers.

PostgreSQL 16 disposable container `mushroom-media-04a`, localhost port 55439/database media_04a and synthetic credentials: all 36 migrations and seed PASS. Upgrade test separately replays all 35 prior migrations into its own randomly named database, creates an old product, applies the new migration, proves the product unchanged with image:null, and checks uniqueness/WebP/dimension constraints. Test guard refuses other hosts/ports/databases; only its own database is dropped. The owned test container and its image-created anonymous data volume were removed after verification, with no remaining container using that volume. No existing development/production database was accessed.

### Implementation and review

- Installed runtime inspected: NestJS 11.2.7/Fastify 5.12.5; official `@fastify/multipart` 10.1.3 request.parts handles multipart PUT. No Express upload interceptor. AWS SDK v3 client-s3 3.1151.0 and sharp 0.35.5 are backend dependencies; no Uppy/UI dependency installed.
- One primary processed image per product. JPEG/PNG/WebP extension/MIME/signature/decode validation; one file named file, optional altText <=240 chars; 5 MiB, 20 million input pixels, max8192px input side; animated/unsupported/malformed rejection. WebP output max1600px with metadata stripped. Original buffers are transient only.
- Existing authentication/COMMERCE_MANAGE and active-clinic product ownership; mutation audit. Per-instance maximum two uploads, 30s operation deadline, image processing timeout, bounded storage/body read and existing DB-backed IP/user rate limiter.
- If-Match image generation plus durable fingerprint/result idempotency. Product-row lock serializes publication; a failed/concurrent replacement cannot overwrite the committed image. Cleanup intent commits before any R2 write; unknown writes remain unpublished and get reclaimed after the upload deadline plus safety delay. Old-key cleanup never removes a current READY reference and deletes pending DB metadata only for the matching generation. Outbox retries survive worker restarts.
- Controlled public reads require current READY image, active clinic/product/category and an active SKU; eligibility is checked again after remote I/O. Admin preview supports drafts with permission/ownership. Bytes use no-store and nosniff, and no object key/provider URL is returned. R2 errors are redacted.
- Validated disabled-by-default config with incomplete enabled config rejected, server-side _FILE credential injection and production-mode activation blocked. No real R2 connection, credentials request or deployment.
- Existing export/generation scripts produced OpenAPI and typed clients; no manual edits to generated contracts.
- Main-agent review PASS: implementation, acceptance criteria, ownership, transaction/cleanup boundaries, fault/concurrency assertions, generated contract and combined diff. All required backend gates passed; no remaining backend blocker.

### Verification

- `prisma generate` and disposable-DB `prisma migrate deploy`/seed -> PASS.
- `pnpm generate:api-client` -> PASS (includes API build/typecheck and runtime OpenAPI export).
- `pnpm --filter @sabz-zendegi/api-client build` -> PASS (freshness and TypeScript).
- API `tsc -p tsconfig.test.json --noEmit` -> PASS; rerun after final test-fixture cleanup change -> PASS.
- Sequential API Vitest selection -> 10 files / 44 tests PASS: product-image processor/configuration/storage/integration/migration; existing patient-commerce-catalog, patient-cart.authorization, admin-commerce-catalog, environment-validation and openapi-contract.
- Final product-image-configuration repeat -> 3/3 PASS, including child-process file-backed secrets without printing values. This repeat is not counted as additional distinct tests.
- `pnpm --filter @sabz-zendegi/api-client test` -> 5/5 PASS and generated freshness PASS.
- `graphify update .` -> PASS, AST-only/no LLM calls; graph outputs remain ignored. Existing optional SQL/HCL parser omissions and unrelated chat extraction warning were reported by the tool and were not changed by this task.
- `git diff --check` and staged diff gate -> PASS.

The integration suite covers success/normalized bytes, no-image null/ETag and OpenAPI schema, unauthorized/staff/cross-clinic access, invalid/oversized/extra-file uploads, disabled/rate-limit/busy states, replace/remove, concurrent 412, committed replay and changed-key conflict, pending/expired attempt replay, ambiguous R2 failure, DB failure after put, durable orphan cleanup and cleanup retry through the actual worker, old cleanup versus a later generation, catalog/cart/wishlist metadata, and draft/category/SKU/clinic visibility (including visibility changed during remote read).

### Known limits and exact Batch 01B handoff

No live R2 connectivity/IAM/private-bucket configuration or Linux deployment/native sharp runtime was tested; no UI/browser end-to-end acceptance occurred. Limits are per API instance. Production retention, recovery and activation require separate approval. Backend acceptance does not make Store media production-ready. Historical initial-release gates remain independent.

Batch 01B is the next Store slice, not started here. It must claim its own task/paths and use existing dashboard components/session refresh with Uppy core/react Headless + xhr-upload and Persian/RTL localization; do not build an upload engine. Contract: [store-product-media-v1](../contracts/store-product-media-v1.md).

1. GET `/v1/admin/commerce/products/{productId}/image` returns metadata or null and ETag (`"none"` or quoted image UUID). CORS exposes ETag. Keep this as the version for the next intent.
2. PUT that path with exactly one multipart `file` and optional altText, Bearer auth, If-Match and idempotency-key. Snapshot the payload, original ETag and operation key for retries; do not change headers/body for a replay. 200 returns committed metadata and ETag. Refetch current metadata after completion/replay because another operation may already have advanced the generation.
3. DELETE that path with If-Match/idempotency-key; 204 hides the image immediately. Refresh metadata afterward. Concurrent mutations return 412; reload before a new user intent. Pending operation returns 409 COMMERCE_IMAGE_OPERATION_PENDING; expired returns 409 COMMERCE_IMAGE_OPERATION_EXPIRED and requires reload/new operation key. Changed payload with the same key returns IDEMPOTENCY_KEY_REUSED. Do not silently resubmit conflicts as fresh mutations.
4. Admin preview GET adds `/content` and needs Bearer auth; fetch through the authenticated client as a blob, release object URLs, and respect no-store. Private R2 URLs/object keys never reach UI. Customer DTO contentPath is for Batch 01C, not this dashboard task.
5. Show actual progress, preview, errors, retry, replacement/removal and busy/disabled states using existing styling. Client restrictions improve UX; backend remains authoritative. Reuse existing refresh flow for expired access tokens. Avoid XHR/OpenAPI JSON serialization of binary FormData.
6. Dashboard integration and eventual customer integration require their own focused tests/acceptance. No live bucket test or production switch is implied by this handoff. Stop at the backend task commit; no Batch 01B/01C execution.

## F12-T06-R2 — Dashboard product image uploader

Task ID: F12-T06-R2
Status: DONE (Phase04B / development dashboard slice only)
Completed at: 2026-10-14 Asia/Tehran
Batch ID: F12-MEDIA-B01B
Agent/Thread and reviewer: Codex /root, Store media chat; one agent, no subagents
Approval: explicit product-owner Phase04B Dashboard Product Image Uploader request. Dependency F12-T06-R1 DONE, frozen store-product-media-v1 and ADR-0015 remain unchanged. No ownership conflict. Historical initial-release N/A, Phase12 state and unrelated blockers remain intact.
Baseline: clean branch front, commit 44d472ee355775015b7c0d9e5b2ec7e66ae2c7d5.
Task commit: `feat(F12-T06-R2): add dashboard product image uploader`, created after this evidence/final staged review gate.

### Changed files

- `apps/dashboard/package.json`
- `pnpm-lock.yaml`
- `apps/dashboard/src/components/auth/dashboard-session-gate.tsx`
- `apps/dashboard/src/features/store/store-page.tsx`
- `apps/dashboard/src/features/store/product-image-editor.tsx`
- `apps/dashboard/src/features/store/product-image-controller.ts`
- `apps/dashboard/src/features/store/product-image-controller.spec.ts`
- `apps/dashboard/src/lib/commerce-product-image-api.ts`
- `apps/dashboard/src/lib/commerce-product-image-api.spec.ts`
- `apps/dashboard/e2e/product-image-browser.mjs`
- `apps/dashboard/e2e/product-image.spec.ts`
- `apps/dashboard/e2e/playwright.product-image.config.ts`
- `plan/STATUS.md`
- `plan/phases/12-PRODUCTION-HARDENING.md`
- `plan/logs/phase-12.md`

No API/schema/migration/generated contract, customer app, checkout/payment, bucket/deployment config, protected slider-data.ts/justforcheck.md or unrelated source was changed.

### Packages and UI integration

Pinned runtime dependencies: @uppy/core 5.2.0, @uppy/react 5.2.0, @uppy/xhr-upload 5.2.0, @uppy/locales 5.3.0 (fa_IR). Peer compatibility inspected for the installed Next16.3.8/React19.3.0 workspace. Provisional Uppy6 was rejected during dependency review because its Headless components requested unrelated Google-picker peers; only the final compatible 5.2 set is committed. Original autoInstallPeers workspace setting is preserved. Lockfile contains the required upstream transitives, including Uppy companion-client; no Companion service/plugin, Dashboard, Tus or AWS-S3 plugin is configured or added as a direct dependency. Uppy introduces use-sync-external-store, which pnpm also binds to Zustand's existing optional peer without changing the application's source or Zustand version.

Existing Store ProductCard gains a media-management action; product creation, lifecycle, pricing, inventory and categories are retained. The editor loads through next/dynamic with ssr:false only when opened. No generic upload platform or duplicate product-management route. Existing dashboard token classes, fonts and Persian/RTL conventions are reused; there are no shared Button/Input/Dialog primitives in this dashboard to duplicate. The browser's native dialog is used with the existing settings editor's focus-cycle convention.

UppyContextProvider and useDropzone own drag/drop, native file selection and keyboard selection; custom markup only composes the dashboard UI. The upstream generated Dropzone hardcodes an English label, so its supported Headless hook is used for full Persian labels. Uppy owns transient files, multipart PUT and real XHR progress. One JPEG/PNG/WebP up to5MiB, autoProceed:false; client validation is usability only. Separate local and saved previews, optional altText<=240, upload/replace, explicit saved-image removal, loading/success/error/conflict feedback and busy-action disabling are implemented. No image transforms or binary/token persistence. Real image decode, mobile width and keyboard picker/focus/escape were checked.

### Frozen API, authentication and mutation behavior

- Generated-client GET metadata accepts null and requires the exact server ETag, including quotes; unavailable ETag fails closed. The backend already exposes ETag through CORS; no backend/proxy change needed.
- XHRUpload sends PUT, formData:true, fieldName:file, allowedMetaFields:[altText], bundle:false, limit:1. onBeforeRequest uses the existing DashboardSessionManager bootstrap through a minimal exported accessor and attaches current Bearer, captured If-Match and idempotency-key. No second refresh system, token metadata/storage/logging or Next proxy.
- Native XHR35s deadline covers a lost response; Uppy stalled-progress feedback alone does not settle all lost-response cases. The supported request hook connects native timeout to the existing Uppy error path. Automatic transport retries are disabled.
- Each deliberate mutation captures an immutable key/precondition/payload. Same-intent retry preserves key/body/original ETag after reconciliation; changed payload/new action gets a new key. 409 pending remains unresolved; expired/other409 and412 stop, load current state, and require a deliberate new action (the UI labels fresh-version submission). Unresolved operations cannot edit/clear the file, change altText or start another mutation.
- Ambiguous/time-out/error outcomes reload current metadata without treating a different generation as proof of this upload. A known accepted response can settle via a successful reload without resending. Replay success always reloads the current generation, never replaces it with an old result. 100% transfer is not a persistence success message.
- DELETE uses the same captured-key/precondition rules and expects204; queue removal never deletes persisted media. Success reloads metadata/preview and refreshes the existing catalog state, which is the dashboard's current catalog cache.
- Protected preview uses the existing authorized generated client with parseAs:blob and no-store. Object URLs are revoked on replacement/queue removal/unmount. Per-product controller/Uppy identities and read-generation checks prevent stale reads crossing editors. On unmount, UI/URL/read cleanup is immediate; an already authorized bounded mutation settles under its original intent before releasing Uppy, avoiding the upstream async-auth-hook abort/send race. It cannot update the new editor or catalog after disposal.

### Verification and main-agent review

- Dashboard `tsc --noEmit` -> PASS, including focused tests/browser test config.
- ESLint on all changed dashboard source/test files with --max-warnings0 -> PASS, zero errors/warnings. No unrelated full-monorepo build/audit.
- Vitest four files -> 37 tests PASS: product-image-controller (15), product-image-api (5), existing auth/session (13), existing commerce-catalog-api (4). Real Uppy multipart/XHR path is exercised with deterministic test XHR; generated API requests use real openapi-fetch with controlled responses.
- Saved Chrome scenario: `node node_modules/@playwright/test/cli.js test --config apps/dashboard/e2e/playwright.product-image.config.ts --reporter=line` -> 1/1 PASS after final review. Isolated Next preview on localhost3102; every /v1 request intercepted, public fake API localhost3199, no real backend/R2/database.
- Playwright MCP also ran the saved scenario successfully through its VM adapter: 7 mutation requests, 4 logical mock uploads, 1 deletion; desktop1440x900/mobile390x844, empty-state, real bytes preview, drag/drop, focus/Escape, fields/headers, progress-before-confirmation, replace/remove, deliberate412, expired-token refresh, ambiguous commit/replay, protected preview, product switching and URL cleanup. MCP's file-chooser modal interrupts long code calls, so native keyboard chooser was additionally covered by the complete saved Chrome test; MCP uses the same harness with that chooser step bypassed.
- The browser scenario exposed and drove a real Tab-wrap correction in the dialog; assertions were preserved and rerun. Earlier provisional tests/tool-environment failures were resolved before acceptance. No backend tests were changed or weakened.
- Graphify final AST-only update -> PASS; generated ignored graph refreshed. Existing optional SQL/HCL extractor omissions/unrelated chat parse warning remain outside scope.
- Combined diff, ownership, frozen-contract adherence, session reuse, concurrency/idempotency, navigation lifecycle, lazy-loading boundary and required acceptance criteria -> main-agent review PASS.
- `git diff --check` and final staged diff gate -> PASS. Preview is stopped after acceptance; no deployment or Phase04C start.

### Limits and exact Phase04C handoff

No live Cloudflare R2 end-to-end test, bucket/IAM validation, production activation, customer integration, production bundle-size benchmark or full browser/device release matrix is claimed. Verification is deterministic mock API plus the separately accepted backend tests from04A. Backend storage remains disabled by default. Store images are not declared production-ready; independent initial-release and Phase12 gates remain in place.

Next Store slice: Phase04C / Batch01C Customer Image Integration, requires its separate instruction and ownership claim; not started.

1. Use the frozen generated nullable image metadata already present in customer catalog/detail/cart/wishlist DTOs: id, contentPath, mimeType, sizeBytes, width, height, altText. Backend/schema/generated contract remain frozen; report any blocking contract issue rather than rewrite them.
2. Customer bytes come from public `/v1/commerce/products/{productId}/images/{imageId}` via the configured API origin. Never use protected admin preview routes, internal keys, R2 credentials or private bucket URLs in customer UI. The public endpoint rechecks current READY/published eligibility.
3. Preserve meaningful null/loading/error/fallback states and Persian alt text; handle404 after replacement/unpublication and503 disabled/unavailable storage. A versioned path is not permanent authority: respect the backend's no-store/revocation contract when selecting the image loader/cache behavior.
4. Integrate only the existing customer Store cards/detail/cart/wishlist surfaces approved for04C; retain independent product/cart/order behavior. This dashboard editor is reusable for admin operations only; do not port upload/auth logic into the customer app.
5. Run focused app typecheck/lint/tests and isolated mock-API browser coverage of actual image loading, RTL/mobile, null/error fallbacks and generation changes. Real R2 or deployment needs separate authorization. Keep the original release N/A and production gates independent.

## 04C-T01 — Customer Store real product image integration

Task ID: 04C-T01
Completed at: 2026-10-14
Agent/Thread: Muse Spark (single agent, no subagents per task instruction)
Batch ID: 04C-B01C
Reviewed by: Muse Spark (coordinator self-review; combined diff scope-checked)
Changed files:
  - apps/app/src/lib/product-image.ts (new: URL resolver + alt helper + local neutral placeholder)
  - apps/app/src/lib/product-image.spec.ts (new: 5 tests)
  - apps/app/src/components/store/product-image.tsx (new: single img path with error guard)
  - apps/app/src/components/store/product-card.tsx (real image)
  - apps/app/src/components/store/product-gallery.tsx (resilient imgs, empty fallback, switching reset)
  - apps/app/src/components/store/product-gallery.spec.tsx (empty-fallback contract)
  - apps/app/src/components/store/store-ui.tsx (CartItem imageUrl)
  - apps/app/src/components/store/recent-card.tsx (snapshot imageUrl)
  - apps/app/src/stores/cart.ts (imageUrl threading, no extra requests)
  - apps/app/src/stores/recently-viewed.ts (imageUrl snapshot, legacy-safe)
  - apps/app/src/stores/product-extras.ts (gallery fabrication removed; reviews/specs untouched)
  - apps/app/src/stores/product-extras.spec.ts (gallery test removed)
  - apps/app/src/stores/product-images.ts + product-images.spec.ts (DELETED: Digikala pool/mapping)
  - apps/app/src/app/(public)/store/page.tsx (cart cache imageUrl)
  - apps/app/src/app/(public)/store/products/[id]/page.tsx (real gallery + key + recent snapshot + metadata alt)
  - apps/app/src/app/(app)/store/cart/page.tsx (cart cache imageUrl)
  - apps/app/src/lib/patient-ui.test.ts (imagery contract rewritten + 6 new presentation tests)
  - apps/app/vitest.config.mts (new: e2e exclusion, mirrors dashboard)
  - apps/app/e2e/playwright.store-images.config.ts + store-images.spec.ts + store-images-browser.mjs (new: mock-API desktop/mobile)
  - plan/STATUS.md (batch claim + release)
Migrations:
  - none (main local DB product-media migration stays unapplied per instruction; dev API returns imageless products so the neutral fallback path is what local dev shows)
Tests run:
  - pnpm --filter @sabz/app typecheck → PASS
  - pnpm --filter @sabz/app test → 23 files / 97 tests PASS (was 89; +8 new)
  - Playwright store-images (desktop 1440x900 + mobile 390x844, mock API, real PNG bytes, 404 case) → 2/2 PASS
  - No backend/dashboard/R2 tests touched; F12-T06-S1/R2 storage tests not repeated per instruction
Result:
  - catalog cards render API images, neutral fallback otherwise → PASS
  - PDP single API image, metadata Persian alt, no fabricated gallery → PASS
  - cart/wishlist images from embedded response metadata, zero extra requests → PASS
  - recent rail snapshots imageUrl, legacy entries fall back → PASS
  - null/404/removed/replaced/unpublished states fall back; no loops; no stale on switch (key + src-reset) → PASS
  - Digikala product-image mappings removed (grep-clean in product slots) → PASS
  - layout/aspect/RTL/keyboard unchanged; plain img without Next optimization caching → PASS
Known limitations:
  - Hero banners, shortcuts rail and incredible-offers still use Digikala hotlinks (explicitly out of scope, separate batch)
  - product rating/seller/specs/reviews/questions remain test placeholders (explicitly out of scope)
  - Main local DB lacks the product-media migration, so local dev API serves imageless products; production acceptance needs the migration applied (recorded for final development acceptance)
  - App has no lint script; typecheck + tests + diff check stand in
  - Cart/wishlist browser coverage deferred (routes require auth); covered by unit presentation tests
Next task:
  - none (stop after Phase 04C per instruction; no next phase started)

## F12-PD-G01 — Product Details V1 architecture approval and governance

Task ID: F12-PD-G01
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Codex /root (one agent, no subagents)
Batch ID: F12-PD-G01 (documentation/governance only)
Reviewed by: Codex /root (main-agent document consistency/compatibility review)
Authority:
  - Explicit owner message: Product Details V1 Product Owner Architecture Approval & Governance.
  - Authorization is limited to architecture documentation, ADR, contract freeze and task planning;
    the owner expressly says not to start implementation.
Baseline: front@ee0a21c; clean working tree; ahead 4 relative to the local origin/front reference.
Changed files:
  - plan/decisions/ADR-0016-store-product-details-v1.md (new ACCEPTED architecture)
  - plan/contracts/store-product-details-v1.md (new version 1.0)
  - plan/phases/12-PRODUCTION-HARDENING.md (scoped extension, task dependencies/scopes/gates)
  - plan/STATUS.md (governance-only claim/release and future candidate)
  - plan/logs/phase-12.md (this evidence)
Migrations:
  - none; no schema/source/client/dependency/database/runtime changes.
Verification:
  - Existing role/permission and content/catalog contract dependencies inspected; approval requires
    existing ADMIN release role plus COMMERCE_MANAGE and product clinic/resource ownership.
  - Document review: controlled fields/source/revision/no-op/null/edit invalidation, explicit exact-revision
    approval, concurrency and public/private projection defined; no automatic/clinical certification.
  - Legacy migration compatibility: preserve descriptions/status/publication as unreviewed; no automatic
    approval, structured health conversion or migration unpublication. Explicit later edits enter the
    pending lifecycle with an editor visibility warning.
  - B2 review: template version pins, strict Product/SKU scopes, no invented definitions, mandatory
    immutable selected-SKU title/meaningful-attribute order snapshots and old-order compatibility.
  - Local Markdown file links and plan/ADR/contract/task dependency consistency -> PASS.
  - Git diff hygiene/document-only scope -> PASS; final staged scope checked before task commit.
  - Builds, application tests, migrations, browser tests, Prisma/database/R2 operations -> NOT RUN
    (not authorized or needed for this documentation task; future checks are acceptance plans only).
Result:
  - ADR-0016 accepted without superseding historical ADR-0009/ADR-0015 -> PASS.
  - B1 architecture/API version 1.0 frozen; B2 definitions/wire appendix explicitly pending -> PASS.
  - B1A/B1B/B1C/B2 sequential scopes, ownership, tests and acceptance mapped in existing Phase 12 -> PASS.
  - Customer demo-claim retirement approved in B1C; UGC/marketplace/warranty/campaign scope excluded -> PASS.
  - G01 DONE/claim RELEASED; all four implementation tasks unchecked and unclaimed -> PASS.
Known limitations / remaining owner decisions:
  - B2 needs actual initial category templates, required fields, units/options, meaningful variant keys,
    health-attribute approval linkage and finalized publication/category-transition/wire appendix.
  - No real product facts or source material are supplied by this governance task; administrators must
    supply and explicitly approve source-supported content during authorized future implementation/use.
  - Independent Phase 12 production blockers remain; no deployment/start authorization is implied.
Next batch:
  - F12-PD-B1A only after a separate start instruction and fresh eligibility/claim. Do not start now.

## F12-PD-B1A — Product content backend foundation

Task ID: F12-PD-B1A
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Codex /root; one agent, no subagents
Batch ID: PD-B1A
Reviewed by: Codex /root (main-agent scoped implementation, contract and acceptance review)
Authority: explicit owner B1A implementation instruction; ADR-0016 and frozen store-product-details-v1 1.0.
Baseline: front@e681517; clean worktree, five commits ahead of the local origin/front reference.
Changed files:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/20261014150000_product_content_v1/migration.sql
  - apps/api/src/common/errors/api-error.ts
  - apps/api/src/modules/commerce/catalog/product-content.dto.ts
  - apps/api/src/modules/commerce/catalog/product-content.policy.ts
  - apps/api/src/modules/commerce/catalog/admin-product-content.controller.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.controller.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.dto.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts
  - apps/api/src/modules/commerce/catalog/admin-commerce-catalog.service.ts
  - apps/api/src/modules/commerce/catalog/patient-commerce-catalog.dto.ts
  - apps/api/src/modules/commerce/catalog/patient-commerce-catalog.service.ts
  - apps/api/src/modules/commerce/cart/patient-commerce-cart.service.ts
  - apps/api/test/product-content.integration.spec.ts
  - apps/api/test/product-content-migration.integration.spec.ts
  - packages/api-client/openapi.json
  - packages/api-client/src/schema.generated.ts
  - plan/STATUS.md
  - plan/phases/12-PRODUCTION-HARDENING.md
  - plan/logs/phase-12.md
Migrations:
  - 20261014150000_product_content_v1: optional editorial fields and source enum/pair; nonnegative
    revision; nullable exact-revision approval metadata and approver FK; four metadata consistency checks.
    No additional index, historical migration, SKU/inventory/order/image column or money contract changed.
  - Existing rows classified legacy revision 0 with absent approval/source; description/status/timestamps
    preserved byte-for-byte. New-row default is managed/unapproved. No normalization/destructive backfill.
  - Existing persistent local PostgreSQL was not migrated, reset or cleaned.
Environment/isolation:
  - Task-owned postgres:16-alpine container mushroom-pd-b1a-test, no volume, loopback port 55439;
    media_04a disposable database reused solely to satisfy the existing media regression test guard.
  - Migration upgrade test creates/drops its own random pd_b1a_upgrade_* database within this temporary
    instance. Tests refuse any other host/port/database or non-test NODE_ENV.
  - Synthetic authenticated users/products and dummy test-only environment secrets; real R2/SMS/Sadad
    disabled for acceptance. Existing media test replaces storage with a deterministic mock; no real CRUD.
  - Temporary container identity checked and stopped/auto-removed after acceptance. Original PostgreSQL
    sabz-zendegi-postgres-1 on port 5432 remained running; no existing service/config/credential altered.
Tests run (working directories apps/api or packages/api-client unless stated):
  - pnpm exec prisma validate -> PASS.
  - pnpm exec prisma generate -> PASS, existing Prisma 7.10.0, ignored generated runtime client.
  - pnpm exec prisma migrate deploy against EMPTY disposable database -> PASS, all 37 migrations.
  - pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
    against that same database -> PASS, no difference detected.
  - pnpm exec tsc --noEmit and pnpm exec tsc -p tsconfig.test.json --noEmit -> PASS.
  - pnpm run openapi:export -> PASS; regenerated through established runtime exporter, no manual edits.
  - Client pnpm run generate/build/typecheck and pnpm test -> PASS, generated freshness and 5 tests.
  - pnpm exec vitest run test/product-content.integration.spec.ts
    test/product-content-migration.integration.spec.ts test/admin-commerce-catalog.integration.spec.ts
    test/patient-commerce-catalog.integration.spec.ts test/commerce-checkout.integration.spec.ts
    test/product-image.integration.spec.ts test/openapi-contract.spec.ts --no-file-parallelism --silent
    -> PASS, 7 files / 62 tests, 33.29s; 34 new content/migration cases plus 28 existing regression cases.
  - Final UUID/error documentation completion: re-export/regenerate followed by direct content + existing
    OpenAPI contract suites -> PASS, 2 files / 41 tests; final client freshness/typecheck PASS.
  - Existing frontend consumer pnpm --dir apps/app exec tsc --noEmit and corresponding dashboard
    command from repository root -> PASS; no frontend source changed or frontend task started.
  - Scoped diff hygiene, forbidden-path review and staged task-only scope -> PASS before commit.
  - graphify update . -> unavailable: pre-existing uv trampoline cannot canonicalize its script path.
    No tooling/dependency installation or graph reconstruction was performed to bypass this limitation.
Implementation/debug review:
  - Initial tests exposed nested relation disconnect issuing a separate SQL update and violating the
    approval tuple constraint. Fixed by one atomic scalar approval-clear/revision UPDATE; subsequent
    real PostgreSQL edit/approval/replay/race and rollback tests pass. Assertions were not weakened.
  - Initial migration fixture attempted another ACTIVE clinic despite the existing one-active-clinic
    constraint. Fixture now uses the migration-established active clinic; release scoping is unchanged.
  - Raw UTF-8 request limit is installed on the relevant existing/new product write routes before
    registration; whitespace-heavy JSON is rejected with 413/PAYLOAD_TOO_LARGE, no global/media change.
Acceptance results:
  - Optional approved fields, NFKC/edge trimming with paragraph retention, post-normalization limits,
    omission/null/no-op/clear and 128 KiB body boundary -> PASS.
  - Malformed/unknown nested input, forged approval metadata, duplicate description, invalid source,
    empty approval and unsupported source-kind rejection -> PASS; stable safe errors registered.
  - Approval requires existing ADMIN role + COMMERCE_MANAGE and active-clinic product ownership;
    unauthenticated/staff/patient/foreign-clinic and direct unauthorized service approval denied -> PASS.
  - Exact expected revision, row-lock serialization, atomic save/invalidation/approval/audit, one effective
    approval replay and audit-failure rollback -> PASS. All approval metadata clears on material edits.
  - Legacy description remains public/unreviewed; managed pending content is hidden; approved values
    embedded in detail; summaries in list/cart/wishlist have no draft/source/approver leakage -> PASS.
  - Product visibility, nullable image identity/path, SKU price/id, persisted cart/wishlist and existing
    checkout/media/OpenAPI regression -> PASS. No checkout/inventory/media code or frozen wire changed.
  - Task complete and reviewed; checkbox/status synchronized and claim released. Commit contains only
    the 20 owned implementation/test/generated/evidence paths above; no push/next batch.
Known limitations:
  - Persistent development database must receive this forward migration before the new runtime is used;
    this task deliberately did not apply it there. Production deployment/readiness remains unauthorized.
  - Legacy description-only PATCH has the frozen compatibility limitation: old clients without an
    expected revision cannot detect a stale form, but edits still invalidate approval. New editor must
    always use strict revision-aware content endpoints; no automatic approval or conflict overwrite.
  - Graphify auxiliary update unavailable as above; API/generated-client freshness is verified.
  - Existing pg client concurrency deprecation warning is non-blocking; no dependency upgrade in scope.
  - API ran locally on Windows with real PostgreSQL in Linux Docker; this is not Linux API/container or
    production acceptance. Existing storage/production prerequisites remain independent.
Exact B1B handoff (not started):
  - Depend on this accepted B1A task and frozen contract; obtain a separate start instruction and normal
    claim before dashboard edits. No B1C/B2/production authorization is implied.
  - Existing admin product responses embed content. GET /v1/admin/commerce/products/{productId}/content
    (adminProductContentGet) returns the latest fields/revision/status/provenance/approval metadata.
  - PATCH same path (adminProductContentUpdate) sends expectedContentRevision plus fields and/or
    provenance. Omit unchanged fields; null clears values; provenance is null or the full source pair.
    Save and approval must be distinct actions; pending managed content is hidden publicly.
  - POST same path + /approve (adminProductContentApprove) sends expectedContentRevision ONLY.
    Use the revision from successful save/read, never a hardcoded revision or image ETag/idempotency key.
  - Consume generated AdminProductContentDto, UpdateProductContentDto, ProductContentFieldsDto,
    ProductContentProvenanceDto and ApproveProductContentDto. Status: LEGACY_UNREVIEWED /
    PENDING_APPROVAL / APPROVED. Show legacy/no-approval honestly; no medical/certification badge.
  - Handle 409 COMMERCE_CONTENT_REVISION_CONFLICT/currentRevision with deliberate refetch/review,
    retaining unsaved form; 422 field/source errors; normal session/403 and 413. Never auto-approve/retry
    an overwrite. Warn that a material edit hides controlled public content until explicit approval.
  - Existing Store editor/design/RTL/session conventions and Uppy/media editor remain intact; focused
    dashboard/editor/keyboard/mobile tests and browser evidence are B1B's own acceptance gate.
Next batch:
  - none (STOP after B1A per its instruction; B1B started later under its own instruction/claim).

## F12-PD-B1B — Dashboard product content editor

Task ID: F12-PD-B1B
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Muse Spark (single agent, no subagents per task instruction)
Batch ID: PD-B1B
Reviewed by: Muse Spark (coordinator self-review; combined diff scope-checked)
Authority: explicit owner B1B implementation instruction; ADR-0016 and frozen store-product-details-v1 1.0.
Baseline: front@78c7209 (B1A) + e681517 (governance); clean worktree at claim.
Changed files:
  - apps/dashboard/src/lib/commerce-product-content-api.ts (new: GET/PATCH/approve wrappers, status+code error class, Persian messages)
  - apps/dashboard/src/lib/commerce-product-content-api.spec.ts (new: 5 tests)
  - apps/dashboard/src/features/store/product-content-draft.ts (new: sections, limits, dirty, null-conversion, provenance, approval rules)
  - apps/dashboard/src/features/store/product-content-draft.spec.ts (new: 5 tests)
  - apps/dashboard/src/features/store/product-content-editor.tsx (new: dialog, 5 Persian RTL sections, revision-safe save, explicit approval, dirty guard, conflict flow)
  - apps/dashboard/src/features/store/store-page.tsx (integration only: content button + status line + editor wiring)
  - apps/dashboard/e2e/playwright.product-content.config.ts + product-content.spec.ts + product-content-browser.mjs (new: mock-API desktop/mobile)
  - plan/STATUS.md (batch claim + release)
Tests run (working directory apps/dashboard unless stated):
  - pnpm --filter @sabz/dashboard typecheck → PASS
  - eslint on all 6 touched source/test files --max-warnings 0 → PASS (one set-state-in-effect corrected via queued microtask, mirroring the image editor)
  - vitest focused (content-api + draft specs) → 2 files / 10 tests PASS
  - vitest full dashboard suite → 27 files / 106 tests PASS, no regressions
  - Playwright product-content (desktop 1440x900 + mobile 390x844, deterministic mock API) → 2/2 PASS: status badge, five sections, save rev+invalidation, explicit approval, dirty guard, 409 conflict with draft kept + deliberate resave, 403 denial staying pending, RTL, no overflow, image-editor entry intact
  - No backend/Prisma/R2/customer-app tests touched; B1A storage suites not repeated
Result:
  - editor integrated in existing Store workflow (per-card button + status line) → PASS
  - all eight B1 fields + provenance pair-or-null with server limits → PASS
  - existing data preserved (draft initialized from server; legacy description untouched until edited) → PASS
  - save and approval independent; approval never automatic; no-op save keeps approval → PASS (client disables approve while dirty; server authority unchanged)
  - stale-revision conflicts reload server state, keep draft, require deliberate resave; no auto-overwrite/retry → PASS
  - approval status from server only; unauthorized approve surfaces 403 safely → PASS
  - Persian RTL, responsive, focus trap, Escape/discard guard, role=status/alert → PASS
  - legacy first-edit visibility warning + pending-hidden note shown → PASS
  - no unrelated changes (image editor, SKU, pricing, inventory, checkout untouched) → PASS
Known limitations:
  - Persistent development database still lacks the B1A migration (deliberate); UI verified against mock API only — real runtime acceptance remains pending and is reported, not claimed
  - Client cannot distinguish ADMIN-without-COMMERCE_MANAGE before attempting approval; conservative always-enabled button + safe 403 handling stands in
  - Playwright harness needed one correction during development (resave-synced Escape closes directly); implementation was correct throughout
Next task:
  - none (STOP after B1B per instruction; B1C/B2 NOT started, no push/deploy)

## F12-PD-B1B-R1 — focused conflict and session review corrections

Task: F12-PD-B1B-R1; batch PD-B1B-R1; completed 2026-10-14 Asia/Tehran.
Owner/coordinator/reviewer: Codex /root, one agent, no subagents.
Authority: explicit owner continuation of the interrupted independent review, limited to two high-risk
issues; B1B baseline front@8ebfdbe, B1A 78c7209 and unchanged frozen B1 content contract.
Claim recorded before implementation in STATUS/checklist; baseline worktree clean, no other claim.
Verdict: PASS WITH FIXES for these two issues. Historical B1B evidence above is preserved; this entry
supersedes its claim that automatic refetch + full-draft resave safely resolves conflicts.

Confirmed causes (High):
- On save/approval 409, reloadKeepDraft advanced the server baseline while retaining all stale draft
  fields. The next full-field PATCH could erase another administrator's changes at the new revision.
- Initial content-loading effect depended on accessToken; a successful session refresh restarted GET
  and replaced unsaved fields, even when the original save subsequently failed.

Before-fix reproduction:
- Added focused browser tests before editing application code, using fully intercepted API requests.
- First harness run exposed an invalid mock category=null; corrected the fixture to the actual catalog
  shape (no application fix for that harness error).
- Desktop regression run then failed on both intended assertions: Save enabled after 409; refreshed
  session replaced brand "پیش‌نویس نشست" with "برند 1" following a deliberately rejected PATCH.

Corrections:
- Preserve both draft and its original revision after 409; no automatic content GET or second mutation.
  Block save and approval in handlers and controls. Explicit two-step reload warns that current draft
  will be replaced; cancellation and failed reload retain it and keep the conflict gate. Successful
  reload installs one coherent current snapshot; re-entered changes preserve the other editor's fields.
- Initial load now follows product identity, not bearer-token rotation. Existing session-aware fetch
  supplies fresh credentials. Existing product key and the added authenticated-user key isolate editor
  lifetimes; current props/session gate continue to control operations. No new authorization claims.
- Updated the original mock conflict flow to require explicit resolution; mock material edits now
  faithfully mark content PENDING_APPROVAL instead of retaining a stale status.

Changed files:
- apps/dashboard/src/features/store/product-content-editor.tsx
- apps/dashboard/src/features/store/store-page.tsx (authenticated-user identity key only)
- apps/dashboard/e2e/product-content-regressions.mjs (new focused browser regressions)
- apps/dashboard/e2e/product-content.spec.ts
- apps/dashboard/e2e/product-content-browser.mjs
- plan/STATUS.md, plan/phases/12-PRODUCTION-HARDENING.md, this log.

Verification (actual results):
- pnpm exec playwright test --config apps/dashboard/e2e/playwright.product-content.config.ts
  --project desktop --grep regression: before application fix, 0/2 PASS, both intended defects observed.
- pnpm exec playwright test --config apps/dashboard/e2e/playwright.product-content.config.ts:
  after fixes, 6/6 PASS (desktop 1440x900 and mobile 390x844). Covers save/approval revisions, retained
  draft and blocked mutations on 409, explicit reload/cancel/failure/retry, remote field preservation,
  approval conflict, unchanged-content approval preservation, token refresh + failed save + retry using
  fresh bearer, product switching/discard guard, account editor isolation, session role-loss unmount,
  existing 403 feedback, RTL/overflow and media-editor entry.
- pnpm --filter @sabz/dashboard test -- src/features/store/product-content-draft.spec.ts
  src/lib/commerce-product-content-api.spec.ts: 2 files / 10 tests PASS.
- pnpm --filter @sabz/dashboard typecheck: PASS.
- pnpm exec eslint src/features/store/product-content-editor.tsx src/features/store/store-page.tsx
  e2e/product-content-browser.mjs e2e/product-content-regressions.mjs e2e/product-content.spec.ts
  (cwd apps/dashboard): PASS, no diagnostics.
- git diff --check: PASS. Scoped diff and acceptance reviewed; no unrelated changes.
- graphify update .: PASS, AST-only; ignored graph outputs updated. Tool reported existing optional
  SQL/HCL parser gaps and an unrelated chat extraction warning; no installs or unrelated corrections.

Environment/limitations:
- Reused existing Dashboard dev server on localhost:3002. A start attempt returned EADDRINUSE;
  no existing process was stopped/restarted. Browser API calls were all mocked, with no database/R2 CRUD.
- No backend, Prisma, migration, database, generated-client, frozen-contract, dependency or other
  Dashboard feature changes. No real backend acceptance claimed; persistent B1A migration remains an
  external prerequisite per owner instruction and was not investigated/applied.
- Review correction scope only; earlier Medium/Low observations are not promoted into new work.
  Server ADMIN + commerce:manage + clinic authorization remains authoritative; no new permission API.
- Real B1B local acceptance is the next handoff under separate authorization. B1C/B2 not started;
  production readiness, deployment, merge and push are not claimed or performed.
Final gate: DONE, claim released; one corrective task-level commit, no next batch started.

## F12-PD-B1C — Customer Product Details Integration

Task ID: F12-PD-B1C
Completed at: 2026-10-14 Asia/Tehran
Agent/Thread: Muse Spark (single agent, no subagents per task instruction)
Batch ID: PD-B1C
Reviewed by: Muse Spark (coordinator self-review; combined diff scope-checked)
Authority: explicit owner B1C implementation instruction; ADR-0016 and frozen store-product-details-v1 1.0.
Baseline: B1A 78c7209 + B1B 8ebfdbe + B1B-R1 43fa0ba DONE; clean worktree at claim.
Changed files:
  - apps/app/src/components/store/product-content-sections.tsx (new: conditional A-E sections from public DTO, plain-text only, no fake claims)
  - apps/app/src/app/(public)/store/products/[id]/page.tsx (PDP wired to real content + metadata alt; rating/seller/specs/reviews/questions blocks removed)
  - apps/app/src/components/store/store-ui.tsx (fake CartItem seller row removed; cart logic untouched)
  - apps/app/src/stores/product-extras.ts + product-extras.spec.ts (DELETED)
  - apps/app/src/components/store/product-specs.tsx + product-reviews.tsx + product-questions.tsx (DELETED, PDP-only)
  - apps/app/src/lib/patient-ui.test.ts (5 new content/cart presentation tests)
  - apps/app/e2e/product-content.spec.ts + product-content-browser.mjs (new: mock-API desktop/mobile)
  - apps/app/e2e/playwright.store-images.config.ts (second spec file registered)
  - plan/STATUS.md (batch claim + release)
Tests run (working directory apps/app unless stated):
  - pnpm --filter @sabz/app typecheck → PASS
  - pnpm --filter @sabz/app test → 22 files / 99 tests PASS (product-images suite retired with its module; net +5 B1C tests)
  - Playwright store PDP content (desktop 1440x900 + mobile 390x844, deterministic mock API) → 2/2 PASS: approved sections, legacy description, pending emptiness, no fabricated claims, image fallback intact, RTL, no overflow, purchase flow intact
  - Existing store-images Playwright suite re-ran in the same run → 2/2 PASS (no image regression)
  - Real dev API probed read-only: 4 products exist but carry no image/content/descriptions, so approved-content rendering was verified against mocks only (no product data mutated, per instruction)
  - No backend/Prisma/dashboard/R2 tests touched
Result:
  - approved public fields render (brand/manufacturer/short/full/ingredients/usage/warnings/contra) with legacy/top-level fallbacks exactly per visibility table → PASS
  - missing/unapproved fields render nothing; no approval badges or source claims invented → PASS
  - hardcoded ratings/counts, fake reviews/Q&A, fictional seller verification/satisfaction/warranties, hardcoded specs, cart seller row removed → PASS
  - plain text stays plain (escaping test) and warnings are never collapsed → PASS
  - title/image/SKU/price/cart/wishlist/navigation/loading/error preserved; no variant selector → PASS
Known limitations:
  - Hero banners/shortcuts/offers still hotlink Digikala (separate batch, untouched per instruction)
  - Local dev catalog has no approved products yet, so the approved PDP path is mock-verified; first real approval should be eyeballed after B1B-R1 acceptance data exists
  - Cart/wishlist browser coverage still deferred (auth routes); unit-covered
  - App has no lint script; typecheck + tests + diff check stand in
Next task:
  - none (STOP after B1C per instruction; B2 NOT started, no push/deploy)


## F12-WAL-BE01 — Shared wallet and prepaid booking backend

Task ID: F12-WAL-BE01
Completed at: 2026-10-16 Asia/Tehran
Agent/Thread: Codex /root; one agent, no delegated workers
Batch ID: WAL-BE01
Reviewed by: Codex /root (source/combined-contract/scope review); PASS WITH FIXES
Authority: explicit owner request for all backend wallet work; arbitrary online top-up, wallet as a payment method everywhere, full payment before final booking, ADMIN credit/debit/set-balance from patient detail. No user withdrawals/transfers. ADR-0017 freezes one inseparable shared-contract backend operation; app/dashboard/live release are separate.
Baseline: front@06780a104dc2bcd7bc5b145a0b13814bcaf55f0c. Pre-existing customer-app changes, motion folder and planning proposal preserved and excluded from this commit.

Changed files (complete groups within the task write set):
- apps/api/src/modules/billing/*: ledger, commands, intent/target registry, gateway recovery/reconciliation, DTO/controllers, reports and maintenance worker.
- apps/api/prisma/schema.prisma; five additive migrations 20261016120000 through 20261016120400; prisma/seed.mjs explicit development ADMIN clinic grant.
- appointments/{appointment-billing.target,patient-appointments.service,admin-appointments.service,patient-appointments.module}; paid booking, capacity, cancellation/refund and paid reprice guard.
- commerce/payments/{order-billing.target,payment-providers.module,payment-attempt-orchestration.service,payment-attempt.service,payment-verification.service,payment-credential-retention.service,payment-provider.port,sadad-payment-provider.adapter}; shared existing provider infrastructure, callback dispatch and legacy interoperability.
- commerce/catalog/admin-commerce-catalog.module; checkout DTO/service; inventory service; orders/commerce-order-operations.service; outbox/outbox.worker.
- common/auth/authorization.policy; common/errors/api-error; config/environment.validation; .env.example.
- test/wallet-billing.integration.spec.ts; wallet-migration-upgrade.mjs; patient-appointments.integration.spec.ts (isolated free legacy fixtures and cleanup); payment-credential-retention.spec.ts; payment-live-runtime.spec.ts (required billing dependency mock).
- .github/workflows/ci.yml: dedicated wallet_test database step; immutable financial fixtures never share the normal regression database.
- packages/api-client/openapi.json and src/schema.generated.ts.
- plan/decisions/ADR-0017-shared-wallet-backend.md; contracts/wallet-billing-v1.md and wallet-backend-handoff.md; STATUS/Phase12 checklist/this evidence.

Skills/plugins/tools actually used:
- Installed graphify skill: initial scoped graph audit; CLI query/update attempted, pre-existing uv trampoline failure. Existing graph inspected through Python/NetworkX during audit; no claim that it was rebuilt.
- nestjs-feature-audit for the preceding feature audit; nestjs-best-practices for module ownership, DI, transaction/error/security boundaries; ponytail for reuse and scope.
- Installed Prisma client API/CLI skills including transaction reference; installed Context7 MCP fetched Prisma transaction documentation. The implementation uses installed Prisma 7.10 API, existing NestJS/PostgreSQL and existing PSP adapter; no new runtime package/service was added.
- Plugin Management discovery inspected relevant backend tooling; no new external account, plugin install, live credential, cloud database or paid service was needed. This is source review and correctness verification, not a claimed Codex Security scan.

Verification (all local, synthetic credentials/PSP, real PostgreSQL 16):
- Isolated container mushroom-wallet-be01, bound only 127.0.0.1:55417; wallet_test, wallet_regression and wallet_upgrade databases. Original sabz-zendegi-postgres-1:5432 never migrated/reset.
- Prisma migrate deploy: clean 41-migration replay plus final additive migration; final 42-migration full replay through test/wallet-migration-upgrade.mjs PASS. Upgrade fixture inserts a legacy verified bank attempt/payment and completed refund after the 37 old migrations, applies all five new migrations, compares every old payment/attempt field, refund evidence, and absence of invented wallet balances: PASS.
- prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code: no difference, PASS.
- Final financial run: 36 tests / 6 files PASS: wallet-billing.integration (13 real DB scenarios), payment-provider-contract, payment-live-runtime, sadad-payment-provider.adapter, payment-credential-retention, patient-appointments.authorization. WALLET_BILLING_TEST_ISOLATED=1; database wallet_test.
- Regression run: 20 tests / 7 files PASS: patient-appointments.integration + authorization, commerce-checkout.integration, inventory-concurrency.integration, inventory-reservation-expiry.integration, payment-provider-order-id.integration, commerce-revenue.integration. Separate wallet_regression database.
- payment-provider-config.integration: 1 PASS with live operational settings and synthetic HTTPS domains/credentials; no real PSP traffic. Initial disabled-shell-env fixture failure and retained credential count were resolved by the test's intended live shell configuration and its normal scratch cleanup; no provider implementation weakened.
- authorization.guard + security-audit.integration: 16 tests PASS. Across those four API reports: 70 DISTINCT API tests (duplicate appointment authorization execution deduplicated), all PASS. API-client: 5 tests PASS.
- API build and test TypeScript checks PASS; OpenAPI export from the actual initialized app PASS; generated client freshness/build/test PASS; app, dashboard and web TypeScript checks against the final generated client PASS.
- OpenAPI baseline comparison: no old paths removed; 22 new paths; operation IDs unique. New receipt method fields are additive/optional in existing commerce DTOs.
- Development-only seed with synthetic admin, NODE_ENV=development on scratch DB: explicit clinic grant exists exactly once, PASS. Production seed credential restriction preserved.
- EXPLAIN ANALYZE/BUFFERS for bounded journal history on actual synthetic DB: Bitmap Index Scan using wallet_journals_account_id_version_key, 4 rows; 0.172ms observed execution. This justifies the account lookup index, not a production load/SLO claim.
- CI YAML parses. Dedicated database/opt-in suite wired for remote CI; remote CI itself not run. Direct installed Node/Prisma/TypeScript/Vitest CLIs used because local Corepack pnpm resolution tried unavailable registry access.
- git diff --check on owned paths PASS. Unrelated frontend changes not staged. Graphify update attempted and blocked by the existing launcher error, recorded separately; no graph outputs modified.

Acceptance/source review:
- Immutable double-entry journal, checked projection and nonnegative customer balances; direct raw balance overwrite, journal/entry mutation, balanced-entry-without-projection insertion and deletion of bank/refund financial history rejected by DB.
- 100 concurrent debits against 100 IRR at 3 IRR each: exactly 33 accepted, remaining 1 IRR, ledger mismatch count zero. Admin CREDIT/DEBIT/SET_BALANCE including zero, replay/conflicting payload/stale version, clinic/role rejection, patient redaction and admin actor display verified.
- Real checkout wallet debit/Payment/inventory/discount settlement atomic; duplicate wallet request no second debit; refund cap serialized; bank orders retain their own verified proof. Legacy refund dispatch depends on actual payment source, not mere intent existence.
- TOPUP never creates a commerce sale/order. Concurrent repeated Verify credits once; original provider revision retained; credentials needed by pending/recent billing attempts cannot be shredded. Timeout remains reconcilable.
- Callback token recovery requires authoritative exact amount and OrderId, even after reviewed manual failure. A callback can settle before the original request response without VERIFIED being overwritten. Browser result code never establishes success.
- Appointment creation only after full wallet/bank payment; unpaid capacity held/expired/cancelled safely; late bank success compensated to wallet without an appointment. Same-price reschedule retained; different paid price requires cancel/rebook. Cancellation refunds remaining wallet amount or opens an evidenced bank refund. One-rial service refund verified without rounding.
- Patient/admin APIs authenticated, permission- and clinic-scoped, input validated, bounded and rate limited; immutable actor/reason/audit and transactional financial outbox notifications preserved. Required DI now fails startup rather than silently bypassing billing hooks.
- Summary separates liability, manual credits/debits, actual gateway receipts, top-ups, service/order totals and refunds. Existing commerce revenue remains based on real order Payment/Refund facts.

Known limitations / exact next action:
- Backend only. App wallet/payment-result/payment selection/prepaid booking and dashboard patient wallet controls are NOT implemented. Follow wallet-backend-handoff.md under a separately claimed frontend task; no next batch started.
- No persistent development/staging/production migration, real PSP acceptance, deployment, push, merge or secret change. Backend cannot be rolled out alone while the old paid-booking UI still uses direct creation. Production monitoring/restore/PSP gates and existing Phase12 infrastructure blockers remain open.
- Token-less ambiguous requests require verified callback proof or reviewed manual failure; automatic retry cannot fabricate a lost token. Gateway refunds are manual with evidence; no user cash-out/transfer endpoint.
- Full repository suite/browser acceptance/remote CI/production capacity were not claimed; targeted checks above passed. Graphify launcher needs independent repair before a future graph update.
- Task-owned PostgreSQL container and all synthetic DBs removed after verification; original container remains running on 5432.

Final gate: F12-WAL-BE01 DONE; WAL-BE01 claim RELEASED. One task-level commit owns backend/contract/evidence changes only. Whole wallet feature and Phase12 are not marked complete.

## F12-PJ-R01 — Assessment concurrency, revisions and transactional audit

Task ID: F12-PJ-R01
Completed at: 2026-10-16 Asia/Tehran
Batch: PJ-R01
Agent/Thread: Codex /root; one agent, no subagents
Reviewed by: Codex /root; focused source/combined-diff, contract and security-boundary review PASS
Baseline: front@ebbb2b3; clean worktree. Authority: explicit owner instruction to begin the reviewed Patient Journey backend implementation and use relevant skills/plugins. Backend-first override is limited to this task; Phase12 stays active. Full brief and clinical release remain unaccepted.

Changed files:
- apps/api/src/modules/assessments/patient/patient-assessments.{service,controller,dto}.ts
- apps/api/src/modules/assessments/application/assessment-audit.ts; src/common/errors/api-error.ts
- apps/api/prisma/schema.prisma; new migration 20261016170000_assessment_submission_reliability
- apps/api/test/assessment-reliability.integration.spec.ts; assessment-reliability-upgrade.mjs; patient-assessments.authorization.spec.ts
- .github/workflows/ci.yml: dedicated disposable assessment reliability test step
- packages/api-client/openapi.json and src/schema.generated.ts, generated by official scripts
- ADR-0018, assessment-reliability-v1, patient-journey-backend map, STATUS/Phase12 checklist/this evidence

Pre-fix evidence:
- Existing completion key replay onto a second submission with identical answers returned 201/the first result instead of 409.
- Latest Mezaj returned 200 after its source was invalidated instead of 404.
- Induced PostgreSQL audit failure returned 500 but saved changed answers beforehand; expected rollback failed.
- These three cases failed before application edits. Concurrent start passed in that particular baseline scheduling run; its unsafe check/create race was established from source, not falsely claimed as reproduced in that run.

Implementation and acceptance:
- One partial unique active-attempt constraint plus patient/version start lock; concurrent starts return the same ID and allocate one attempt. Publication share lock prevents version retirement racing a new start.
- Owned row locks serialize save/submit; completion-key namespace locks prevent same-patient key races across distinct submissions. Equal completed retries return the same immutable completion and one MezajResult; competing keys fail with a stable conflict. Keys never replay another resource, even with equal saved answers.
- Server-owned revision and optional expectedRevision precondition; changed stale saves/submit fail; identical draft snapshots are no-ops. Database advances revisions for older writers and preserves terminal revisions/content. Existing no-body submit and answers-only save remain valid.
- Sensitive read/resume and changing commands audit inside their transaction, with safe ID metadata only. Induced audit failure rolls back start, answers/revision, completion and Mezaj; sensitive reads fail closed.
- Self/resource/clinic checks preserve 404 concealment, including same-patient data attached to another clinic. Latest Mezaj ignores invalidated source submissions. MAIN/MEZAJ separation, scoring, clinical-review visibility and booking policy remain unchanged.

Verification (local, synthetic fixtures; PostgreSQL16):
- Owned disposable container mushroom-pj-r01 on 127.0.0.1:55419; databases patient_journey_test, patient_journey_upgrade and patient_journey_fresh. Existing sabz-zendegi-postgres-1:5432 never migrated/reset.
- Final focused API run: 55 tests / 8 files PASS (21 assessment reliability PostgreSQL/API cases; patient assessment authorization, scoring, booking contract/eligibility, Mezaj integration, admin assessment and submission authorization).
- Additional OpenAPI contract + authorization.guard: 23 tests / 2 files PASS. Total 78 distinct API tests; earlier repeated runs not added to this count.
- Official API-client generation/test/build: 5 tests PASS; freshness PASS. All 217 old API paths retained, zero removed. Optional expectedRevision JSON body/field and optional revision response tested; 201 completion response now documented alongside existing 200 documentation.
- API build TypeScript, API test TypeScript and app/dashboard/web typechecks PASS. No frontend source changes or browser execution.
- Full 43-migration clean replay PASS; Prisma migrate diff reports no difference. Upgrade script manually replays 42 prior migrations, inserts legacy active/completed/result fixtures, proves duplicate-active migration refusal is atomic and preserves all rows, removes only its deliberately introduced uncompleted duplicate fixture, and proves successful upgrade preserves every historical answer/result field. Old-writer revision advancement and terminal-content/revision immutability PASS.
- Upgrade fixture initially collided with the migration-created active clinic; fixed the fixture to reuse that clinic, recreated only the owned scratch upgrade DB, then the complete proof passed. No production rule was weakened.
- EXPLAIN ANALYZE for the actual active-attempt lookup on the small scratch population: Seq Scan selected, observed 0.046ms; no performance improvement/SLO is claimed. Partial unique index is primarily a correctness constraint.
- Scoped git diff --check PASS. No unrelated source, historical contract, billing/provider or lockfile changes. Temporary PostgreSQL container and all scratch DBs removed; main PostgreSQL container remains running.

Skills/plugins actually used:
- graphify skill: scoped graph navigation; CLI query/update attempted, existing uv trampoline failure; graph not regenerated or claimed fresh.
- nestjs-best-practices: module sharing, input/guards and transaction guidance; Prisma plugin client API skill/reference for typed transaction and raw-query use; ponytail for the smallest existing-engine correction.
- Plugin Management discovery and existing Context7 MCP resolve/query used for transaction documentation. Local Prisma 7.10 client/types and existing repository patterns remain the authority when a current documentation result refers to a newer API. No plugin/package installed and no external provider/account data accessed.
- nestjs-code-audit collector read-only, scoped to src/modules/assessments/patient (7 files), plus bundled semantic/security lanes. Its HTTP-exception heuristic is an established Nest application-service boundary, not a confirmed defect. The collector itself did not run lint/TypeScript; compiler/tests were executed separately as above. This is a focused main-agent review, not an independent full Codex Security scan.

Known limitations and next action:
- Old clients omitting expectedRevision still have serialized last-write-wins draft saves. Strict stale-edit protection is proven only for clients sending the precondition; future paid/couples entry points must require it and define their own session-scoped attempt invariant.
- No retired-questionnaire resume policy, algorithm change/version contract, qualified review/publication gate, commercial offering, digital entitlement, couples, personalized guidance or program delivery is declared complete. No full-brief percentage or production-readiness claim.
- Persistent environments require the new migration before activating this code. Existing duplicate active attempts deliberately block deployment for reviewed resolution; no automatic patient-data deletion/invalidation. No persistent DB, provider/SMS, push, merge, deploy, secret or frontend modification.
- Graphify launcher remains unavailable; no installation attempted. Package-manager wrappers were sandbox-blocked; used the already cached pinned pnpm10.10.0 entrypoint with scoped command approval, without installing packages.
- Remote CI and full repository/browser/load suites were not run; focused checks cover the accepted task. Added CI step was source-reviewed, its equivalent PostgreSQL run passed locally.
- Next candidate F12-PJ-J01: prepare/freeze the additive derived journey/action contract, then normal claim under existing owner authorization. F12-PJ-R02 historical resume requires the explicit retirement-policy decision. No next batch started, honoring the repository per-task stop boundary.

Final gate: F12-PJ-R01 DONE; PJ-R01 claim RELEASED. One final task-level commit contains implementation, verification and governance only. The comprehensive Patient Journey backend and Phase12 remain incomplete.

## F12-PJ-J01 — Derived patient Home and next action

2026-10-16; Codex /root single owner/reviewer; front@82fa9c4 clean baseline. Owner explicitly superseded the per-task stop with nonstop serialized backend execution. Each task retains its own review and commit. Contract patient-journey-v1 frozen before runtime changes; no closed phase or existing frozen contract modified.

Delivered GET /v1/patients/me/journey with PATIENT plus self-domain permissions, private/no-store response and patient/clinic derivation from the authenticated principal. Existing onboarding and booking eligibility readers accept a transaction client and retain their old default behavior. One repeatable-read transaction composes bounded assessment/appointment/billing/order/treatment references and atomically records a minimized PatientAccessAudit READ through the existing clinical audit service. Missing patient does not provision; failed audit produces 503 with no summary. No new schema/table/state machine, provider call or clinical recommendation.

Each collection uses take6, emits at most5 plus hasMore. Independent one-row action queries avoid hiding an actionable draft/result/near appointment behind the bounded summary. Current appointment windows retain existing one-/four-hour time bounds; opening its detail grants no chat permission. Medical onboarding is separate from shopping. Money remains integer strings with explicit IRR/TOMAN. Draft clinical plans, answers, result values, names, addresses, medical declarations and payment snapshots/tokens never enter the projection. Retired-draft summaries conservatively advertise no questionnaire resume until R02's historical retrieval contract; existing submission commands are unchanged.

Verification PASS:
- Disposable mushroom-pj-j01 PostgreSQL16 on localhost55419, patient_journey_test; all43 existing migrations replayed and development fixtures seeded. No new migration or persistent database changes.
- Pinned cached pnpm10.10.0: API vitest journey13 + assessment-reliability21 + patient-booking-eligibility8 =42; self-profile.integration3 separately =45 distinct focused tests. Final journey13 rerun after scoped review corrections PASS. Real HTTP tests cover anonymous/role/session denial, missing patient/no provision, incomplete/complete progress, foreign patient/query override/foreign clinic, retired draft, bounded lists and hidden actionable reference, pending/expired payments/currency, pending Store orders/privacy, near/terminal appointment/no chat creation, minimized audit and injected database audit failure. Initial fixture-only failures (lifecycle timestamps, revocation reason and overlapping doctor fixture) were corrected without weakening constraints.
- API source and test TypeScript checks PASS; official openapi:export and api-client generate/test/build PASS (5 client tests); App/Dashboard/Web typechecks PASS. All217 old paths retained; exactly one new journey path. Generated-file reordering comes from official Nest traversal; no manual generated edits.
- Main-agent controller→guard→transaction→projection/audit review PASS. Read-only nestjs-code-audit collector scoped to four journey files: no heuristic candidates; compiler/tests run separately. Review added independent action queries and preserved confirmed-appointment grace. No full-repository scan/browser/load/remote-CI acceptance claimed.
- NestJS best-practices and Prisma client API plugin skill used. Context7 transaction lookup returned newer ORM8 APIs; local installed7.10 types and actual PostgreSQL tests remain authoritative. graphify update . attempted; pre-existing uv trampoline canonicalization failure persists, graph not claimed fresh. git diff --check PASS.

No frontend, new questionnaire/clinical algorithm, digital entitlement, couples result, qualified guidance, live Sadad acceptance, push or deployment completed by this task. The task-owned disposable DB remains available for the next serialized batch. Independent production/clinical approvals stay open. Final gate: F12-PJ-J01 DONE, PJ-J01 RELEASED; next eligible R02 discovery/historical questionnaire/provenance contract, then inactive offering/release foundation. Continuous owner instruction authorizes continuation after this task-level commit.
