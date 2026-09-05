# Implementation Plan: Adopt Phase 08 — Follow-up, Health Tracking, Notifications & Content

**Branch**: `codex/phase-08-follow-up-health-tracking-notifications-content` | **Date**: 2026-09-05 | **Spec**: [spec.md](spec.md)

## Summary

Preserve a one-to-one Spec Kit representation of the authoritative eleven-task Phase 08 roadmap. `plan/` remains the execution source of truth. This is documentation-only preparation and does not authorize a Phase 08 claim or implementation.

## Technical Context

**Language/Version**: Existing TypeScript monorepo.
**Primary Dependencies**: Existing patient app, dashboard, API, generated client, PostgreSQL integration tests, and browser validation; none added by this adoption.
**Storage**: Existing PostgreSQL. The roadmap names `HealthObservation`, `MezajResult`, `Notification`, `NotificationDelivery`, `NotificationPreference`, `Article`, `ArticleCategory`, `Banner`, and `OutboxEvent`; their fields and migrations remain task-owned.
**Testing**: Existing targeted domain/API/PostgreSQL checks plus the Phase 08 restart/retry/idempotency/timezone/browser gate owned by `F08-T10`.
**Target Platform**: Existing patient app, administrator dashboard, and API.
**Project Type**: Existing monorepo.
**Performance Goals**: No Phase 08 adoption-added target.
**Constraints**: Preserve the existing roadmap; never use mock data after its source task is complete; respect authorization, preferences, idempotency, UTC/timezone rules, durable side-effect boundaries, single-writer ownership, and published-only content visibility.
**Scale/Scope**: Eleven stable tasks, `F08-T01`–`F08-T11`. Phase 08 is `NOT_STARTED`; Phase 05 and Phase 07 are completed predecessors named by the roadmap.

## Constitution Check

*GATE: Passed before research and after design.*

- This is a Phase-level documentation adoption only. It neither claims a task nor writes implementation code, migrations, generated clients, or Phase 07 artifacts.
- The Phase 08 source scope, stable IDs, listed order, phase prerequisites, UI scope, model list, and exit criteria are copied without redesign. No individual `Depends on` field or batch map exists in the source, so none is invented.
- Existing architecture remains authoritative. Future execution must use the established app/dashboard/API boundaries and retain one coordinated owner for migrations, shared contracts, generated client, authentication, module wiring, and other shared paths.
- `F08-T06` expressly limits outbox/worker bootstrap to a real reminder/job need; this adoption does not add a queue, worker, delivery channel, or ADR decision.
- `F08-T10` and `F08-T11` retain phase-level reliability and mock-removal/review gates. Evidence and status remain roadmap-owned.

Post-design re-check: passed. The design artifacts record only the authoritative entity names and task boundaries; they add no route, schema, field, queue, or delivery-policy contract.

## Project Structure

```text
specs/006-adopt-phase-08/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/phase-08-adoption.md
├── checklists/requirements.md
└── tasks.md

plan/phases/08-FOLLOWUP-CONTENT.md
apps/api/{prisma,src/modules/**,test}/
apps/app/src/app/(app)/{trackers,mezaj,notifications,profile,articles}/
apps/dashboard/src/{app/(app),features,data}/
packages/api-client/
```

The paths identify existing product surfaces only; they do not assign ownership or authorize work.

## Preserved Roadmap Sequence

1. `F08-T01` — metric/unit/range و query contract health observations.
2. `F08-T02` — write/query tracker و dashboard health views.
3. `F08-T03` — mezaj result از assessment versioned.
4. `F08-T04` — notification/preference و in-app read state.
5. `F08-T05` — content publication lifecycle و media policy.
6. `F08-T06` — ADR و bootstrap outbox/worker فقط برای reminder واقعی.
7. `F08-T07` — appointment و treatment reminders idempotent.
8. `F08-T08` — اتصال app tracker/notification/article.
9. `F08-T09` — اتصال dashboard health/notification/content.
10. `F08-T10` — restart/retry/idempotency، timezone و browser E2E.
11. `F08-T11` — حذف mock scope و review Milestone C.

The source provides no individual `Depends on` fields or batch map. This plan preserves the listed order and does not manufacture hard dependencies, parallel lanes, claims, or task status.

## Dependency and Boundary Risks

- The roadmap's phase-level prerequisites are Phase 05 completion and the Phase 07 treatment-scheduling baseline for treatment reminders. Future coordinators must revalidate those existing sources before `F08-T07`; this is not a new task dependency.
- `F08-T01` owns metric/unit/range and query-contract definition. `F08-T02` must not independently freeze or diverge from that contract.
- `F08-T03` depends on the completed versioned-assessment baseline conceptually; it must not reinterpret assessment versions or duplicate assessment-engine scope.
- `F08-T06` must remain narrowly tied to a real reminder need. `F08-T07` is the only roadmap task that owns appointment/treatment reminder behavior; no speculative worker, queue, or delivery system belongs earlier.
- `F08-T07` must consume existing Phase 05 appointment and Phase 07 treatment scheduling sources without changing their ownership or inventing duplicate scheduling.
- `F08-T08` and `F08-T09` must not replace truthful UI states or remove mock scope before their relevant real sources and contracts are ready. Generated-client ownership, if needed, must be assigned by a future coordinator.
- `F08-T10` is the integrated restart/retry/idempotency/timezone/browser gate, and `F08-T11` is the mock-removal and Milestone C review gate. Their work must follow the preceding source and connection tasks.

These are source-derived coordination risks, not new dependencies or authorization to start implementation.
