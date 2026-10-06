# Tasks: Phase 12 Production Hardening

**Authority**: `plan/phases/12-PRODUCTION-HARDENING.md` remains the roadmap. This file plans it; it does not claim a batch or change Phase 12 status.

## Common Definition of Done

Every task: stays within its owned paths; preserves existing contracts; passes its specified checks; records non-secret evidence when implementation begins; introduces no real secret, provider purchase/provisioning, external Sadad call, enable/default, or production deployment without its gate. A task with an unmet external gate may complete its software/readiness scope only if the gate remains explicit and `F12-T13` blocks release sign-off.

## Task Contract Map

| Task | Depends on | Owned paths / exclusive resource | Acceptance and verification |
|---|---|---|---|
| F12-T01 release envelope | Phase 10/11 closure | `plan/phases/12-*`, release-decision docs; no shared runtime paths | Liara/staging/production/manual promotion, capacity/recovery/SLO decisions and external gates recorded; review against Constitution and `git diff --check`. |
| F12-T02 deployment + Sadad extension | T01 | deployment/container/IaC/release docs; `apps/api/src/modules/commerce/payments/**`, payment controllers, API contract/client, `.env.example`; sole payment/API-contract writer | inventory existing dormant code; provider-neutral OCI/Linux artifact with the approved pinned Distroless Node 24 non-root runner, public runtime config without secrets, explicit migration command, and single-instance realtime boundary; staged artifact promotion/rollback design; only missing Sadad transport/request/redirect/callback/Verify/timeout/retry/reconciliation/idempotency/config validation/env placeholders/tests completed; static-egress and merchant gates retain `SADAD_GO_LIVE_BLOCKED` and block connection/enable/default. API/client freshness, targeted PostgreSQL/API tests, redaction/negative-gate tests. |
| F12-T03 capacity | T01, T02 contract freeze | load harness/capacity evidence; sole workload writer | approved mixed/booking/chat/Sadad-simulated profiles; frozen chat `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000ms` per batch unchanged; records `1015ms`,`1032ms`, CI isolation and scheduled/manual outcome. Disposable DB/load invariants, no duplicate booking/payment, timing evidence. |
| F12-T04 performance tuning | T03 | query/index/pool/timeout code/tests; sole query-plan writer | only measured bottlenecks tuned; no speculative datastore. EXPLAIN/query plan, pool/timeout failure tests, regression/typecheck. |
| F12-T05 PostgreSQL recovery | T01 | backup/restore procedure/configuration; sole restore owner | daily backup/WAL/archive capability evidenced; RPO≤15m/RTO≤4h restore drill proves integrity/migration compatibility. |
| F12-T06 object storage | T01 | storage decision/config only; sole storage writer | source-consumer review confirms N/A or approved consumer receives retention/restore/private-access contract. Current expected result: N/A. |
| F12-T07 secrets/rotation | T01, T02 config contract | secret-store integration, `.env.example`, payment key-rotation procedure; sole secret-template writer | managed deployment secret store capability, 90-day/exposure rotation and non-disruptive encryption-key rotation verified; no secret in Git/database/log. |
| F12-T08 security/abuse | T01, T02 | scan config/results, abuse tests; sole scanner writer | dependency/container/security scan and abuse cases pass or tracked; payment callback/redirect, auth, rate-limit and secret disclosure covered. |
| F12-T09 observability | T02, T03, T07 | telemetry, monitor/alert/runbooks; sole monitor writer | 60s two-location HTTPS probes, 5m safe synthetic auth check, raw/adjusted formulas, payment outage split, alert owners/runbooks; frontend errors included. |
| F12-T10 migration/rollback | T02, T04 | Prisma schema/migrations/rollback exercise; sole migration writer | low-downtime plan and rollback rehearsed on staging/disposable data, preserves compatibility; migration/client checks pass. |
| F12-T11 incident/breach | T05, T07, T09, T10 | incident/breach runbooks/exercise evidence; sole incident writer | restore, secret exposure, payment/provider and privacy scenarios exercised; escalation/communication/audit path verified. |
| F12-T12 browser/a11y matrix | T02, T09 | browser/device/a11y matrix and E2E evidence; sole matrix writer | approved critical journeys on defined browser/device/assistive matrix, documented exclusions, no payment activation bypass. |
| F12-T13 readiness/sign-off | T01–T12 | final review and sign-off record; sole final reviewer | requirement traceability, all task evidence, all external gates, Sadad acceptance, availability-month measurement and owner approval reviewed. Any unmet external gate blocks release sign-off. |

## Dependencies and Batches

| Batch | Tasks after normal claim | Reason / serialization |
|---|---|---|
| B1 | T01 | freezes release envelope and all gate ownership. |
| B2 | T02 | exclusive deployment/payment/API-contract extension. |
| B3 | T03, T05, T06 | isolated load, recovery and storage-decision paths after contracts freeze. |
| B4 | T04, T07, T08 | serialize query and secret writers; scan may follow frozen payment surface. |
| B5 | T09, T10 | monitoring and migration have distinct owned paths after code/contracts stabilize. |
| B6 | T11, T12 | starts only after accepted T09/T10; incident and browser/a11y work consume the accepted monitoring contract, while retaining distinct owned paths. |
| B7 | T13 | independent final review only; no implementation edits. |

Tasks in a batch may be reduced or serialized by the coordinator when shared environments, generated clients, migrations or release configurations overlap. No batch is currently active.

## Requirement Traceability

| Requirements | Task coverage |
|---|---|
| FR-001–003, SC-001–002 | T01, T02, T13 |
| FR-004, SC-003–004 | T03, T04, T13 |
| FR-005–006 | T04–T06, T13 |
| FR-007 | T07–T08, T13 |
| FR-008, FR-017–018 | T09, T13 |
| FR-009 | T10–T11, T13 |
| FR-010 | T12, T13 |
| FR-011, FR-013, SC-005 | T13 |
| FR-012, FR-014–016 | T02, T03, T07, T09, T13 |
| FR-019–023, SC-006–010 | T02, T10, T13 |

## External Gates

| Gate | Owner | Blocks |
|---|---|---|
| Liara written static outbound-egress/Sadad compatibility confirmation | Project owner | real Sadad connection and payment sign-off |
| Merchant credentials, endpoint/redirect/callback acceptance evidence | Project owner / merchant | real calls, enable/default, payment sign-off |
| Liara backup/WAL/archive and managed-secret capabilities | F12-T05 / F12-T07 owner | recovery/secret sign-off |
| Monthly availability observations | F12-T09 owner | final release sign-off |

## F12-T02 continuous-delivery corrective checklist

These implementation slices retain `F12-T02` as the roadmap and commit identity. They are serialized because the
release manifest, workflows and remote deployment contract are shared single-writer surfaces.

- [x] T001 [US2] Define the immutable release-manifest and VPS deployment contract in `deploy/contracts/release-manifest.schema.json`, `deploy/vps/README.md` and `deploy/vps/env.example`
- [x] T002 [US2] Extend private GHCR publication to emit verified digest evidence in `scripts/release-images.mjs` and `.github/workflows/release.yml`
- [x] T003 [US2] Implement host-key-pinned, non-root, temporary-registry-auth deployment in `deploy/vps/deploy-release.sh` and `deploy/vps/compose.yaml`
- [x] T004 [US2] Wire automatic staging and owner-dispatched production-sim promotion in `.github/workflows/release.yml` and `.github/workflows/promote.yml`
- [x] T005 [US2] Add explicit owner-gated application rollback in `.github/workflows/rollback.yml` and `deploy/vps/deploy-release.sh`
- [x] T006 [US2] Validate workflow permissions, manifest immutability, isolation and rollback behavior in `scripts/test-release-pipeline.mjs`
- [x] T007 [US2] Document GitHub Environment/VPS bootstrap and update rehearsal in `docs/PRODUCTION.md` and `deploy/vps/README.md`
- [x] T008 [US2] Record local verification and external VPS inputs in `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md` and `plan/STATUS.md`

**Independent test**: with no live provider, schema and pipeline tests prove a successful `main` CI is required,
references are digest-only, two environments cannot share state, registry credentials are ephemeral, migration precedes
switching and rollback is application-only. Live completion additionally requires one baseline and two sequential
updates on the isolated non-production VPS.
