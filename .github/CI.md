# CI gates

Every pull request and main push runs the existing frozen install, Prisma generate/validate,
migration/seed, lint, typecheck, tests and production builds. Browser smoke additionally runs
the seven existing dashboard access/session cases using explicitly mocked API responses;
this is not a claim of complete end-to-end booking or payment coverage.

The security job rejects High/Critical production dependency advisories and scans tracked
source for exposed secrets. Moderate advisories remain visible, not silently waived.
No local `.env` or real database is used.

Changes affecting release artifacts also build all four production images without publishing,
check non-root execution and HTTP readiness, exercise API migration on disposable PostgreSQL,
and verify Next public configuration changes with the same image ID. Runtime image scanning
rejects every reported High/Critical finding, including unfixed findings, and retains JSON reports.
This is artifact smoke, not real deployment or Liara capability evidence.

## Release and VPS delivery

`Release and stage` listens only to a successful `CI` push run for the current `main` commit. It rebuilds the four
runtime artifacts through the same project release command, repeats smoke and High/Critical scanning, publishes them
to private GHCR, records exact digests in one release manifest and, when enabled, creates registry provenance
attestations. It never
publishes from a pull request or a failed/canceled/superseded CI run.

The immutable manifest is uploaded immediately after a successful publish. GitHub artifact attestations are an
optional extra because private-repository attestation is not available on every organization plan. Leave repository
variable `GHCR_ATTESTATIONS_ENABLED` absent or `false` on unsupported plans; set it to `true` only after that GitHub
feature is available. Digest-only promotion, manifest verification and deployment do not depend on this optional step.

The repository variable `VPS_CD_ENABLED` controls external delivery. When it is absent or `false`, publication still
works and the staging VPS job is skipped. When it is `true`, staging deploys automatically through the `staging-vps`
Environment and the automatic workflow stops. The configured owner must then run `Promote staging release` with the
successful release run ID; that workflow revalidates staging and the immutable manifest before touching
`production-sim`. Both use host-key-pinned SSH, the versioned deployment script and the job-scoped `GITHUB_TOKEN` for
temporary private-GHCR read access. `Application rollback` is the explicit operator path and applies the same owner
check to production-sim.

The release contract check runs for affected pull requests and main changes. Live VPS acceptance still requires a
baseline plus two sequential update rehearsals; local workflow checks cannot claim that evidence.

## Long capacity check

`Chat capacity` is now manual-only (`workflow_dispatch`) in GitHub Actions. It has not been
deleted or shortened: the frozen 20 msg/s × 30 minutes, 61-second separation, 50 msg/s ×
5 minutes and batch ≤1000ms contract are unchanged. Run it before release and for changes
to chat/auth/database performance where capacity verification is required by the roadmap.
Its absence from ordinary PR runs does not count as a capacity PASS or waive release gates.

## Required checks

Configure branch protection to require `CI / verify` and `CI / security` after the first
successful remote runs. Path-filtered artifact checks must be enforced for applicable changes
without requiring a skipped workflow for documentation-only changes. Repository settings
are not modified by this local change. Tests/builds/security gates must actually pass;
a skipped, missing or unexecuted check is not green.
