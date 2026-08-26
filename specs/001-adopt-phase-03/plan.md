# Implementation Plan: Adopt Phase 03

**Branch**: `codex/phase-03-assessment-eligibility` | **Date**: 2026-08-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-adopt-phase-03/spec.md`

## Summary

Complete the remaining Phase 03 frontend integrations and phase evidence by reusing the existing
assessment backend, persistence model, generated client, and authorization rules. The roadmap is
authoritative: `F03-T01` through `F03-T08` are preserved as completed and are not reimplemented;
implementation proceeds only through `F03-T09` to `F03-T13` under their stable IDs.

## Technical Context

**Language/Version**: TypeScript 5.6–7.0; Node.js 24 in CI

**Primary Dependencies**: Next.js 16, React 19, NestJS 11, Fastify 5, Prisma 7,
`@sabz-zendegi/api-client`, Vitest 4

**Storage**: PostgreSQL 16 through the existing Prisma schema; no new migration planned

**Testing**: Vitest focused specs and package typechecks; two browser journeys at the Phase 03
exit gate

**Target Platform**: Web clients and Linux-hosted API; current local and CI environments

**Project Type**: Existing TypeScript monorepo with patient app, admin dashboard, API, and
generated API client

**Client behavior constraints**: Show loading immediately, avoid duplicate requests, and retain
the existing 10-second client timeout; this timeout is not a performance acceptance target

**Constraints**: Preserve stable contracts, server-side authorization, clinic/patient ownership,
published snapshot immutability, submission idempotency, eligibility ordering, and truthful empty
or unavailable states; no future-phase work

**Scale/Scope**: One active clinic administrator for MVP, patient self-service, and five remaining
roadmap tasks (`F03-T09`–`F03-T13`)

## Constitution Check

*GATE: Passed before research and after design.*

- **Scope discipline**: Work is bounded to active Phase 03 IDs. Completed `F03-T01`–`F03-T08`
  remain untouched except for a documented regression correction already verified under T08.
- **Existing architecture**: Frontends consume the generated client and established session/data
  loader patterns. No new state library, service layer, model, endpoint, or dependency is planned.
- **Roadmap authority**: Stable task IDs, dependencies, phase boundary, and completed status are
  preserved. Phase 04 and later remain unexpanded.
- **Context efficiency**: Implementation reads only the active task's owned frontend, generated
  contract, and directly required backend contract paths.
- **Risk-based verification**: Each task runs focused specs and affected package typecheck. API
  and generated-client checks run only if those paths change; browser verification waits for the
  phase gate.
- **Contract integrity**: Authorization, idempotency, lifecycle, versioning, immutability, and
  eligibility remain server-enforced. UI behavior consumes rather than recreates those rules.
- **Definition of done**: A task closes only with its acceptance evidence; gaps are recorded
  without pulling future work forward.

Post-design re-check: passed. The design introduces no constitutional exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-adopt-phase-03/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── phase-03-adoption.md
└── tasks.md                 # Created later by $speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── prisma/schema.prisma
├── src/modules/assessments/
│   ├── admin/
│   ├── patient/
│   ├── domain/
│   └── application/
└── test/*assessment*.spec.ts

apps/dashboard/src/
├── features/assessments/
├── features/patients/workspace/
├── lib/
└── data/activity.ts

apps/app/src/
├── app/(app)/assessment/
├── app/(app)/appointments/book/
└── lib/

packages/api-client/
├── openapi.json
└── src/schema.generated.ts
```

**Structure Decision**: Keep the current monorepo boundaries. UI integration belongs in the
owning frontend; domain enforcement remains in the API; shared request and response types come
only from the generated client.

## Implementation Sequence

1. **`F03-T09` — Dashboard assessment integration**: repair administrator request DTO metadata
   under this task if needed, regenerate the client as the sole writer, then replace remaining
   assessment list, builder, lifecycle, and result mocks with generated-client calls and truthful
   UI states.
2. **`F03-T10` — Patient assessment and booking gate**: connect list/start/resume/save/submit/result
   and booking eligibility to the existing patient endpoints. After F03-T09 releases generated
   contract ownership, repair patient request DTO metadata if needed and regenerate serially. Map
   stable `reason` and `nextAction` values without duplicating server policy.
3. **`F03-T11` — Dashboard assessment activity**: derive supported completion/pending counts and
   recent activity from existing submission data. Hide unsupported widgets; do not add speculative
   aggregate endpoints.
4. **`F03-T12` — Phase risk verification**: run focused versioning, idempotency, authorization,
   clinic ownership, eligibility matrix, and generated-contract checks, then exercise required and
   optional booking browser journeys.
5. **`F03-T13` — Mock removal and evidence**: remove only assessment mocks still reachable in
   Phase 03 scope, record Milestone A evidence, and close the phase only when every exit criterion
   passes.

No complexity exceptions are required.
