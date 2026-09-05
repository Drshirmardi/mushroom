---

description: "One-to-one Spec Kit adoption of the authoritative Phase 08 roadmap tasks"
---

# Tasks: Adopt Phase 08 — Follow-up, Health Tracking, Notifications & Content

**Input**: `/specs/006-adopt-phase-08/` and authoritative `plan/phases/08-FOLLOWUP-CONTENT.md`.

**Roadmap boundary**: `T001`–`T011` are Spec Kit labels only. The authoritative roadmap IDs below remain the execution, claim, evidence, and commit identities. No task is split, merged, renamed, reordered, claimed, or completed by this adoption.

**Execution status**: Phase 08 is `READY_FOR_REVIEW`; `F08-T01` through `F08-T11` are complete. Consult `plan/STATUS.md` and the authoritative phase checklist for live state. This file does not authorize implementation.

## Format

`[Spec Kit ID] [Story?] [Authoritative roadmap ID] Description`. No `[P]` marker is assigned: the authoritative source has no batch map or per-task `Depends on` fields.

## Phase 1: Existing Workspace

Reuse the completed Phase 05 appointment baseline, completed Phase 07 treatment-scheduling baseline, and existing API/frontend/client/test infrastructure. No extra setup task is added.

## Phase 2: Health Follow-up Foundation

- [x] T001 F08-T01: metric/unit/range و query contract health observations
- [x] T002 F08-T02: write/query tracker و dashboard health views
- [x] T003 F08-T03: mezaj result از assessment versioned

## Phase 3: Notification and Content Boundaries — User Story 2 (P2) / User Story 3 (P3)

- [x] T004 [US2] F08-T04: notification/preference و in-app read state
- [x] T005 [US3] F08-T05: content publication lifecycle و media policy

## Phase 4: Real Reminder Boundary

- [x] T006 F08-T06: ADR و bootstrap outbox/worker فقط برای reminder واقعی
- [x] T007 [US2] F08-T07: appointment و treatment reminders idempotent

## Phase 5: Connected Interfaces — User Story 1 (P1) / User Story 4 (P4)

- [x] T008 [US1] F08-T08: اتصال app tracker/notification/article
- [x] T009 [US1] F08-T09: اتصال dashboard health/notification/content
- [x] T010 [US4] F08-T10: restart/retry/idempotency، timezone و browser E2E
- [x] T011 [US4] F08-T11: حذف mock scope و review Milestone C

## Dependencies & Execution Order

Phase 05 is `DONE (CLOSED)` and the roadmap names Phase 07 treatment scheduling as the predecessor for a treatment reminder. The exact source order is:

```text
F08-T01, F08-T02, F08-T03, F08-T04, F08-T05, F08-T06,
F08-T07, F08-T08, F08-T09, F08-T10, F08-T11
```

The source defines no individual `Depends on` fields or batch map. Before execution, the coordinator must validate prerequisites, freeze contracts, define non-overlapping owned paths, and claim a batch under `plan/05-AGENT-WORKFLOW.md`.

### Source-Implied Gates (not new dependencies)

- `F08-T01` owns health-observation contract definition before tracker behavior relies on it.
- `F08-T03` remains limited to the existing versioned-assessment result boundary.
- `F08-T06` is limited to a real reminder/job need; `F08-T07` owns appointment/treatment reminder behavior and must respect existing schedule ownership.
- `F08-T08`–`F08-T09` must wait for their accepted real sources before removing truthful placeholders or mock scope.
- `F08-T10` is the integrated resilience/browser gate; `F08-T11` follows it for mock-scope removal and Milestone C review.

## Parallel Opportunities

None declared. Any future parallelism is a coordinator decision after ownership, shared-path, contract, and verification review.

## Notes

- `plan/` wins on any conflict.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md`.
