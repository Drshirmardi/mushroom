# Phase 12 Execution Evidence

## F02-T08-R1 — patient profile and consent-policy release corrective

Task ID: F02-T08-R1
Batch ID: F12-B13-R1
Completed at: 2026-10-08 +03:30
Coordinator/Thread: Codex /root
Reviewed by: Codex /root

Observed failure:

- The patient app used one four-request onboarding loader for the profile, profile-edit and medical-profile pages.
  A missing active consent policy therefore returned `CONSENT_POLICY_NOT_AVAILABLE` and hid unrelated profile data.
- `openapi-fetch` had already parsed the error body, but the loader tried to clone and parse the consumed response;
  it lost the stable code and rendered the save-only fallback «ذخیره‌سازی انجام نشد» during a read.
- The VPS release path ran migrations without publishing the release-managed consent policy. The development seed is
  intentionally not part of deployment, so a fresh rehearsal database had no active policy.

Changed files:

- patient onboarding client, focused tests and profile/onboarding views under `apps/app`
- `apps/api/prisma/manage-consent-policy.mjs`, package scripts and focused release-document tests
- rehearsal-only versioned policy under `deploy/vps/reference-data/`
- VPS release/deploy helpers, behavior contracts and deployment documentation
- `plan/STATUS.md`, `plan/logs/phase-12.md`

Verification:

- focused app onboarding tests → PASS (10/10)
- focused API consent-policy document tests → PASS (3/3)
- full app tests → PASS (12 files / 48 tests)
- app typecheck and production build → PASS
- API typecheck and production build → PASS
- API entrypoint invocation of consent-policy validation → PASS
- release-pipeline contract and VPS deployment behavior test → PASS
- Node and shell syntax checks → PASS
- `git diff --check` → PASS
- full API integration test attempt → NOT ASSERTED: the environment has no reachable PostgreSQL listener and no
  Docker engine; suites failed during database setup before exercising application assertions

Result:

- **PASS / DONE.** Profile, edit and medical views no longer depend on the consent-policy endpoint. A missing policy
  blocks only onboarding/consent and is shown with an explicit read-time message.
- The request helper now consumes the generated client's parsed error object and keeps stable API codes without
  cloning an already-consumed response.
- Staging and production-sim deployment now validates, publishes idempotently and verifies a versioned policy after
  migration and before switching application services. Publication is serializable, retires the previous active
  version atomically and records non-sensitive release evidence in `audit_events`.
- The tracked document is visibly non-production, restricted to `staging` and `production-sim`, and protected by an
  exact SHA-256 body hash. Development seed execution was not added to the release path.

Known limitation and next action:

- This work does not claim a live staging deployment from the local workspace. Promote the commit through the
  existing immutable release workflow, then register a new staging patient and confirm profile access plus consent
  completion.
- Production remains fail-closed until product/legal owners provide a separate approved policy document and hash;
  the rehearsal document is rejected when `MUSHROOM_ENVIRONMENT=production`.

Next batch:

- No batch is started in this handoff. Existing Phase 12 blockers remain unchanged.

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
