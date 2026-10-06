# Feature Specification: Phase 12 Production Hardening

**Feature Branch**: `codex/vps-cd-pipeline`
**Created**: 2026-09-30
**Status**: Clarified — owner-authorized continuous-delivery/VPS corrective is claimed under `F12-T02`.
**Input**: Authoritative Phase 12 roadmap, Constitution, prior-phase contracts and repository evidence.

## Context and Scope

This phase establishes the evidence and release controls needed to deploy, observe, roll back, and recover the target release safely. It does not authorize a real production deployment or Sadad enable/default action. The owner-authorized corrective in CL-008 through CL-012 permits release/CD workflows, deployment tooling and a non-production VPS rehearsal while keeping provider-neutral application boundaries, the Phase 10 capacity contract and the Phase 09 Sadad gate authoritative.

The phase covers precisely `F12-T01` through `F12-T13`: release envelope; deployment/staging; capacity; query/pool/timeout tuning; backup/restore; conditional object storage; secret rotation; security/abuse review; observability; migration/rollback; incident/breach response; accessibility/browser matrix; and independent sign-off. The CL-008 through CL-012 corrective changes only `F12-T02` release/deployment artifacts, workflow code, documentation and the minimum API-image packaging required for offline migration; it excludes application features, schema changes, real secrets, real production provisioning and Sadad activation.

## Clarifications

### Session 2026-09-30 — owner direction

- **CL-001 (partially resolved)**: The target release uses separate staging and production environments, PostgreSQL and HTTPS; release promotion and production release require the owner's manual approval. A provider is not selected. The baseline must present a minimal provider option with cost, constraints and Sadad static-egress-IP suitability for later approval.
- **CL-002 (partially resolved)**: No production traffic numbers or SLOs are approved. The baseline must derive an initial, measurable proposal from real journeys and existing capacity evidence; it is explicitly not an approved replacement for the frozen Phase 10 measurement contract.
- **CL-003 (partially resolved)**: Sadad real-payment completion is in the target release. The baseline must prepare operational proposals for backup/RPO/RTO, secret management/rotation, and object-storage applicability. Credential revisions and encryption remain the current architecture; moving credentials into environment variables is prohibited without separate approval. `.env.example` documentation and empty local `.env` placeholders are implementation work only, must not contain real values, and must not bypass acceptance/enable/default gates.

### Session 2026-09-30 — approved change control and release envelope

- **CL-004 (resolved)**: Liara is the initial provider target. Staging and production are separate; each uses PostgreSQL and HTTPS. A tested immutable artifact is promoted from staging, and the owner manually approves production promotion and rollback. Written confirmation that Liara supplies a static **outbound** egress IP acceptable to Sadad is an execution gate owned by the project owner. Inbound/dedicated IP is not evidence of this capability. No purchase, provisioning, external connection, or automatic provider substitution is authorized.
- **CL-005 (resolved except availability)**: Capacity acceptance is: mixed authenticated traffic `10 req/s × 30 min`, p95 `<=750ms`, success `>=99%`; booking conflict `2 req/s` against one slot with zero duplicate allocation; the frozen chat workload unchanged; Sadad automated simulated transport with zero duplicate financial effect and merchant-approved controlled-real-transaction rate. PostgreSQL recovery is RPO `<=15 min`, RTO `<=4 h`, daily backup plus continuous WAL/archive and a restore drill. Runtime secrets use the deployment environment's managed secret store, rotate every 90 days and immediately on exposure; payment credentials remain in encrypted revisions, while encryption keys remain outside Git and the database and must rotate without making historic revisions unreadable. The owner is final release approver. Object storage is N/A unless a real upload/attachment consumer is approved.
- **CL-006 (resolved)**: The live Sadad software gap is an approved extension of `F12-T02`, not a reopened Phase 09 task. It inventories existing adapter/callback/config/orchestration first, then fills only missing transport, request/redirect/callback/Verify wiring, timeout/ambiguous response, retry, reconciliation, idempotency, validation/configuration, `.env.example` placeholders and tests. `F12-T03`, `F12-T07`, `F12-T09` and `F12-T13` carry the related verification, secret, observability and sign-off dependencies.

### Session 2026-09-30 — approved availability SLO

- **CL-007 (resolved)**: Initial production availability is at least **99.5% per calendar month**, separate from capacity-test success rate. The scope is the public API health/readiness surface and the approved synthetic authenticated critical journeys: patient sign-in/session refresh, onboarding status, assessment submission, directory/availability/booking, patient encounter read, and (after its gate opens) payment attempt status. Independent HTTPS probes run every 60 seconds from at least two distinct monitoring locations; synthetic authenticated checks run every five minutes from a dedicated non-human test identity with no financial side effect. A successful probe returns an expected HTTPS status within the approved monitor timeout; a synthetic check must complete its stated journey and validate its expected safe response. Raw availability includes every failed observation. Adjusted availability excludes only a pre-approved, announced maintenance window with recorded start/end and impact; it never excludes unplanned application failure. A documented upstream Sadad outage may be excluded only from **adjusted payment-journey availability**; adapter defects, unsafe timeout/retry behavior, and all other application failures remain included. End-to-end payment availability, including upstream Sadad outages, is reported separately. The implementation must prove these measurements before sign-off; this baseline makes no achievement claim.

### Session 2026-10-06 — continuous delivery and VPS rehearsal

- **CL-008 (resolved)**: Work begins on a feature branch and pull-request CI must pass before merge. A merge to `main`
  runs the protected-branch CI again; only its successful completion may publish immutable release images and continue
  the CD workflow into the test/staging environment. The final production-promotion job always waits for the project
  owner's explicit approval and deploys the exact staging-accepted digests without rebuilding them.
- **CL-009 (resolved)**: The initial VPS is a non-production rehearsal target only. One VPS hosts two logically isolated
  Compose projects: automatically updated `staging` and owner-approved `production-sim`. They use distinct databases,
  volumes, secrets, ports, origins and release records; neither may use production data, credentials or real Sadad.
  Acceptance starts from a clean baseline, then applies at least two sequential release updates and proves the expected
  application version/digest, successful migration, retained data, health checks, promotion and application rollback.
- **CL-010 (resolved)**: Deployment uses an ephemeral GitHub-hosted runner connecting over SSH to a restricted,
  non-root VPS `deploy` identity. Host-key pinning, environment-scoped SSH material, serialized per-environment
  deployment and a versioned repository script are mandatory. A persistent self-hosted runner or registry-watching
  agent is not installed on the VPS.
- **CL-011 (resolved)**: Release packages remain private in GHCR. Publication uses the workflow `GITHUB_TOKEN` with
  least-privilege `packages: write`; deployment grants only temporary read access for the selected digest set through
  an ephemeral Docker credential directory that is removed after pull. No long-lived registry PAT is stored on the VPS,
  and package access must remain linked and scoped to this repository.
- **CL-012 (resolved)**: A failed startup, readiness or approved synthetic check in `staging` triggers automatic
  application-only rollback to its recorded prior digest set. `production-sim` and real production require explicit
  owner approval before rollback. No environment performs automatic database rollback: a failed migration stops before
  application switching, while a post-migration application failure retains the additive schema and returns only the
  application artifacts to their prior digests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Approve a release envelope (Priority: P1)

As the release owner, I can approve a bounded target release, traffic/SLO envelope, deployment and recovery policy from repository evidence rather than assumptions.

**Why this priority**: Every production-readiness gate depends on an explicit envelope.

**Independent Test**: A reviewer can trace every release decision to owner approval or evidence, and can identify a missing decision without inferring a default.

**Acceptance Scenarios**:

1. **Given** Phase 10/11 closure evidence, **When** the envelope is reviewed, **Then** target release, traffic/SLO, provider, environments, RPO/RTO, and external-service applicability are evidenced or visibly blocked.
2. **Given** a proposal to change a frozen capacity metric, **When** evaluated, **Then** it is rejected absent the established change-control approval.

---

### User Story 2 - Operate and recover safely (Priority: P1)

As an operations owner, I can stage, deploy, observe, alert, restore, roll back, rotate secrets, and handle an incident with approved procedures and attributable evidence.

**Why this priority**: A release is not ready when only its normal path is proven.

**Independent Test**: A reviewer can follow a non-production rehearsal and compare its outcome with an approved objective without undocumented manual knowledge.

**Acceptance Scenarios**:

1. **Given** an approved environment strategy, **When** a release candidate is promoted, **Then** deployment, migration, rollback, health, alert, and release-decision evidence identifies an owner and outcome.
2. **Given** a recoverable service incident, **When** an exercise runs, **Then** the outcome is compared with the approved objective and deviations remain release blockers.
3. **Given** a feature branch whose pull request is merged, **When** protected-branch CI succeeds, **Then** immutable
   images are published and staging delivery may proceed; production remains paused until the owner approves the exact
   staging-accepted digests.
4. **Given** the non-production VPS baseline, **When** at least two later commits are delivered, **Then** staging receives
   each eligible digest automatically, `production-sim` receives only an owner-approved staging digest, persisted test
   data remains valid, and the recorded running version matches the release manifest.

---

### User Story 3 - Protect release users under load and failure (Priority: P1)

As a patient, clinician, or clinic operator, I can use the approved release journeys under approved load without unsafe authorization, payment, availability, accessibility, or observability regressions.

**Why this priority**: Production hardening protects real users, not merely components.

**Independent Test**: The release matrix records approved journeys, capacity evidence, security/abuse checks, observability, and browser/accessibility coverage or approved exclusions.

**Acceptance Scenarios**:

1. **Given** the frozen chat workload, **When** capacity evidence is reviewed, **Then** `20 msg/s × 30 min`, a `61-second` gap, `50 msg/s × 5 min`, and per-batch `<= 1000ms` remain unchanged; `1015ms` and `1032ms`, `F10-T09 REWORK` CI isolation, and scheduled/manual-run evidence are recorded as inputs.
2. **Given** a candidate with an unsatisfied security, accessibility, browser/device, or Sadad gate, **When** readiness is decided, **Then** the blocked capability is explicit and no unapproved activation occurs.

### Edge Cases

- A provider, metric, recovery target, secret manager, storage scope, or Sadad acceptance claim lacks owner-approved evidence.
- A scheduled capacity run is absent, fails, or is inconclusive; its frozen workload and threshold are not altered.
- A deployment, migration, rollback, restore, rotation, scan, alert, assistive-technology, cross-tenant, callback, or clock-skew exercise reveals a deviation.
- Pull-request or protected-branch CI fails, is canceled, or is inconclusive; no image publication or deployment may
  continue from that run.
- A service, database, secret, volume, port, origin or release record crosses between the VPS `staging` and
  `production-sim` projects; the rehearsal fails and promotion stops.
- The VPS host key differs from the pinned `known_hosts` value, SSH requires root, or another deployment for the same
  environment is active; deployment stops before changing the release.
- GHCR authentication, repository/package linkage or exact-digest pull fails; deployment stops without falling back to
  a public package, mutable tag or persistent VPS credential.
- A migration fails before switching, or a new application fails after a successful migration; the former leaves the
  active release unchanged, while the latter follows the environment's approved application-only rollback policy and
  retains the expanded schema.
- There is no confirmed file consumer; object storage is marked not applicable with evidence rather than silently omitted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The baseline MUST preserve `F12-T01`–`F12-T13`, dependencies, batch map, owned paths, single-writer resources, acceptance criteria, Definition of Done, and verification; it MUST NOT replace the roadmap.
- **FR-002**: `F12-T01` MUST freeze only owner-approved release target, SLO, traffic, and environment decisions with their evidence and change-control authority.
- **FR-003**: `F12-T02` MUST require provider-approved deployment, container/IaC scope, staging/promotion, health/release gates, rollback ownership, and evidence. Approved change-control: the release artifact is provider-neutral OCI/Linux, Liara is only the first deployment profile, final runners use the approved pinned Distroless Node 24 non-root base as UID/GID `65532:65532`, and public runtime configuration must not require image rebuild or contain secrets.
- **FR-004**: `F12-T03` MUST cover auth, onboarding, assessment, booking, encounter, communications, commerce/payment boundaries, and confirmed release features under the approved profile; it MUST preserve the frozen Phase 10 measurement contract and record `1015ms`, `1032ms`, CI isolation, and scheduled/manual result.
- **FR-005**: `F12-T04` MUST use measured query/index, pool, and timeout evidence; any new datastore or scale topology needs a measured bottleneck and approval.
- **FR-006**: `F12-T05`/`F12-T06` MUST distinguish approved PostgreSQL backup/restore objectives from conditional storage retention/restore requirements.
- **FR-007**: `F12-T07`/`F12-T08` MUST require approved secret management/rotation, dependency/container/security scans, and abuse scenarios without secrets or sensitive materials in Git.
- **FR-008**: `F12-T09` MUST cover service/frontend observability, alert owners, and runbooks for approved release journeys and integrations.
- **FR-009**: `F12-T10`/`F12-T11` MUST rehearse low-downtime migration/rollback and incident/breach response against approved objectives.
- **FR-010**: `F12-T12` MUST define an approved browser/device/accessibility matrix, critical journeys, and documented exclusions.
- **FR-011**: `F12-T13` MUST independently reject missing evidence, unresolved decision gates, failed verification, unowned alerts/runbooks, or unapproved exceptions.
- **FR-012**: Sadad real-payment completion is target-release scope. `SADAD_GO_LIVE_BLOCKED` MUST remain until non-secret evidence exists for the current endpoint/redirect profile, static egress IP, HTTPS callback domain/path, off-Git credentials, controlled acceptance transaction, actual callback Content-Type/field casing, Amount/redirect/Verify validation including optional `TransactionDate`, create/Verify-retry/reconciliation/clock-skew monitoring, and merchant/product-owner sign-off. The existing encrypted credential-version/revision architecture remains authoritative; environment values may not replace it or bypass enable/default gates.
- **FR-013**: The original baseline itself MUST NOT claim implementation evidence. Later owner-authorized corrective work
  MAY update execution status, workflows, deployment tooling and evidence through the normal claim/review/commit gates;
  it MUST NOT silently change schemas, product behavior, real secrets, production state or Sadad activation.
- **FR-014**: The baseline MUST identify the current dormant Sadad transport/callback implementation, the requested real transport/redirect/callback/Verify/retry/reconciliation/idempotency/test scope, and the owner-approved roadmap task that may implement it; it MUST not silently place this scope in Phase 12.
- **FR-015**: `F12-T02` MUST keep Liara selection separate from the unproven static-outbound-egress capability, assign written provider/Sadad confirmation to the project owner, and block real payment connection if that confirmation is absent or negative without changing providers automatically.
- **FR-016**: `F12-T02`, `F12-T03`, `F12-T07`, `F12-T09` and `F12-T13` MUST share the approved Sadad-extension dependency map: code inventory and software completion; simulated/load correctness; non-Git secret integration and non-disruptive key rotation; safe telemetry/alerts; and acceptance/sign-off respectively.
- **FR-017**: `F12-T09` MUST define independent 60-second two-location HTTPS probes and five-minute non-financial synthetic authenticated checks for the approved scope, record raw and adjusted availability separately, and retain observation evidence.
- **FR-018**: Adjusted availability MUST exclude only recorded pre-approved/announced maintenance. A documented upstream Sadad outage may be excluded only from adjusted payment-journey availability; end-to-end payment availability includes it, and adapter/application defects are never excluded.
- **FR-019**: Continuous delivery MUST run pull-request CI before merge and protected-branch CI after merge. Only a
  successful `main` run may publish immutable release artifacts and deploy staging; production promotion MUST require
  the project owner's explicit approval and MUST reuse the staging-accepted digests without rebuild.
- **FR-020**: The test VPS MUST keep `staging` and `production-sim` as separate Compose projects with distinct database,
  volume, secret, port, origin and release-state boundaries. Both are non-production and MUST reject production data,
  credentials and real Sadad connectivity.
- **FR-021**: Deployment MUST originate from an ephemeral GitHub-hosted runner over host-key-pinned SSH using a
  restricted non-root VPS identity and a versioned repository script. GitHub environment secrets MUST scope connection
  material, and concurrency MUST serialize each target environment without a persistent self-hosted runner or polling
  update agent on the VPS.
- **FR-022**: GHCR release packages MUST remain private. Publication MUST use a least-privilege workflow token, and VPS
  pull MUST use temporary read-only access with an ephemeral Docker credential directory removed after the exact
  digests are present. Long-lived registry PATs, public fallback and mutable-tag deployment are prohibited.
- **FR-023**: Failed staging startup/readiness/synthetic verification MUST trigger automatic application-only rollback
  to the recorded prior digest set. `production-sim` and production rollback MUST require explicit owner approval.
  Migration failure MUST stop before switching artifacts, and database rollback/reset/down migration MUST never run
  automatically.

### Key Entities

- **Release envelope**: Approved target release, environment, SLO/traffic, recovery, and external-service decisions.
- **Readiness evidence**: Non-secret attributable outcome of a rehearsal, scan, measurement, review, or exception.
- **Operational runbook**: Owned procedure for release, alert response, rollback, restore, rotation, or incident handling.
- **Release sign-off**: Accountable final decision on readiness and any explicit exception.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `F12-T01`–`F12-T13` have a requirement-to-task mapping, dependency, owner class, acceptance criteria, Definition of Done, verification, owned paths, and single-writer declaration before implementation.
- **SC-002**: 100% of provider, environment, SLO/traffic, RPO/RTO, secret-management, storage, and Sadad decisions have owner approval or explicit release-blocking status; none is silently defaulted.
- **SC-003**: 100% of critical release journeys have named capacity, security, observability, recovery, and browser/accessibility gates or approved exclusions.
- **SC-004**: The frozen Phase 10 workload and `<= 1000ms` measurement remain traceable unchanged, including both historical failures and the isolated scheduled/manual outcome.
- **SC-005**: Sign-off cannot pass with an open clarification, high-severity analysis finding, missing evidence, failed checklist criterion, unapproved exception, or unproven monthly availability measurement.
- **SC-006**: 100% of production promotions identify the successful protected-branch CI run, published digest set,
  staging deployment and verification result, and explicit owner approval for those same digests.
- **SC-007**: The VPS rehearsal accepts one baseline plus at least two sequential updates only when each running service
  reports the expected immutable release, test data survives compatible migrations, staging auto-delivery succeeds,
  `production-sim` remains approval-gated, and the application-only rollback returns to the recorded prior digests.
- **SC-008**: Every VPS change is attributable to one GitHub deployment run, one restricted SSH identity, one pinned
  host key, one target environment and one immutable release manifest; overlapping deployments to that environment are
  prevented.
- **SC-009**: Every accepted VPS release proves that all four private GHCR artifacts were pulled by immutable digest
  using temporary read access, and that no registry credential remains in the deployment user's persistent Docker
  configuration after the pull.
- **SC-010**: A controlled failed-release rehearsal proves staging returns to all four prior healthy digests
  automatically, `production-sim` waits for owner rollback approval, persisted test data remains intact and no database
  reset, down migration or destructive rollback command runs.

## Assumptions and Boundaries

- The roadmap and Constitution govern task IDs, state, scope, and historic status.
- Modular monolith, PostgreSQL, REST/OpenAPI, and independent deployability remain authoritative; this specification chooses no provider or topology.
- Containers and object storage are architectural possibilities, not selected production decisions; Kubernetes and extra datastores need evidence and approval.
- `F10-T09 REWORK` isolated CI workload execution; it did not change the frozen workload or threshold.
- Sadad remains blocked until its explicit acceptance gate is complete.
