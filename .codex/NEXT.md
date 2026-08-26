# Live Handoff

- Updated: `2026-08-26 14:52 +03:30`
- Status: `READY`
- Active slice: complete `F03-T03`, secured admin assessment draft/publish/archive operations.

## Next action

Implement authorized and audited admin operations to list/create/update/duplicate/publish/archive assessment versions. Publish the OpenAPI contract and regenerate the API client from it.

## Acceptance

- Only admins can manage assessment versions.
- Publish is idempotent; published or retired content cannot mutate.
- Duplicate produces a new draft version with its own identity/content hash.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
