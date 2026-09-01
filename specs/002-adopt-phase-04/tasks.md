---

description: "One-to-one Spec Kit adoption of the existing Phase 04 roadmap tasks"
---

# Tasks: Adopt Phase 04

**Input**: Design documents from `/specs/002-adopt-phase-04/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/phase-04-adoption.md`, and the authoritative
`plan/phases/04-CLINIC-DIRECTORY-AVAILABILITY.md`

**Tests**: Required and risk-based under the existing roadmap. Each claimed task adds or updates
only the focused coverage needed for its acceptance risk, then runs the owning package typecheck.

**Roadmap boundary**: Every checklist entry below maps one-to-one to one existing roadmap task.
`T001`–`T012` are Spec Kit ordering labels only; `F04-T01`–`F04-T12` remain the authoritative task
IDs. No roadmap task is split, renamed, or reordered; completion state is synchronized only after
the repository review gate passes.

**Activation boundary**: Phase 04 is `IN_PROGRESS`; `F04-T01` through `F04-T06` are complete,
no batch is active, and `F04-T07` is next eligible but unclaimed.

## Format: `[Spec Kit ID] [Story?] [Authoritative roadmap ID] Description`

- **Spec Kit ID**: Sequential label required by the tasks format
- **Story**: User story from `spec.md`; foundational contract/persistence tasks have no story label
- **Roadmap ID**: Stable execution and commit identity from `plan/`
- **Parallel marker**: None is assigned because the authoritative Phase 04 source has no batch map
  or per-task `Depends on` declarations

## Phase 1: Existing Workspace

**Purpose**: Reuse the current monorepo, authentication, authorization, audit, persistence,
OpenAPI generation, frontend sessions, and test infrastructure.

No setup task is required. Adding scaffolding or dependencies during adoption would violate the
constitution and roadmap.

---

## Phase 2: Contract and Persistence Foundation

**Purpose**: Preserve the two opening roadmap tasks that establish the contract and persisted
integrity required by all later Phase 04 work.

- [x] T001 F04-T01: freeze the existing Phase 04 doctor/service fields, visit modes, duration and buffer in minutes, integer price and currency, clinic ownership, publication/activity semantics, timezone representation, validation errors, and administrator/patient capability shapes in `plan/contracts/clinic-directory-availability-v1.md`; review against `plan/phases/04-CLINIC-DIRECTORY-AVAILABILITY.md`, `plan/02-TARGET-ARCHITECTURE.md`, and `plan/04-ENGINEERING-STANDARDS.md` without changing implementation code
- [x] T002 F04-T02: implement the versioned directory, doctor-service, availability-rule, clinic-closure, and doctor-exception persistence defined by the accepted F04-T01 contract in `apps/api/prisma/schema.prisma` and one new file under `apps/api/prisma/migrations/`; add focused constraint and empty-database migration coverage under `apps/api/test/`

**Checkpoint**: The contract is accepted and the Phase 04 persistence model applies cleanly from
an empty database before administrator or patient behavior begins.

---

## Phase 3: Preserved Delivery Sequence — User Stories 1 and 2 (Priority: P1) 🎯 MVP

**User Story 1 goal**: Deliver the existing administrator directory, offering, schedule,
permission/audit, and settings tasks without direct database manipulation.

**User Story 1 independent test**: An authorized administrator manages a doctor without
credentials, specialty, service, offering, price, working hours, closure, leave, and exception;
invalid overlap is rejected, changes persist, and the dashboard exposes real actions and truthful
states.

**User Story 2 goal**: Deliver the existing public query and patient integration tasks while
preserving the Phase 03 booking eligibility gate.

**User Story 2 independent test**: An eligible patient sees only active/published doctor-service
choices and derived times; an administrator schedule or publication change affects the next
patient query.

The tasks remain interleaved below because the authoritative roadmap places the public query task
before the permission/audit and frontend tasks. Grouping them by story would reorder the roadmap.

- [x] T003 [US1] F04-T03: implement clinic-scoped administrator clinic, doctor, specialty, and service CRUD in `apps/api/src/modules/directory/`, register only the required module wiring in `apps/api/src/app.module.ts`, and add focused validation/authorization/integration coverage under `apps/api/test/`
- [x] T004 [US1] F04-T04: implement administrator doctor-service assignment with the frozen mode, duration, buffer, integer price, currency, activity, and publication contract in `apps/api/src/modules/directory/`; add focused persistence and validation coverage under `apps/api/test/`
- [x] T005 [US1] F04-T05: implement administrator recurring working-hours, clinic-closure, doctor-leave, and doctor-exception management in `apps/api/src/modules/scheduling/`, wire the module in `apps/api/src/app.module.ts`, and add focused interval/overlap/timezone coverage under `apps/api/test/`
- [x] T006 [US2] F04-T06: implement patient-visible clinic-scoped doctor, service, offering, and on-demand availability queries in `apps/api/src/modules/directory/` and `apps/api/src/modules/scheduling/`; derive transient candidates from current rules, closures, leave, exceptions, duration, buffer, timezone, activity, and publication state, with focused API/integration coverage under `apps/api/test/`
- [ ] T007 [US1] F04-T07: enforce the established permission boundary and audit schedule, price, and publication changes through `apps/api/src/common/auth/`, Phase 04 audit adapters under `apps/api/src/modules/directory/` and `apps/api/src/modules/scheduling/`, and focused authorization/audit tests under `apps/api/test/`
- [ ] T008 [US1] F04-T08: replace the actionless Phase 04 settings cards with real generated-client forms and truthful loading, empty, forbidden, validation, unavailable, and error states in `apps/dashboard/src/features/settings/settings-page.tsx`; add schedule-readiness and next-day projections to `apps/dashboard/src/features/dashboard/dashboard-page.tsx` only where supported by real data, with focused helpers/specs under `apps/dashboard/src/lib/`
- [ ] T009 [US2] F04-T09: replace Phase 04 mock doctor and schedule consumption with generated-client doctor detail, doctor/service selection, and derived availability in `apps/app/src/app/(app)/doctors/[id]/page.tsx`, `apps/app/src/app/(app)/appointments/book/page.tsx`, and `apps/app/src/app/(app)/appointments/book/schedule/page.tsx`; preserve the existing eligibility decision and add focused helpers/specs under `apps/app/src/lib/`

**Checkpoint**: Every Phase 04 administrator settings card performs a real action; schedule
readiness contains no fabricated values; patient-visible directory and availability match current
administrator-managed records without creating an appointment.

---

## Phase 4: User Story 3 — Verify Scheduling Readiness Truthfully (Priority: P2)

**Goal**: Complete the existing generated-contract, seed, mock-removal, risk-verification, and
evidence tasks before Phase 05 is considered ready.

**Independent Test**: Generated contracts are current, deterministic local data supports both
roles, no reachable Phase 04 mock remains, required risk checks and browser journeys pass, and
every phase exit criterion has evidence.

- [ ] T010 [US3] F04-T10: export the implemented Phase 04 OpenAPI contract to `packages/api-client/openapi.json`, regenerate `packages/api-client/src/schema.generated.ts`, add deterministic non-secret directory/schedule data to `apps/api/prisma/seed.mjs`, and remove only Phase 04 doctor/service/availability mock exports and callers from `apps/app/src/lib/data/catalog.ts` and the touched dashboard/app Phase 04 surfaces
- [ ] T011 [US3] F04-T11: complete focused overlap, invalid-exception, clinic-timezone, active/publication filtering, authorization/audit, and representative query-plan verification under `apps/api/test/`; run the administrator-to-patient browser journeys in `specs/002-adopt-phase-04/quickstart.md` and record the exact outcomes without expanding into Phase 05
- [ ] T012 [US3] F04-T12: record accepted task and phase evidence in `plan/logs/phase-04.md` following `plan/logs/README.md`, capture phase-gate details in `specs/002-adopt-phase-04/evidence.md`, synchronize `plan/phases/04-CLINIC-DIRECTORY-AVAILABILITY.md` and `plan/STATUS.md` only after the repository review gate passes, and declare Phase 05 readiness only when all four original Phase 04 exit criteria are evidenced

**Checkpoint**: Phase 04 is evidence-complete and the appointment phase has a truthful directory
and availability prerequisite.

---

## Dependencies & Execution Order

### Preserved Phase Dependencies

- Phase 02 is complete and remains the recorded phase prerequisite.
- The completed Phase 03 booking eligibility contract is reused and remains authoritative at
  booking entry.
- Phase 05 remains out of scope and cannot be ready until Phase 04 reaches its existing exit gate.

### Preserved Task Ordering

```text
F04-T01, F04-T02, F04-T03, F04-T04, F04-T05, F04-T06,
F04-T07, F04-T08, F04-T09, F04-T10, F04-T11, F04-T12
```

This is the exact order in the authoritative phase file. That file does not define task-level
`Depends on` fields or a batch map, so this adoption does not manufacture a hard dependency graph
or parallel batch. Before any future execution, the coordinator must validate prerequisites,
freeze contracts, assign non-overlapping write sets, and claim a batch in `plan/STATUS.md` under
`plan/05-AGENT-WORKFLOW.md`. The current status identifies only `F04-T07` as next eligible.

### Practical Readiness Gates Already Implied by the Roadmap

- `F04-T01` contract acceptance precedes dependent schema or interface implementation.
- `F04-T02` persistence exists before CRUD and availability behavior can be accepted.
- `F04-T08` and `F04-T09` consume implemented interfaces rather than inventing frontend rules.
- `F04-T10` synchronizes generated contracts and removes mocks after the owning interfaces exist.
- `F04-T11` verifies the integrated phase before `F04-T12` records readiness.

These gates explain the source order; they do not authorize starting any task.

## Parallel Opportunities

None are declared by this adoption. The authoritative source has no Phase 04 batch map, and shared
Prisma, module wiring, OpenAPI, permission, seed, and frontend surfaces require ownership review.
Any future parallel batch must be selected and claimed by the main agent under the existing
workflow, without changing roadmap IDs.

## Implementation Strategy

### First Executable Unit

When the user separately authorizes the next implementation batch, claim only the work permitted
by `plan/STATUS.md`. At the current state that begins with `F04-T07`.

### Incremental Delivery

1. Freeze and review the contract without implementation changes (`F04-T01`).
2. Add and verify persistence (`F04-T02`).
3. Follow the original task order through administrator, patient, contract, and phase-gate work.
4. Commit each roadmap task independently only after its review and evidence gate passes.
5. Stop at the end of each authorized batch; do not automatically claim the next one.

## Notes

- `plan/` remains the source of truth if any Spec Kit wording appears to conflict.
- `T001`–`T012` never replace the `F04-*` task IDs used for claims, evidence, commits, or status.
- Do not hand-edit the generated client, add speculative dependencies, persist slots as truth, or
  pull appointment creation from Phase 05 into this phase.
- Do not modify `apps/app/src/components/home/slider-data.ts` or `justforcheck.md`.
