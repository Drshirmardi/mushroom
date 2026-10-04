# Feature Specification: Phase 12 Production Hardening

**Feature Branch**: `codex/phase-12-speckit`
**Created**: 2026-09-30
**Status**: Clarified — pre-implementation baseline candidate; no roadmap task is claimed or implemented.
**Input**: Authoritative Phase 12 roadmap, Constitution, prior-phase contracts and repository evidence.

## Context and Scope

This phase establishes the evidence and release controls needed to deploy, observe, roll back, and recover the target release safely. It does not authorize a production deployment, provider connection, Sadad enable/default action, or application implementation. The Phase 10 capacity contract and the Phase 09 Sadad gate remain authoritative.

The phase covers precisely `F12-T01` through `F12-T13`: release envelope; deployment/staging; capacity; query/pool/timeout tuning; backup/restore; conditional object storage; secret rotation; security/abuse review; observability; migration/rollback; incident/breach response; accessibility/browser matrix; and independent sign-off. It excludes runtime code, schemas, migrations, dependencies, workflows, infrastructure provisioning, secrets, pushes, and PRs.

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
- **FR-013**: This baseline MUST not change `plan/STATUS.md`, the Phase 12 execution checklist, `plan/logs/`, runtime, schemas, migrations, dependencies, workflows, infrastructure, secrets, pushes, or PRs; Phase 12 stays `NOT_STARTED` and unclaimed.
- **FR-014**: The baseline MUST identify the current dormant Sadad transport/callback implementation, the requested real transport/redirect/callback/Verify/retry/reconciliation/idempotency/test scope, and the owner-approved roadmap task that may implement it; it MUST not silently place this scope in Phase 12.
- **FR-015**: `F12-T02` MUST keep Liara selection separate from the unproven static-outbound-egress capability, assign written provider/Sadad confirmation to the project owner, and block real payment connection if that confirmation is absent or negative without changing providers automatically.
- **FR-016**: `F12-T02`, `F12-T03`, `F12-T07`, `F12-T09` and `F12-T13` MUST share the approved Sadad-extension dependency map: code inventory and software completion; simulated/load correctness; non-Git secret integration and non-disruptive key rotation; safe telemetry/alerts; and acceptance/sign-off respectively.
- **FR-017**: `F12-T09` MUST define independent 60-second two-location HTTPS probes and five-minute non-financial synthetic authenticated checks for the approved scope, record raw and adjusted availability separately, and retain observation evidence.
- **FR-018**: Adjusted availability MUST exclude only recorded pre-approved/announced maintenance. A documented upstream Sadad outage may be excluded only from adjusted payment-journey availability; end-to-end payment availability includes it, and adapter/application defects are never excluded.

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

## Assumptions and Boundaries

- The roadmap and Constitution govern task IDs, state, scope, and historic status.
- Modular monolith, PostgreSQL, REST/OpenAPI, and independent deployability remain authoritative; this specification chooses no provider or topology.
- Containers and object storage are architectural possibilities, not selected production decisions; Kubernetes and extra datastores need evidence and approval.
- `F10-T09 REWORK` isolated CI workload execution; it did not change the frozen workload or threshold.
- Sadad remains blocked until its explicit acceptance gate is complete.
