# Implementation Plan: Phase 12 Production Hardening

**Branch**: `codex/vps-cd-pipeline` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

## Summary

Prepare the completed product for a Liara-targeted, separately staged production release. Preserve the existing modular monolith and Phase 09 payment boundaries; complete only documented gaps through `F12-T01`–`F12-T13`. Real Sadad activation remains blocked by merchant acceptance and written confirmation of a static outbound egress IP.

The owner-authorized `F12-T02` continuous-delivery corrective publishes the existing four provider-neutral OCI
artifacts to private GHCR only after successful protected-branch CI, deploys their immutable digests to an isolated
VPS `staging` project, and pauses before promotion to an isolated `production-sim` project. Promotion and
production-sim rollback require owner approval and never rebuild the accepted artifacts.

## Technical Context

**Language/Platform**: TypeScript, Next.js applications, NestJS/Fastify API, PostgreSQL/Prisma.
**Release topology**: independent app/web/dashboard/API deployments, PostgreSQL, HTTPS; staging and production separate.
**Provider direction**: Liara target; no purchase or provisioning in this baseline.
**Storage**: PostgreSQL; object storage N/A until an approved real upload consumer exists.
**Secrets**: deployment-managed secret store; payment credential revisions stay encrypted in existing persistence; encryption keys are outside Git/database.
**Operations targets**: approved capacity profile in spec; RPO ≤15 min, RTO ≤4 h; 99.5% calendar-month availability measured raw and adjusted separately.
**Testing**: targeted disposable-PostgreSQL/API/client/browser tests, controlled staging exercises, static scan and independent monitoring evidence.
**CD transport**: GitHub-hosted ephemeral runner, private GHCR, host-key-pinned OpenSSH and a restricted non-root VPS
identity. The VPS hosts no persistent runner or registry watcher.

## Constitution Check

| Gate | Result | Evidence / constraint |
|---|---|---|
| Scope discipline | PASS | The corrective stays inside F12-T02 release/CD artifacts and non-production rehearsal tooling. |
| Existing architecture | PASS | Modular monolith/PostgreSQL/OpenAPI and encrypted payment revisions preserved. |
| Roadmap authority | PASS | Stable task IDs and Phase 12 ownership remain authoritative; corrective status/evidence uses the normal batch gate. |
| Risk-based verification | PASS | Capacity, authorization, recovery, security, browser/a11y and payment boundaries have explicit gates. |
| Single writers | PASS | Schema/migrations, payment orchestration, generated client, env templates, deployment configuration and monitoring config each have one task owner per batch. |

## Design Decisions and External Gates

1. Liara is selected, but its static **outbound** IP capability and Sadad compatibility are unproven. Project owner obtains written confirmation; no incoming/dedicated IP is treated as equivalent. A negative result blocks real payment connection and requires owner-approved provider change.
2. Production artifact promotion is staging-tested-artifact only; production promotion and rollback require owner approval.
3. Raw availability counts every failed observation. Adjusted availability excludes only recorded pre-approved/announced maintenance. Sadad upstream outage may be excluded only from adjusted payment-journey availability; end-to-end payment availability includes it.
4. The frozen chat workload remains `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, every batch `<=1000ms`. Historical `1015ms`/`1032ms` failures, CI isolation and scheduled/manual execution are inputs, not a changed threshold.
5. `F12-T02` owns the approved Sadad extension. It inventories existing dormant code first; it must not recreate accepted Phase 09 contracts. Enabling/default and external calls remain blocked until all acceptance evidence exists.
6. `F12-T02`'s corrective deployment extension produces provider-neutral, non-root OCI images for API, web, app and dashboard. Every final runner uses the owner-approved pinned Distroless Node 24 Debian 13 non-root digest as UID/GID `65532:65532`; Node 24 slim remains build-stage-only. Liara is only the first documented profile; the same tested digest must run on a generic Linux VPS or OCI PaaS. Next public URLs are emitted at runtime from a fixed public-only allowlist, and migrations are an explicit one-shot API-image command. Multi-instance realtime is blocked until a distributed Socket.IO/session adapter has its own approved and verified change.
7. Private GHCR is the release registry. A successful `main` CI run is the only publication trigger. Staging and
   production-sim consume one signed release manifest containing the four exact digests and source SHA.
8. One test VPS may host both rehearsal environments only as isolated Compose projects with separate directories,
   databases, secrets, ports, origins and release records. It is not a production topology claim.
9. Deployment authenticates with environment-scoped SSH material and a pinned host key. Registry access is temporary,
   read-only and removed after pulling. The server stores runtime secrets but no long-lived GHCR credential.
10. Migration is forward-only and completes before application switching. Staging application verification failure
    restores the previous application digest set automatically; production-sim rollback is a separately approved job.

## Owned Surfaces and Single Writers

| Surface | Exclusive owner task | Dependent consumers |
|---|---|---|
| Release/environment decision record and Liara gate | F12-T01 | T02–T13 |
| Deployment manifests/IaC/container/release procedure | F12-T02 | T09–T13 |
| Sadad adapter, callback, orchestration, payment config and API contract/client | F12-T02 | T03, T07, T09, T13 |
| Load harness and capacity evidence | F12-T03 | T04, T13 |
| Prisma schema/migrations and rollback scripts | F12-T10 | T05, T13 |
| Query/index/pool/timeout changes | F12-T04 | T03, T10, T13 |
| Backup/restore configuration and evidence | F12-T05 | T13 |
| Object-storage decision/configuration | F12-T06 | T13 |
| Environment secret templates and rotation procedure | F12-T07 | T02, T13 |
| Security scan configuration/results | F12-T08 | T13 |
| Monitoring, alerting and runbooks | F12-T09 | T02, T03, T11, T13 |
| Incident/breach exercise | F12-T11 | T13 |
| Browser/device/a11y release matrix | F12-T12 | T13 |

## Artefacts

- [data-model.md](data-model.md): readiness evidence records and state boundaries.
- [contracts/release-readiness.md](contracts/release-readiness.md): observable operational contract.
- [quickstart.md](quickstart.md): non-production verification sequence.
- [tasks.md](tasks.md): authoritative Phase 12 task mapping and batch map.

## Continuous-delivery corrective design

1. `.github/workflows/release.yml` listens to successful completion of the protected `CI` workflow for `main`, checks
   out its exact SHA, verifies and publishes the four private GHCR images, records their registry digests in a release
   manifest, and preserves the manifest as workflow evidence.
2. The same workflow deploys the manifest to the test VPS `staging` project through a reusable, versioned SSH
   deployment script and repository-scoped credentials compatible with a private GitHub Free repository. Job
   concurrency serializes changes. It stops after staging.
3. `.github/workflows/promote.yml` is an explicit `workflow_dispatch` operation. It accepts a completed release run ID,
   verifies that run and its staging job succeeded, downloads the exact manifest, requires `github.actor` to match the
   configured `RELEASE_APPROVER`, and then deploys `production-sim`. A future paid-plan or real-production control
   plane must restore separately scoped credentials and an independent approval boundary.
4. The remote script validates environment isolation, pulls only digest references using a temporary Docker config,
   runs the API migration command, changes the Compose project, probes all four services and atomically records current
   and previous releases. A staging post-switch failure restores only the previous application manifest.
5. `.github/workflows/rollback.yml` is an explicit operator workflow. Staging may be restored automatically by the
   deploy script; production-sim rechecks the configured owner before any remote action.
6. Repository tests validate workflow permissions/triggers, release-manifest shape, immutable references, isolation
   checks, temporary credential cleanup and rollback policy without needing a live provider.

## Definition of Done (per task)

A task is done only after its scoped output exists, owned-path review passes, its acceptance criteria and verification pass, non-secret evidence is recorded in the eventual phase log, and it creates no unapproved provider, secret, external connection, or activation. `F12-T13` additionally requires every external gate either passed or explicitly blocks release sign-off.
