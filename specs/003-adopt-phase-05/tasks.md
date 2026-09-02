---
description: "One-to-one Spec Kit adoption of existing Phase 05 roadmap tasks"
---

# Tasks: Adopt Phase 05

**Input**: `/specs/003-adopt-phase-05/` and authoritative
`plan/phases/05-APPOINTMENT-OPERATIONS.md`.

**Roadmap boundary**: `T001`–`T014` are Spec Kit labels only. The authoritative roadmap IDs in
the checklist entries below remain the execution, claim, evidence, and commit identities. No task
is split, merged, renamed, reordered, claimed, or completed by this adoption.

**Execution status**: Consult `plan/STATUS.md` and the authoritative phase checklist for the live
Phase 05 state. This file does not authorize implementation.

## Format

`[Spec Kit ID] [Story?] [Authoritative roadmap ID] Description`. No `[P]` marker is assigned:
the authoritative source has no batch map or per-task `Depends on` fields.

## Phase 1: Existing Workspace

Reuse Phase 03 eligibility, Phase 04 directory/availability, existing API/frontend/client, and
test infrastructure. No extra setup task is added.

## Phase 2: Contract and Persistence Foundation

- [x] T001 F05-T01: state machine, cancellation/reschedule policy and price snapshot
- [x] T002 F05-T02: migration, index and exclusion constraint overlap active doctor

## Phase 3: Preserved Delivery Sequence — User Stories 1 and 2 (P1)

- [x] T003 [US1] F05-T03: create appointment with eligibility authoritative and idempotency
- [x] T004 [US1] F05-T04: patient list/detail/cancel/reschedule
- [x] T005 [US1] F05-T05: admin create-on-behalf/list/filter/confirm/cancel/reschedule
- [x] T006 [US2] F05-T06: check-in/queue/call-next/start/complete/no-show
- [x] T007 [US2] F05-T07: status history/reason/operational activity

## Phase 4: User Story 3 — Truthful Cross-App Operations (P2)

- [x] T008 [US3] F05-T08: all app appointment flow and removal of MVP payment/wallet dependency
- [x] T009 [US3] F05-T09: dashboard appointments/calendar/queue
- [ ] T010 [US3] F05-T10: Dashboard Home V1 with KPI/today plan/real activity
- [ ] T011 [US3] F05-T11: OpenAPI/client and appointment/operations mock removal
- [ ] T012 [US3] F05-T12: concurrency/idempotency/authorization/state-machine tests
- [ ] T013 [US3] F05-T13: cross-app browser E2E and query/load baseline
- [ ] T014 [US3] F05-T14: evidence and Milestone B review

## Dependencies & Execution Order

Phase 03 is `DONE`; its eligibility contract remains authoritative. Phase 04 is `DONE (CLOSED)`;
its directory and derived availability remain authoritative. The exact source order is:

```text
F05-T01, F05-T02, F05-T03, F05-T04, F05-T05, F05-T06, F05-T07,
F05-T08, F05-T09, F05-T10, F05-T11, F05-T12, F05-T13, F05-T14
```

The source defines no individual `Depends on` fields or batch map. Before future execution, the
coordinator must validate prerequisites, freeze contracts, define non-overlapping owned paths, and
claim a batch under `plan/05-AGENT-WORKFLOW.md`.

### Source-Implied Gates (not new dependencies)

- `F05-T01` precedes policy-dependent persistence/behavior.
- `F05-T02` precedes conflict-safe create acceptance in `F05-T03`.
- `F05-T03` precedes patient/admin appointment flows.
- `F05-T06`/`F05-T07` supply operations/history/activity used by dashboard work.
- `F05-T08`–`F05-T11` need coordinated shared contract/client/mock ownership.
- `F05-T12`/`F05-T13` verify before `F05-T14` evidence/review.

## Parallel Opportunities

None declared. Any future parallelism is a claimed-coordinator decision after ownership review.

## Notes

- `plan/` wins on any conflict.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md`.
