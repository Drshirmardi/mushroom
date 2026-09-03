# Implementation Plan: Adopt Phase 06

**Branch**: `codex/phase-06-encounter-clinical-workspace` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

## Summary

Prepare one-to-one Spec Kit artifacts for the existing twelve Phase 06 encounter and clinical
workspace tasks. `plan/` remains the execution source of truth; this adoption activates no task.

## Technical Context

**Language/Version**: Existing TypeScript monorepo.

**Primary Dependencies**: Existing patient app, dashboard, API, generated client, and tests; none added.

**Storage**: Existing PostgreSQL; Phase 06 persistence is owned solely by `F06-T03`.

**Testing**: Existing focused workflow; `F06-T11` retains explicit security, revision, and browser E2E gates.

**Target Platform**: Existing patient app, administrator dashboard, and API.

**Project Type**: Existing monorepo.

**Performance Goals**: No adoption-added target.

**Constraints**: Preserve Phase 05 appointment authority; keep appointment and encounter separate;
do not promote self-reported intake automatically; enforce resource-level authorization and audit;
protect clinical content and PII; retain single-writer ownership for migration, OpenAPI/client,
authentication, and shared paths.

**Scale/Scope**: Twelve stable tasks, `F06-T01`–`F06-T12`; Phase 06 is `IN_PROGRESS`, `F06-T01`
through `F06-T09` are complete, and `F06-T10` is the next unclaimed roadmap task.

## Constitution Check

*GATE: Passed before research and after design.*

- F06-T02 is documentation-only: no source, migration, client, or Phase 05 change.
- Existing architecture and boundaries remain unchanged; no dependency or service is introduced.
- IDs, source order, prerequisite, models, UI scope, and exit rules are copied without redesign.
- `F06-T01` freezes the approved legal/clinical-data product policy in
  `plan/contracts/clinical-record-policy-v1.md`; jurisdiction-dependent confirmation remains
  explicitly open.
- `F06-T02` freezes the self-reported-to-reviewed-clinical-record contract gate;
  `F06-T03` owns persistence; `F06-T11` owns contract/client synchronization and cross-cutting
  verification.
- Roadmap-owned verification remains roadmap-owned; every task stays unchecked until its own
  review/evidence gate passes.

Post-design re-check: passed. No exception or architecture change is introduced.

## Project Structure

```text
specs/004-adopt-phase-06/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/phase-06-adoption.md
├── checklists/requirements.md
└── tasks.md

plan/phases/06-ENCOUNTER-CLINICAL-WORKSPACE.md
apps/api/{prisma,src/modules/**,test}/
apps/dashboard/src/app/(app)/
apps/app/src/app/(app)/{appointments,profile}/
packages/api-client/
```

The source paths are future roadmap destinations, not files created or changed by adoption.

## Preserved Roadmap Sequence

1. `F06-T01` policy حقوقی retention، patient visibility، sign و amendment.
2. `F06-T02` قرارداد تبدیل intake self-reported به clinical record reviewed.
3. `F06-T03` migration encounter/clinical core/audit.
4. `F06-T04` start/complete encounter از appointment معتبر.
5. `F06-T05` note revision با optimistic concurrency و private clinician note.
6. `F06-T06` diagnosis/allergy/condition/medication reconciliation.
7. `F06-T07` timeline، history و summary مجاز بیمار.
8. `F06-T08` resource-level authorization و audit read/write/export.
9. `F06-T09` اتصال workspace dashboard و حذف placeholderهای scope.
10. `F06-T10` اتصال summary/history/health-record در app.
11. `F06-T11` OpenAPI/client، security، revision و browser E2E.
12. `F06-T12` evidence.

The roadmap provides no individual `Depends on` fields or batch map. This plan preserves the
listed order and does not manufacture hard dependencies or parallel assignments.

## Dependency and Boundary Risks

- `F06-T01` is the implied legal-policy contract gate; later tasks must not pre-freeze retention,
  patient-visibility, signing, or amendment details.
- `F06-T02` is the implied clinical-classification gate; `F06-T06` must not transform
  self-reported intake into clinical facts outside its reviewed-record contract.
- `F06-T03` is the shared persistence and audit gate; it must serialize Prisma/schema/migration
  ownership and precede persistence-dependent clinical behavior.
- `F06-T04` consumes the completed Phase 05 appointment authority; it must not recreate or
  mutate Phase 05 lifecycle ownership.
- `F06-T05`, `F06-T07`, and `F06-T08` share visibility, revision, and audit boundaries;
  authorization/audit contract ownership must be coordinated before their respective work.
- `F06-T09` and `F06-T10` depend on truthful data and must not remove scope placeholders before
  the corresponding API contract is ready; their UI paths are distinct but share generated client
  coordination with `F06-T11`.
- `F06-T11` is the integration gate for generated client, security, revision, and browser E2E;
  `F06-T12` must follow completed verification and evidence review.

These are source-derived execution risks, not new dependencies or authorization to start work.
