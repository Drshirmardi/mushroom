---
description: "One-to-one Spec Kit adoption of existing Phase 06 roadmap tasks"
---

# Tasks: Adopt Phase 06

**Input**: `/specs/004-adopt-phase-06/` and authoritative
`plan/phases/06-ENCOUNTER-CLINICAL-WORKSPACE.md`.

**Roadmap boundary**: `T001`–`T012` are Spec Kit labels only. The authoritative roadmap IDs in
the checklist entries below remain the execution, claim, evidence, and commit identities. No task
is split, merged, renamed, reordered, claimed, or completed by this adoption.

**Execution status**: Consult `plan/STATUS.md` and the authoritative phase checklist for live
Phase 06 state. This file does not authorize implementation.

## Format

`[Spec Kit ID] [Story?] [Authoritative roadmap ID] Description`. No `[P]` marker is assigned:
the authoritative source has no batch map or per-task `Depends on` fields.

## Phase 1: Existing Workspace

Reuse the completed Phase 05 appointment authority, existing API/frontend/client, and test
infrastructure. No extra setup task is added.

## Phase 2: Policy, Clinical Conversion, and Persistence Foundation

- [x] T001 F06-T01: policy حقوقی retention، patient visibility، sign و amendment
- [ ] T002 F06-T02: قرارداد تبدیل intake self-reported به clinical record reviewed
- [ ] T003 F06-T03: migration encounter/clinical core/audit

## Phase 3: Preserved Delivery Sequence — User Stories 1 and 2 (P1)

- [ ] T004 [US1] F06-T04: start/complete encounter از appointment معتبر
- [ ] T005 [US1] F06-T05: note revision با optimistic concurrency و private clinician note
- [ ] T006 [US2] F06-T06: diagnosis/allergy/condition/medication reconciliation

## Phase 4: User Story 3 — Authorized Clinical Workspace (P2)

- [ ] T007 [US3] F06-T07: timeline، history و summary مجاز بیمار
- [ ] T008 [US3] F06-T08: resource-level authorization و audit read/write/export
- [ ] T009 [US3] F06-T09: اتصال workspace dashboard و حذف placeholderهای scope
- [ ] T010 [US3] F06-T10: اتصال summary/history/health-record در app
- [ ] T011 [US3] F06-T11: OpenAPI/client، security، revision و browser E2E
- [ ] T012 [US3] F06-T12: evidence

## Dependencies & Execution Order

Phase 05 is `DONE (CLOSED)` and remains the valid-appointment authority. The exact source order
is:

```text
F06-T01, F06-T02, F06-T03, F06-T04, F06-T05, F06-T06,
F06-T07, F06-T08, F06-T09, F06-T10, F06-T11, F06-T12
```

The source defines no individual `Depends on` fields or batch map. Before future execution, the
coordinator must validate prerequisites, freeze contracts, define non-overlapping owned paths, and
claim a batch under `plan/05-AGENT-WORKFLOW.md`.

### Source-Implied Gates (not new dependencies)

- `F06-T01` precedes policy-dependent clinical-record work.
- `F06-T02` preserves self-reported-to-reviewed-clinical-record separation before reconciliation.
- `F06-T03` precedes persistence-dependent encounter, note, audit, and clinical-record work.
- `F06-T04` consumes the valid Phase 05 appointment authority without recreating appointment scope.
- `F06-T05`, `F06-T07`, and `F06-T08` need coordinated privacy, revision, authorization, and
  audit ownership.
- `F06-T09`–`F06-T11` need coordinated truthful-data, generated-client, and in-scope mock/
  placeholder ownership.
- `F06-T11` verifies before `F06-T12` evidence.

## Parallel Opportunities

None declared. Any future parallelism is a claimed-coordinator decision after ownership review.

## Notes

- `plan/` wins on any conflict.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md`.
