# Implementation Plan: Phase 12 Production Hardening

**Branch**: `codex/phase-12-speckit` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

## Summary

Prepare the completed product for a Liara-targeted, separately staged production release. Preserve the existing modular monolith and Phase 09 payment boundaries; complete only documented gaps through `F12-T01`–`F12-T13`. Real Sadad activation remains blocked by merchant acceptance and written confirmation of a static outbound egress IP.

## Technical Context

**Language/Platform**: TypeScript, Next.js applications, NestJS/Fastify API, PostgreSQL/Prisma.
**Release topology**: independent app/web/dashboard/API deployments, PostgreSQL, HTTPS; staging and production separate.
**Provider direction**: Liara target; no purchase or provisioning in this baseline.
**Storage**: PostgreSQL; object storage N/A until an approved real upload consumer exists.
**Secrets**: deployment-managed secret store; payment credential revisions stay encrypted in existing persistence; encryption keys are outside Git/database.
**Operations targets**: approved capacity profile in spec; RPO ≤15 min, RTO ≤4 h; 99.5% calendar-month availability measured raw and adjusted separately.
**Testing**: targeted disposable-PostgreSQL/API/client/browser tests, controlled staging exercises, static scan and independent monitoring evidence.

## Constitution Check

| Gate | Result | Evidence / constraint |
|---|---|---|
| Scope discipline | PASS | Exactly F12-T01–T13; no implementation in this baseline. |
| Existing architecture | PASS | Modular monolith/PostgreSQL/OpenAPI and encrypted payment revisions preserved. |
| Roadmap authority | PASS | Stable task IDs, Phase 12 `NOT_STARTED`, no STATUS/log/checklist execution edits. |
| Risk-based verification | PASS | Capacity, authorization, recovery, security, browser/a11y and payment boundaries have explicit gates. |
| Single writers | PASS | Schema/migrations, payment orchestration, generated client, env templates, deployment configuration and monitoring config each have one task owner per batch. |

## Design Decisions and External Gates

1. Liara is selected, but its static **outbound** IP capability and Sadad compatibility are unproven. Project owner obtains written confirmation; no incoming/dedicated IP is treated as equivalent. A negative result blocks real payment connection and requires owner-approved provider change.
2. Production artifact promotion is staging-tested-artifact only; production promotion and rollback require owner approval.
3. Raw availability counts every failed observation. Adjusted availability excludes only recorded pre-approved/announced maintenance. Sadad upstream outage may be excluded only from adjusted payment-journey availability; end-to-end payment availability includes it.
4. The frozen chat workload remains `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, every batch `<=1000ms`. Historical `1015ms`/`1032ms` failures, CI isolation and scheduled/manual execution are inputs, not a changed threshold.
5. `F12-T02` owns the approved Sadad extension. It inventories existing dormant code first; it must not recreate accepted Phase 09 contracts. Enabling/default and external calls remain blocked until all acceptance evidence exists.
6. `F12-T02`'s corrective deployment extension produces provider-neutral, non-root OCI images for API, web, app and dashboard. Every final runner uses the owner-approved pinned Distroless Node 24 Debian 13 non-root digest as UID/GID `65532:65532`; Node 24 slim remains build-stage-only. Liara is only the first documented profile; the same tested digest must run on a generic Linux VPS or OCI PaaS. Next public URLs are emitted at runtime from a fixed public-only allowlist, and migrations are an explicit one-shot API-image command. Multi-instance realtime is blocked until a distributed Socket.IO/session adapter has its own approved and verified change.

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

## Definition of Done (per task)

A task is done only after its scoped output exists, owned-path review passes, its acceptance criteria and verification pass, non-secret evidence is recorded in the eventual phase log, and it creates no unapproved provider, secret, external connection, or activation. `F12-T13` additionally requires every external gate either passed or explicitly blocks release sign-off.
