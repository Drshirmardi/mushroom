# Implementation Plan: Adopt Phase 05

**Branch**: `codex/phase-05-appointment-booking-dashboard-operations` | **Date**: 2026-09-02 | **Spec**: [spec.md](spec.md)

## Summary

Prepare one-to-one Spec Kit artifacts for the existing fourteen Phase 05 booking/operations
tasks. `plan/` remains the execution source of truth; the adoption itself activated no task.

## Technical Context

**Language/Version**: Existing TypeScript monorepo.

**Primary Dependencies**: Existing patient app, dashboard, API, generated client, and tests; none added.

**Storage**: Existing PostgreSQL; Phase 05 persistence is owned solely by `F05-T02`.

**Testing**: Existing focused workflow; `F05-T12` and `F05-T13` retain explicit risk gates.

**Target Platform**: Existing patient app, administrator dashboard, and API.

**Project Type**: Existing monorepo.

**Performance Goals**: No adoption-added target; source requires one success of 100 concurrent requests and assigns query/load baseline to `F05-T13`.

**Constraints**: Preserve Phase 03 eligibility, Phase 04 availability, no mandatory MVP payment, shared-path single-writer ownership, truthful widgets, and task boundaries.
**Scale/Scope**: Fourteen stable tasks, `F05-T01`–`F05-T14`; Phase 05 is
`DONE (CLOSED)` after recorded execution and independent closure review.

## Constitution Check

*GATE: Passed before research and after design.*

- Documentation only: no source, migration, client, Phase 04, roadmap-status, claim, or checkbox change.
- Existing architecture and boundaries remain unchanged; no dependency/service is introduced.
- IDs, source order, prerequisite, models, UI scope, Home V1, and exit rules are copied without redesign.
- `F05-T01` remains the lifecycle/policy/price-snapshot contract gate; exact states, policies, fields, and routes are not pre-decided.
- Roadmap-owned verification remains roadmap-owned; each task stays unchecked until its own review/evidence gate passes.

Post-design re-check: passed. No exception or architecture change is introduced.

## Project Structure

```text
specs/003-adopt-phase-05/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/phase-05-adoption.md
├── checklists/requirements.md
└── tasks.md

plan/phases/05-APPOINTMENT-OPERATIONS.md
apps/api/{prisma,src/modules/scheduling,test}/
apps/app/src/app/(app)/appointments/
apps/dashboard/src/app/(app)/{appointments,calendar,queue}/
packages/api-client/
```

The source paths are future roadmap destinations, not files created or changed by adoption.

## Preserved Roadmap Sequence

1. `F05-T01` state machine, cancellation/reschedule policy, price snapshot.
2. `F05-T02` migration, index, active-doctor overlap exclusion constraint.
3. `F05-T03` create with authoritative eligibility/idempotency.
4. `F05-T04` patient list/detail/cancel/reschedule.
5. `F05-T05` administrator create/list/filter/confirm/cancel/reschedule.
6. `F05-T06` check-in/queue/call-next/start/complete/no-show.
7. `F05-T07` status history/reason/operational activity.
8. `F05-T08` app flow and MVP payment/wallet dependency removal.
9. `F05-T09` dashboard appointments/calendar/queue.
10. `F05-T10` Home V1 KPI/today plan/activity.
11. `F05-T11` OpenAPI/client/mock removal.
12. `F05-T12` concurrency/idempotency/authorization/state-machine tests.
13. `F05-T13` cross-app browser E2E/query-load baseline.
14. `F05-T14` evidence/Milestone B review.

The roadmap provides no individual `Depends on` fields or batch map. This plan preserves the
listed order and does not manufacture hard dependencies or parallel assignments.

## Dependency and Boundary Risks

- `F05-T01` is the implied contract gate; later work must not pre-freeze policy details.
- `F05-T02` is the integrity gate for `F05-T03`; application-only checks cannot accept the 100-request criterion.
- `F05-T03` consumes rather than recreates Phase 03 eligibility and Phase 04 availability.
- `F05-T06`/`F05-T07` share lifecycle/activity boundaries; `F05-T08`–`F05-T11` share client/mock surfaces. Future shared writers must serialize.
- `F05-T10` cannot expose later-phase financial/order/treatment/common-disease widgets.

These are source-derived execution risks, not new dependencies or authorization to start work.
