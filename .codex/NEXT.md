# Live Handoff

- Updated: `2026-08-26 15:49 +03:30`
- Status: `READY`
- Active slice: complete `F03-T09`, dashboard assessment builder/list/results integration.

## Next action

Implement the dashboard `/assessments` interface using the generated client: list versions, draft builder, preview, duplicate, publish/archive, policy configuration and real result list. Do not show fabricated result counts or status.

## Acceptance

- Dashboard uses generated client operations only.
- Builder states surface API validation/errors and immutable version behavior.
- Result list and policy controls show real persisted data.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
