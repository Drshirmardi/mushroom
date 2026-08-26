---

description: "Dependency-ordered work for adopting and completing Phase 03"
---

# Tasks: Adopt Phase 03

**Input**: Design documents from `/specs/001-adopt-phase-03/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/phase-03-adoption.md`

**Tests**: Required and risk-based. Add only focused regression or contract coverage for the
active task, then run the owning package typecheck.

**Roadmap boundary**: `F03-T01` through `F03-T08` are complete and MUST NOT be reimplemented.
Every task below retains one of the remaining stable IDs `F03-T09` through `F03-T13`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Safe to execute in parallel because owned paths do not overlap
- **[Story]**: User story from `spec.md`
- Each task names its original roadmap ID and exact owned paths

## Phase 1: Setup (Existing Workspace)

**Purpose**: Reuse the current monorepo, dependencies, authentication, persistence, and generated
client.

No setup task is required. Adding scaffolding or dependencies would violate the plan.

---

## Phase 2: Foundational Contract Correction

**Purpose**: Restore usable generated request types in two sequential, single-ID slices before the
P1 integrations write assessment or policy data.

**Single-writer rule**: This phase owns the API DTO metadata and generated contract files.

- [ ] T001 F03-T09: add missing administrator request-property metadata in `apps/api/src/modules/assessments/admin/admin-assessments.dto.ts` and `apps/api/src/modules/assessments/admin/admin-booking-policy.dto.ts`; regenerate `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts`; prove the generated create, update, and policy bodies accept their existing DTO shapes and pass the targeted API and API-client typechecks without handwritten duplicate types
- [ ] T002 F03-T10: after T001 releases generated-contract ownership, add missing patient save-answer request metadata in `apps/api/src/modules/assessments/patient/patient-assessments.dto.ts`; regenerate `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts`; prove the generated save body accepts `{ answers: Record<string, unknown> }` and pass the targeted API and API-client typechecks

**Checkpoint**: Generated create, update, policy, and save-answer bodies are typed and the shared
contract has one owner.

---

## Phase 3: User Story 1 — Administer Assessments and Review Results (Priority: P1) 🎯 MVP

**Goal**: Complete `F03-T09` by connecting the dashboard assessment list, builder, lifecycle
actions, and result views to the existing generated contract.

**Independent Test**: An administrator can create or resume a draft, publish it, open the list and
results, filter submissions, and see the same immutable result in the patient workspace; loading,
empty, forbidden, unavailable, and failed states remain distinct.

### Tests for User Story 1

- [ ] T003 [P] [US1] F03-T09: add focused generated-client request and failure-state coverage in `apps/dashboard/src/lib/assessment-api.spec.ts`

### Implementation for User Story 1

- [ ] T004 [US1] F03-T09: implement the smallest typed assessment list, draft, update, duplicate, publish, archive, policy, and submission helpers in `apps/dashboard/src/lib/assessment-api.ts`, reusing `@sabz-zendegi/api-client`, the session bearer token, and existing request timeout
- [ ] T005 [US1] F03-T09: replace `PATIENTS` and remaining static builder/list/result behavior with the typed helpers and truthful UI states in `apps/dashboard/src/features/assessments/assessments-page.tsx`; preserve the existing patient-workspace result integration in `apps/dashboard/src/features/patients/workspace/patient-workspace.tsx`
- [ ] T006 [US1] F03-T09: run the focused dashboard assessment specs for `apps/dashboard/src/lib/assessment-api.spec.ts` and typecheck with `apps/dashboard/tsconfig.json`; correct only acceptance failures in F03-T09-owned paths

**Checkpoint**: User Story 1 works independently without mock assessment records or duplicated
public API types.

---

## Phase 4: User Story 2 — Complete Assessment Before Booking (Priority: P1)

**Goal**: Complete `F03-T10` by connecting the patient assessment lifecycle and booking entry gate
to the existing patient endpoints.

**Independent Test**: A patient starts, saves, leaves, resumes, submits once, views the immutable
result, and follows the stable booking blocker and next action; disabling the prerequisite allows
a patient with complete onboarding to proceed immediately.

### Tests for User Story 2

- [ ] T007 [P] [US2] F03-T10: add focused list/start/save/resume/submit/result and eligibility mapping coverage in `apps/app/src/lib/assessment-api.spec.ts` and `apps/app/src/lib/booking-eligibility.spec.ts`

### Implementation for User Story 2

- [ ] T008 [US2] F03-T10: implement typed patient assessment lifecycle helpers in `apps/app/src/lib/assessment-api.ts` and stable blocker-to-navigation mapping in `apps/app/src/lib/booking-eligibility.ts`, reusing the generated client and session token
- [ ] T009 [US2] F03-T10: replace `ASSESSMENT_TYPES`, `WIZARD_CONFIGS`, static answers, fixed scores, and `FINDINGS` with published structure, persisted attempt state, and stored result snapshots in `apps/app/src/app/(app)/assessment/page.tsx`, `apps/app/src/app/(app)/assessment/[type]/page.tsx`, and `apps/app/src/app/(app)/assessment/result/page.tsx`
- [ ] T010 [US2] F03-T10: enforce the server eligibility response at booking entry and render the contract-defined next action in `apps/app/src/app/(app)/appointments/book/page.tsx`; do not recalculate eligibility or use score in the UI
- [ ] T011 [US2] F03-T10: run focused specs for `apps/app/src/lib/assessment-api.spec.ts` and `apps/app/src/lib/booking-eligibility.spec.ts` and typecheck with `apps/app/tsconfig.json`; correct only acceptance failures in F03-T10-owned paths

**Checkpoint**: User Story 2 works independently for both required and optional policy states.

---

## Phase 5: User Story 3 — Observe and Close Phase 03 Truthfully (Priority: P2)

**Goal**: Complete `F03-T11`, `F03-T12`, and `F03-T13` with real dashboard assessment activity,
risk-based phase verification, mock removal, and Milestone A evidence.

**Independent Test**: Real completion and pending values appear when backed by submissions,
unsupported values remain hidden, both booking-policy browser journeys pass, and no reachable Phase
03 assessment route displays mock records.

### Tests for User Story 3

- [ ] T012 [P] [US3] F03-T11: add focused completed, pending, recent-activity, empty, forbidden, and unavailable projection coverage in `apps/dashboard/src/lib/dashboard-assessment-summary.spec.ts`

### Implementation and Phase Gate for User Story 3

- [ ] T013 [US3] F03-T11: derive supported assessment counts and recent activity from existing submission responses in `apps/dashboard/src/lib/dashboard-assessment-summary.ts` and render only sourced values in `apps/dashboard/src/features/dashboard/dashboard-page.tsx`; remove assessment mock consumption without changing unrelated activity users in `apps/dashboard/src/data/activity.ts`
- [ ] T014 [US3] F03-T12: audit existing coverage and add only missing version immutability, completion idempotency, patient/admin authorization, clinic scope, incomplete-profile-first ordering, disabled requirement, valid completion, expired completion, latest-version policy, and score-independence cases in `apps/api/test/admin-assessments.authorization.spec.ts`, `apps/api/test/admin-assessment-submissions.authorization.spec.ts`, `apps/api/test/patient-assessments.authorization.spec.ts`, `apps/api/test/patient-booking-eligibility.spec.ts`, and `apps/api/test/assessment-booking-contract.spec.ts`
- [ ] T015 [US3] F03-T12: use the existing Codex in-app Browser to execute the deterministic required and optional booking journeys from `specs/001-adopt-phase-03/quickstart.md` and record exact outcomes, blocker reasons, immutable result agreement, screenshots, and commands in `specs/001-adopt-phase-03/evidence.md`
- [ ] T016 [US3] F03-T13: remove only remaining reachable assessment mocks from `apps/dashboard/src/features/assessments/assessments-page.tsx`, `apps/dashboard/src/features/dashboard/dashboard-page.tsx`, `apps/app/src/app/(app)/assessment/page.tsx`, `apps/app/src/app/(app)/assessment/[type]/page.tsx`, and `apps/app/src/app/(app)/assessment/result/page.tsx`; delete assessment-only exports from `apps/app/src/lib/data/assessments.ts` or `apps/dashboard/src/data/activity.ts` only when no callers remain
- [ ] T017 [US3] F03-T13: run the focused Phase 03 backend, dashboard, app, and generated-client checks listed in `specs/001-adopt-phase-03/quickstart.md`, append results and unresolved gaps to `specs/001-adopt-phase-03/evidence.md`, and close the phase only when every roadmap exit criterion has evidence

**Checkpoint**: All three user stories and the Phase 03 exit criteria are independently evidenced.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No work; current workspace is reused.
- **Phase 2 / T001–T002**: Starts immediately; tasks run sequentially so generated contracts
  always have one writer, and each slice retains one roadmap ID.
- **User Story 1**: Depends on T002. Within the story: T003 -> T004 -> T005 -> T006.
- **User Story 2**: Depends on T002. Within the story: T007 -> T008 -> T009 -> T010 -> T011.
- **User Story 3 activity slice**: T012 -> T013 may run after T002 and in parallel with US1/US2.
- **User Story 3 phase gate**: T014 -> T015 -> T016 -> T017 starts after T006, T011, and T013.

### User Story Dependency Graph

```text
T001 -> T002
        ├── US1: T003 -> T004 -> T005 -> T006 ─┐
        ├── US2: T007 -> T008 -> T009 -> T010 -> T011 ─┼-> US3 gate: T014 -> T015 -> T016 -> T017
        └── US3 activity: T012 -> T013 ─────────┘
```

### Parallel Opportunities

- T003, T007, and T012 touch separate packages or files and can begin together after T002.
- US1 and US2 can proceed in parallel because dashboard and patient-app paths do not overlap.
- T012/T013 can proceed alongside US1 and US2; shared generated-contract files are released after
  T002.
- T014–T017 are intentionally serial because they verify and close the integrated phase.

## Parallel Examples

### User Story 1 and User Story 2

```text
Task: "T003 [US1] Add dashboard assessment API regression coverage"
Task: "T007 [US2] Add patient assessment and eligibility regression coverage"
```

### User Story 3 activity slice

```text
Task: "T012 [US3] Add dashboard assessment summary coverage"
```

This task may run alongside T003 and T007 after T002 completes.

---

## Implementation Strategy

### MVP First

1. Complete T001–T002 serially.
2. Complete T003–T006 for User Story 1.
3. Stop and independently verify administrator lifecycle and result views.

### Incremental Delivery

1. Add User Story 2 through T007–T011 and verify required/optional booking behavior.
2. Add the User Story 3 activity slice through T012–T013.
3. Run the serial phase gate T014–T017 and close Phase 03 only with complete evidence.

### Parallel Team Strategy

After T002, one worker may own US1, one may own US2, and one may own T012–T013. Workers MUST not
edit `.codex/NEXT.md`, roadmap states, or another worker's owned paths. The phase-gate work remains
single-writer and serial.

## Notes

- Keep all `F03-*` IDs stable; `T001`–`T017` are internal execution slices only.
- Tests precede implementation in each story and remain targeted to the affected risk.
- Do not hand-edit generated client files, add dependencies, create new persistence models, or add
  endpoints unless a demonstrated contract gap makes the active task impossible.
- Do not run the full repository suite without a discovered cross-module risk.
