# Active Task Batch

- Updated: `2026-08-26 21:24 +03:30`
- Batch: `F03-B09`
- Status: `IN_PROGRESS`
- Goal: complete the dashboard assessment builder/list/results integration with exclusive generated-contract ownership.

## Tasks

### F03-T09 — `CLAIMED`

- Dependencies: F03-T08 is complete.
- Scope: connect the assessment builder, assessment list, and result views throughout the dashboard to real API data.
- Owned paths: dashboard assessment features، `apps/dashboard/src/lib/assessment-api*`، admin assessment DTO metadata only if a write-flow proves it necessary، focused tests.
- Shared/exclusive resource: `packages/api-client/openapi.json` and `packages/api-client/src/schema.generated.ts` are coordinator-only for this batch.
- Acceptance:
  - Builder, list, and result views use generated client data rather than mock values.
  - Loading, error, and unavailable states remain truthful.
- Required checks: focused dashboard tests and dashboard typecheck; if contract files change, focused API tests/typecheck and generated-client drift/typecheck.

## Batch review gate

- Main agent reviews the final diff, persisted snapshot immutability, authorization/audit boundaries, generated contract drift, tests, and unrelated files.
- Set `F03-T09` to `DONE` only after its acceptance checks pass.
- After acceptance, replace this file with the next eligible batch of up to three dependency-safe tasks; do not start that batch in the same turn.

## Next eligible task

- `F03-T10` remains unchecked and may be claimed only after `F03-B09` releases the generated OpenAPI/client paths.

## Protected

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
