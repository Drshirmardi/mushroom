---

description: "One-to-one Spec Kit adoption of existing Phase 07 roadmap tasks"
---

# Tasks: Adopt Phase 07 — Prescription & Treatment

**Input**: `/specs/005-adopt-phase-07/` and authoritative `plan/phases/07-PRESCRIPTION-TREATMENT.md`.

**Roadmap boundary**: `T001`–`T012` are Spec Kit labels only. The authoritative roadmap IDs in the checklist entries below remain the execution, claim, evidence, and commit identities. No task is split, merged, renamed, reordered, claimed, or completed by this adoption.

**Execution status**: `F07-T01` is complete after its approved policy baseline and review gate; `F07-T02`–`F07-T12` remain unclaimed and unchecked. Consult `plan/STATUS.md` and the authoritative phase checklist for the live state. This file does not authorize implementation.

## Format

`[Spec Kit ID] [Story?] [Authoritative roadmap ID] Description`. No `[P]` marker is assigned: the authoritative source has no batch map or per-task `Depends on` fields.

## Phase 1: Existing Workspace

Reuse the completed Phase 06 clinical-workspace baseline, existing API/frontend/client, and test infrastructure. No extra setup task is added.

## Phase 2: Prescription Lifecycle and Persistence Foundation

- [x] T001 F07-T01: lifecycle draft/issue/amend و قواعد ایمنی نسخه
- [ ] T002 F07-T02: migration prescription/treatment/task/adherence

## Phase 3: Preserved Delivery Sequence — User Story 1 (P1)

- [ ] T003 [US1] F07-T03: prescription create/draft/issue/revision API
- [ ] T004 [US1] F07-T04: treatment medication/session/exercise/nutrition plan API

## Phase 4: User Story 2 — Follow Treatment (P2)

- [ ] T005 [US2] F07-T05: task schedule و ثبت مصرف/انجام با idempotency
- [ ] T006 [US2] F07-T06: progress calculation و timeline واقعی

## Phase 5: User Story 3 — Dashboard/App Review Journey (P3)

- [ ] T007 [US3] F07-T07: اتصال prescription builder و patient workspace dashboard
- [ ] T008 [US3] F07-T08: اتصال treatment/med/session/exercise/progress در app
- [ ] T009 [US3] F07-T09: permission، audit، contraindication warning contract
- [ ] T010 [US3] F07-T10: OpenAPI/client و حذف mock/local state scope
- [ ] T011 [US3] F07-T11: immutability، amendment، ownership و browser E2E
- [ ] T012 [US3] F07-T12: evidence

## Dependencies & Execution Order

Phase 06 is `DONE (CLOSED)` and remains the clinical-workspace predecessor. The exact source order is:

```text
F07-T01, F07-T02, F07-T03, F07-T04, F07-T05, F07-T06,
F07-T07, F07-T08, F07-T09, F07-T10, F07-T11, F07-T12
```

The source defines no individual `Depends on` fields or batch map. Before future execution, the coordinator must validate prerequisites, freeze contracts, define non-overlapping owned paths, and claim a batch under `plan/05-AGENT-WORKFLOW.md`.

### Source-Implied Gates (not new dependencies)

- `F07-T01` precedes lifecycle- and safety-dependent prescription work.
- `F07-T02` precedes persistence-dependent prescription, treatment, task, adherence, and progress work.
- `F07-T03`–`F07-T06` must establish truthful prescription/treatment, idempotent recording, and real-event progress sources before connected UI removes scope placeholders.
- `F07-T07`–`F07-T10` need coordinated dashboard/app, authorization/audit/contraindication, and generated-client ownership.
- `F07-T11` verifies the integrated journey before `F07-T12` evidence.

## Parallel Opportunities

None declared. Any future parallelism is a claimed-coordinator decision after ownership review.

## Notes

- `plan/` wins on any conflict.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md`.
