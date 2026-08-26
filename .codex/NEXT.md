# Live Handoff

- Updated: `2026-08-26 16:00 +03:30`
- Status: `READY`
- Active slice: complete `F03-T04`, make booking policy explicitly select the clinic main assessment in a transaction.

## Next action

Finish `F03-T04`: restrict the admin policy to a published `MAIN` assessment from the active clinic and update requirement/version/defaults transactionally. Then add the policy state matrix tests.

## Acceptance

- Requirement cannot point to a non-main assessment, draft, retired or another-clinic version.
- Disabled policy clears its version and preserves historical submissions.
- Toggle state matrix and generated API client pass.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
