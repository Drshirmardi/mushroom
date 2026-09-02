# Implementation Plan: Adopt Phase 04

**Branch**: `main` | **Date**: 2026-09-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-adopt-phase-04/spec.md`

## Summary

Adopt the existing Phase 04 directory and availability roadmap into Spec Kit without activating
it. Delivery, when separately claimed under `plan/`, will follow the twelve existing tasks in
their original order: freeze the contract, add versioned persistence, expose administrator and
patient capabilities through the existing modular-monolith and generated-client architecture,
replace only Phase 04 mocks, and close with risk-based verification and evidence. This planning
run originally changed documentation only and left `F04-T01` unclaimed. The subsequent Phase 04
delivery is closed; its acceptance evidence is recorded in `plan/logs/phase-04.md` and
`specs/002-adopt-phase-04/evidence.md`.

## Technical Context

**Language/Version**: TypeScript 5.6–7.0; Node.js 24 in CI

**Primary Dependencies**: Next.js 16, React 19, NestJS 11, Fastify 5, Prisma 7,
`@sabz-zendegi/api-client`, Vitest 4

**Storage**: PostgreSQL 16 through the existing Prisma schema; a versioned Phase 04 migration is
owned by `F04-T02`

**Testing**: Focused Vitest and API integration coverage, package typechecks, migration smoke
verification, overlap/timezone/query-plan checks, and the Phase 04 browser journey required by
`F04-T11`

**Target Platform**: Existing web clients and Linux-hosted API; current local and CI environments

**Project Type**: Existing TypeScript monorepo with patient app, administrator dashboard, API,
and generated API client

**Performance Goals**: No numeric latency target is introduced by adoption; `F04-T11` must record
query-plan evidence for the actual directory and availability queries before phase closure

**Constraints**: Preserve one-clinic MVP behavior with explicit `clinicId`; allow doctor profiles
without login accounts; store integer price with currency and minute-based duration/buffer; derive
slots on demand; immediately apply closures, leave, and exceptions; reject invalid overlaps; keep
Phase 03 eligibility authoritative; do not implement Phase 05 appointments

**Scale/Scope**: One active clinic in MVP, administrator-managed directory and schedule, patient
doctor/service discovery, twelve stable roadmap tasks (`F04-T01`–`F04-T12`)

## Constitution Check

*GATE: Passed before research and after design.*

- **Scope discipline**: Artifacts cover only Phase 04. No application source, roadmap checkbox,
  status, batch claim, or future-phase behavior is changed.
- **Existing architecture**: The plan keeps the existing modular monolith, module boundaries,
  Prisma migrations, OpenAPI generation, generated frontend client, session gates, and audit
  mechanisms. It adds no dependency or speculative service.
- **Roadmap authority**: `plan/` remains authoritative. The twelve task IDs, their order, phase
  prerequisite, domain rules, and exit criteria are copied without replacement or redesign.
- **Context efficiency**: Planning used the Phase 04 document, current constitution, directly
  relevant architecture documents, current schema/module boundaries, and the four Phase 04 UI
  surfaces only.
- **Risk-based verification**: Task-level checks remain targeted. Migration, query plan,
  authorization/audit, timezone, overlap, and browser checks occur only under their existing
  roadmap tasks.
- **Contract integrity**: `F04-T01` remains the contract-freeze task. These adoption artifacts do
  not invent endpoint paths or settle its field-level decisions prematurely.
- **Definition of done**: Every task stays unchecked until implementation, acceptance evidence,
  review, and the existing per-task commit gate pass.

Post-design re-check: passed. No constitutional exception or architecture change is introduced.

## Project Structure

### Documentation (this feature)

```text
specs/002-adopt-phase-04/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── phase-04-adoption.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
plan/
├── STATUS.md
├── contracts/
├── logs/
└── phases/04-CLINIC-DIRECTORY-AVAILABILITY.md

apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.mjs
├── src/
│   ├── app.module.ts
│   ├── common/auth/
│   └── modules/
│       ├── directory/       # Introduced only by claimed Phase 04 work
│       ├── scheduling/      # Introduced only by claimed Phase 04 work
│       ├── assessments/
│       ├── identity/
│       └── patients/
└── test/

apps/dashboard/src/
├── app/(app)/settings/page.tsx
├── features/settings/settings-page.tsx
├── features/dashboard/dashboard-page.tsx
└── lib/

apps/app/src/
├── app/(app)/doctors/[id]/page.tsx
├── app/(app)/appointments/book/page.tsx
├── app/(app)/appointments/book/schedule/page.tsx
└── lib/data/catalog.ts

packages/api-client/
├── openapi.json
└── src/schema.generated.ts
```

**Structure Decision**: Retain the current monorepo. The target architecture assigns clinic,
doctor, specialty, service, and doctor-service ownership to `directory`, while recurring rules,
closures, doctor exceptions, and derived availability belong to `scheduling`. Frontends consume
the generated client; `F04-T10` is the single planned synchronization and mock-removal task. The
paths shown for missing modules are planned roadmap destinations, not files created by adoption.

## Preserved Roadmap Sequence

1. **`F04-T01`** freezes the doctor/service, visit-mode, duration, buffer, and price contract.
2. **`F04-T02`** adds the versioned directory, doctor-service, and availability migration.
3. **`F04-T03`** adds administrator clinic, doctor, specialty, and service management.
4. **`F04-T04`** adds administrator doctor-service assignment and commercial/time settings.
5. **`F04-T05`** adds administrator working hours, closures, leave, and exceptions.
6. **`F04-T06`** derives slots on demand and exposes patient-visible directory/availability.
7. **`F04-T07`** verifies and completes permission/audit coverage for sensitive changes.
8. **`F04-T08`** connects the real dashboard settings forms and schedule-readiness view.
9. **`F04-T09`** connects patient doctor detail and doctor/service selection.
10. **`F04-T10`** synchronizes OpenAPI/client, deterministic development seed, and mock removal.
11. **`F04-T11`** performs overlap, timezone, query-plan, and browser verification.
12. **`F04-T12`** records evidence and assesses readiness for appointment operations.

The source roadmap supplies no per-task `Depends on` declarations or Phase 04 batch map. This plan
therefore preserves the listed sequence without inventing parallel eligibility. All twelve Phase 04
tasks are complete; their final execution state is controlled by `plan/STATUS.md`.

No complexity exceptions are required.
