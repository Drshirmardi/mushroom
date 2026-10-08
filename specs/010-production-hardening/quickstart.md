# Pre-Implementation Verification Sequence

1. Confirm the Phase 12 envelope and owner approval before any task claim.
2. Record Liara static-outbound-egress/Sadad written confirmation as an external gate; do not provision or connect while absent.
3. For each task, run its targeted checks on an isolated disposable environment and preserve non-secret evidence.
4. Keep the Phase 10 capacity workload and threshold byte-for-byte unchanged; use its separate scheduled/manual route.
5. Before sign-off, run staging deployment/rollback, PostgreSQL restore, security/abuse, monitoring/alert, incident, and browser/a11y exercises.
6. Reconcile every requirement to an accepted task and every external gate to a passed result or release-blocking record.

## Continuous-delivery rehearsal sequence

1. Open a feature branch and pull request; require the ordinary CI and release-artifact checks to pass.
2. Merge to protected `main`; the new `main` CI run must pass before release publication begins.
3. Publish the four private GHCR images, resolve their digests and create one immutable release manifest.
4. Deploy that manifest to the isolated VPS `staging` project over host-key-pinned SSH; run migration before switching,
   verify all services, record the release and automatically restore the previous application manifest on failure.
5. Review staging evidence, then manually run `Promote staging release` with that release workflow run ID. The workflow
   revalidates staging success and the configured owner before continuing.
6. Deploy the same digests to the isolated `production-sim` project only after the workflow verifies the configured
   owner, and record the result. The private GitHub Free rehearsal uses repository-scoped credentials for its one VPS.
7. Repeat steps 1–6 for at least two sequential updates, then run controlled staging and approved production-sim
   rollback rehearsals. Confirm test data survived and no database rollback command ran.
8. Treat the VPS outcome as non-production evidence. Provider backup, managed-secret, availability and Sadad gates
   remain separate requirements for final production sign-off.
