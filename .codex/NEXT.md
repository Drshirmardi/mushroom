# Active Task Batch

- Updated: `2026-08-27 14:13 +03:30`
- Batch: `F03-B12`
- Status: `DONE`
- Goal: risk-based API verification and both booking browser journeys for Phase 03 are complete.

## Tasks

### F03-T12 — `DONE`

- Dependencies: F03-T09, F03-T10, and F03-T11 are complete.
- Scope: versioning, idempotency, authorization, policy matrix, and browser E2E.
- Owned paths: focused assessment API specs and `specs/001-adopt-phase-03/evidence.md`.
- Shared/exclusive resource: local E2E database and browser session.
- Required checks: focused five-file API suite and API typecheck passed (`5 files / 30 tests`); required and optional browser journeys passed with recorded local evidence.

## Batch review gate

- Main-agent review passed: each contract matrix category has direct coverage and both browser journeys have durable evidence.
- `F03-T12` is ready for its task-level commit.
- F03-T13 must not start in this batch.

## Next eligible task

- `F03-T13` is the next eligible task and remains unclaimed.

## Protected

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
