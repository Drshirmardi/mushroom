# Phase 12 Release Envelope — F12-T01

**Status**: Accepted task output; implementation and external evidence remain follow-up work.
**Decision owner**: Project owner / final production approver.
**Task owner**: `F12-T01` coordinator.

## Target release

The first production release comprises the completed product capability set plus the approved `F12-T02` extension for
real Sadad payment software completion. It does not authorize a real Sadad connection, provider provisioning, payment
enable/default, production deployment, or external credentials. Those remain gated delivery work.

## Environment and promotion strategy

- Liara is the initial provider target, with separate staging and production environments, each using PostgreSQL and HTTPS.
- A release candidate must be tested in staging; the same immutable artifact is the only artifact eligible for production promotion.
- The project owner manually approves production promotion and rollback.
- The project owner owns written confirmation that Liara supplies a static **outbound** egress IP acceptable to Sadad.
  An inbound/dedicated IP is insufficient. A missing or negative confirmation blocks real Sadad connection and payment
  sign-off; it does not silently select another provider or block unrelated F12-T01 completion.

## Capacity and availability objectives

| Area | Approved objective | Boundary |
|---|---|---|
| Mixed authenticated journeys | `10 req/s` for 30 minutes, p95 `<=750ms`, success `>=99%` | Capacity-test result, not availability SLO. |
| Booking conflict | `2 req/s` against one slot; zero duplicate allocation | Server-side allocation invariant. |
| Chat | frozen `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, every batch `<=1000ms` | `1015ms`/`1032ms`, F10-T09 isolation and scheduled/manual execution remain recorded inputs; threshold unchanged. |
| Sadad | automated simulated transport has zero duplicate financial effect; controlled real test rate only per merchant-approved plan | Verify is authoritative; external acceptance remains blocked. |
| Availability | `>=99.5%` per calendar month | Separate from capacity success rate; must be proven by F12-T09 before sign-off. |

Availability scope is API health/readiness and safe synthetic authenticated sign-in/session refresh, onboarding status,
assessment submission, directory/availability/booking, encounter read, plus gated payment status. Independent HTTPS
probes run every 60 seconds from at least two locations; a non-human identity runs a non-financial synthetic check every
five minutes. Raw availability includes every failed observation. Adjusted availability excludes only a recorded,
pre-approved and announced maintenance interval. A documented upstream Sadad outage may be excluded only from adjusted
payment-journey availability; end-to-end payment availability includes it. Adapter defects, unsafe timeout/retry and
all other application failures are never excluded.

## Recovery, secrets and storage

- PostgreSQL target: RPO `<=15 minutes`, RTO `<=4 hours`, daily base backup plus continuous WAL/archive and a restore
  drill proving data integrity and migration compatibility. Actual Liara capability remains evidence required by F12-T05.
- Runtime secrets use the deployment environment's managed secret store, rotate every 90 days and immediately upon
  exposure. Payment credentials stay in current encrypted immutable revisions. Encryption keys stay outside Git and the
  database; rotation must preserve readability of historic revisions. Capability and non-disruptive drill evidence belong
  to F12-T07.
- Object storage is `N/A` for this release: API source has no real upload/attachment/medical-file consumer. A later real
  consumer requires explicit decision review before any storage scope is added.

## Sadad gates and task boundary

F12-T02 owns only the approved software gap after inventorying existing adapter, callback, config and orchestration code:
transport; request/redirect/callback/Verify wiring; timeout/ambiguous response; retry; reconciliation; idempotency;
configuration validation; `.env.example` placeholders; and tests. It must preserve accepted Phase 09 work, credential
revisions and the fail-closed gate. `SADAD_GO_LIVE_BLOCKED` remains until all non-secret acceptance evidence, merchant
credentials outside Git, endpoint/callback profile, written egress confirmation, observability/runbooks, and project-owner
sign-off exist. Environment placeholders never bypass this gate.

## External-gate register

| Gate | Owner | Blocks | Follow-up |
|---|---|---|---|
| Liara static outbound egress and Sadad compatibility, in writing | Project owner | Real Sadad connection/payment sign-off | F12-T02/F12-T13 |
| Merchant credentials and acceptance profile | Project owner / merchant | Real calls, enable/default, payment sign-off | F12-T02/F12-T13 |
| Liara backup/WAL/archive evidence and restore drill | F12-T05 owner | Recovery sign-off | F12-T05/F12-T13 |
| Managed secret-store capability and rotation drill | F12-T07 owner | Secret-management sign-off | F12-T07/F12-T13 |
| Monthly probe observations | F12-T09 owner | Final release sign-off | F12-T09/F12-T13 |

## Change control

Any change to provider, egress requirement, target release, traffic/availability/recovery objective, secret architecture,
object-storage applicability, frozen chat workload, or Sadad activation condition requires explicit owner approval and
an updated contract. This document does not claim production readiness.
