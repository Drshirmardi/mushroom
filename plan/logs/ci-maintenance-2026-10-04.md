# Owner-authorized CI maintenance — 2026-10-04

This is CI maintenance, not completion or selection of a roadmap task. Baseline HEAD
was `9f4a259` on `codex/phase-12-speckit`; startup found a clean worktree and no active
batch. F12-T05/T07 blockers and F12-T09/T11/T12 status remain unchanged.

## Implemented arrangement

- Existing ordinary CI retains frozen install, migrations/seed, lint, typecheck, tests,
  contract checks through existing test scripts, and production builds; explicit Prisma validate added.
- Seven existing dashboard access/session browser tests run against production standalone output
  through the existing Node runtime-config entrypoint. APIs/redirect targets remain explicit mocks;
  this is not real end-to-end booking/payment acceptance.
- Separate security job rejects production dependency High/Critical advisories and scans
  the tracked working-source snapshot for secrets. Secret scan logs only locations and rule IDs,
  not matched values. This is not a scan of all historical Git objects.
- Four path-filtered release-artifact jobs build without pushing, check actual non-root/HTTP
  runtime behavior, exercise API migration on a unique disposable PostgreSQL container/network,
  check two public URL environments against the same Next image ID, and scan runtime images.
  High/Critical findings, scanner errors and unfixed findings fail the gate. Scan JSON is retained.
  Run-owned container/volume/network cleanup occurs in `finally`; shared Docker resources are untouched.
- Chat capacity now has only a manual trigger and a 60-minute job limit. No capacity harness,
  duration, rate, gap or threshold changed. Manual execution is still required where the frozen
  release/performance verification contract calls for it; skipped is not PASS.
- Read-only Actions permissions and cancellation of superseded ordinary/artifact runs added.

## Verification and review

| Check | Result |
| --- | --- |
| YAML parsing of all three workflows | PASS |
| actionlint 1.7.8, all workflows (external shellcheck/pyflakes not installed) | PASS |
| `node --check` on both new CI helpers | PASS |
| `pnpm typecheck` | PASS, 6/6 tasks; Prisma generation uses a synthetic unreachable URL, no DB connection |
| `pnpm lint` | PASS, exit 0; existing dashboard-only lint script reports 3 warnings in unchanged files, 0 errors |
| `pnpm --filter @sabz/dashboard build` | PASS, fresh standalone production build |
| `pnpm exec playwright test --config playwright.ci.config.ts` | PASS, 7/7, 6.0 seconds |
| `pnpm audit --prod --audit-level high` and JSON inspection | PASS for Critical/High: 0/0; 5 Moderate entries remain visible |
| Trivy 0.75.0 native secret scan of tracked source snapshot | PASS, exit 0, no detected secrets |
| `git diff --check` | PASS |
| Docker artifact builds/smoke/image scans | NOT RUN: Linux-engine named pipe unavailable |
| Full ordinary integration suite and all-package build | NOT rerun locally; remain required CI gates, not claimed PASS here |
| Remote Actions and branch protection | NOT configured/executed; no push, PR or remote mutation |

Diagnostic history: the initial browser attempt lacked the matching Chromium executable.
After installing it, a stale local build plus the old `next start` launcher produced 2/7 PASS
and five redirect failures. A temporary public-config mock did not resolve that stale build
and was removed completely. The final launcher requires a fresh standalone build, copies
only ignored build assets, and uses the accepted runtime-config entrypoint with synthetic
public origins. The original browser suite is unchanged and then passes 7/7.
The first typecheck lacked DATABASE_URL; rerunning with a synthetic unreachable URL passes
without accessing any database. No product runtime or lockfile changes were needed.

Moderate findings are five dependency entries across four unique advisories:

- `GHSA-r3ph-w7gj-g6xm`: js-yaml; patched `>=5.4.1`.
- `GHSA-hrr3-gc8f-f4qj`: fast-uri 4.x and 3.x; patched `>=4.1.5` / `>=3.1.8` respectively.
- `GHSA-jvvf-x445-j334`: fast-uri 4.x; patched `>=4.1.5`.
- `GHSA-q2hr-2g5m-vwhr`: brace-expansion; patched `>=5.0.12`.

They are not muted or described as resolved. Dependency remediation requires a separate
compatibility-reviewed change; this maintenance does not alter manifests/lockfiles.

Main-agent source review: changes are limited to CI workflows/helpers/config/documentation.
Protected files, T07 implementation, deployment/runtime, schemas/migrations, capacity contracts
and roadmap checkboxes were not changed. No full-green or release-readiness claim is made.

## Handoff

Local configuration and non-Docker targeted verification are complete; artifact verification
remains pending. Next safe action: with a working Linux Docker engine, build the four artifacts,
run each new smoke helper and strict image scan, then execute the workflows remotely when the
owner authorizes publishing. Configure required `CI / verify` and `CI / security` checks after
successful remote runs; account for the path-filtered artifact workflow on documentation-only PRs.
No roadmap batch was started, task marked DONE, completed-task commit created, or push performed.
The owner subsequently authorized a standalone CI-maintenance commit of this configuration and evidence.
That commit preserves the pending Docker/remote verification above; it is not roadmap-task acceptance.

## Corrective Trivy template — owner-authorized commit/push

The remote secret-scan job failed while formatting its report: Trivy 0.75.0 supplies
`types.Results` (the results array) directly to Go templates, not the full JSON report.
The earlier native JSON scan did not exercise this custom template and therefore could
not prove that the CI reporting path worked. Change only `{{range .Results}}` to
`{{range .}}` in `.github/workflows/ci.yml`; keep secret scanning, exit-code 1 and the
location/rule-only output unchanged. No finding is waived or secret value logged.

Verification with native Trivy 0.75.0: the old template fails on a disposable synthetic
report; the corrected template renders exactly `fixture.txt:7 synthetic-rule` for a
populated finding and does not render its synthetic matched value. The corrected template
also passes the existing tracked-source scan snapshot with exit 0. Actionlint and
`git diff --check` pass. Docker image/remote Actions execution is not claimed by these checks.
Only the workflow and this evidence are included in the corrective maintenance commit;
no roadmap status/checklist, runtime, dependency, or capacity contract changes are made.
