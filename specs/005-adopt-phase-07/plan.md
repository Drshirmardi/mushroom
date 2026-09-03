# Implementation Plan: Adopt Phase 07 — Prescription & Treatment

**Branch**: `codex/phase-07-prescription-treatment` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

## Summary

Prepare one-to-one Spec Kit artifacts for the existing twelve Phase 07 prescription and treatment tasks. `plan/` remains the execution source of truth; this adoption activates no task.

## Technical Context

**Language/Version**: Existing TypeScript monorepo.
**Primary Dependencies**: Existing patient app, dashboard, API, generated client, and tests; none added.
**Storage**: Existing PostgreSQL; Phase 07 persistence is owned solely by `F07-T02`.
**Testing**: Existing focused workflow; `F07-T11` retains explicit immutability, amendment, ownership, and browser-E2E gates.
**Target Platform**: Existing patient app, administrator dashboard, and API.
**Project Type**: Existing monorepo.
**Performance Goals**: No adoption-added target.
**Constraints**: Preserve issued-prescription immutability, revision-only amendment, idempotent treatment logging, real-event progress, persisted cross-device patient activity, authorization/audit/contraindication boundaries, and single-writer ownership for migration, generated client, authentication, and shared paths.
**Scale/Scope**: Twelve stable tasks, `F07-T01`–`F07-T12`; `F07-T01` and `F07-T02` are complete and Phase 07 is `IN_PROGRESS`. Phase 06 is `DONE (CLOSED)`. This adoption does not authorize later Phase 07 work without a claimed batch.

## Constitution Check

*GATE: Passed before research and after design.*

- Adoption is documentation-only: no source, migration, generated client, or Phase 06 file changes.
- IDs, source order, prerequisite, models, UI scope, and exit rules are copied without redesign.
- `F07-T01` freezes approved prescription lifecycle and safety rules: editable drafts; immutable issued revisions; append-only correction; `PRESCRIPTION_ISSUE` plus tenant/resource authorization; default `DOCTOR` issuer; acknowledged advisory warnings; and blocking only for an approved `NON_OVERRIDABLE` rule. `F07-T02` owns migration; `F07-T03`–`F07-T06` own their named delivery boundaries; `F07-T09` implements the permission/audit/contraindication-warning contract; `F07-T10` owns generated-client and in-scope mock/local-state removal; `F07-T11` owns integrated verification.
- The roadmap states no individual task dependency or batch map. No new hard dependency, parallel lane, claim, or completion state is declared here.
- Roadmap-owned verification remains roadmap-owned; every task stays unchecked until its own review/evidence gate passes.

Post-design re-check: passed. No exception or architecture change is introduced.

## Project Structure

```text
specs/005-adopt-phase-07/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/phase-07-adoption.md
├── checklists/requirements.md
└── tasks.md

plan/phases/07-PRESCRIPTION-TREATMENT.md
apps/api/{prisma,src/modules/**,test}/
apps/dashboard/src/app/(app)/
apps/app/src/app/(app)/treatment/
packages/api-client/
```

The source paths are future roadmap destinations, not files created or changed by adoption.

## Preserved Roadmap Sequence

1. `F07-T01` — lifecycle draft/issue/amend و قواعد ایمنی نسخه.
2. `F07-T02` — migration prescription/treatment/task/adherence.
3. `F07-T03` — prescription create/draft/issue/revision API.
4. `F07-T04` — treatment medication/session/exercise/nutrition plan API.
5. `F07-T05` — task schedule و ثبت مصرف/انجام با idempotency.
6. `F07-T06` — progress calculation و timeline واقعی.
7. `F07-T07` — اتصال prescription builder و patient workspace dashboard.
8. `F07-T08` — اتصال treatment/med/session/exercise/progress در app.
9. `F07-T09` — permission، audit، contraindication warning contract.
10. `F07-T10` — OpenAPI/client و حذف mock/local state scope.
11. `F07-T11` — immutability، amendment، ownership و browser E2E.
12. `F07-T12` — evidence.

The roadmap provides no individual `Depends on` fields or batch map. This plan preserves the listed order and does not manufacture hard dependencies or parallel assignments.

## Dependency and Boundary Risks

- `F07-T01` is the source-implied lifecycle/safety gate. Later tasks must not pre-freeze amendment or safety decisions outside its boundary.
- `F07-T02` is the shared persistence gate and must serialize Prisma/schema/migration ownership before persistence-dependent treatment work.
- `F07-T03`–`F07-T06` establish the authoritative prescription, treatment-plan, idempotent logging, and real-progress behavior. `F07-T07`–`F07-T08` must not remove truthful placeholders before these sources and their contracts are ready.
- `F07-T09` is the source-implied authorization, audit, and contraindication-warning boundary. It needs coordination with all sensitive prescription/treatment reads and writes without absorbing their task scope.
- `F07-T10` is the generated-client and in-scope mock/local-state gate; its shared output requires a single owner.
- `F07-T11` is the integrated immutability, amendment, ownership, and browser-E2E gate; `F07-T12` must follow completed verification and evidence review.

These are source-derived execution risks, not new dependencies or authorization to start work.
