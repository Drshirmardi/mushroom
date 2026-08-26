# Live Handoff

- Updated: `2026-08-26 15:15 +03:30`
- Status: `READY`
- Active slice: complete `F03-T05`, patient assessment list/start/save/resume/submit/result API.

## Next action

Finish `F03-T05`: add patient submit/result endpoints to the published-version list/start/resume/save APIs already delivered. Submit must require an idempotency key and atomically freeze the immutable result snapshot; preserve the exact scoring boundary for `F03-T06`.

## Acceptance

- Patients can submit only their own `IN_PROGRESS` submission and retrieve only their own result.
- Submit is idempotent and rejects a key reused with a different payload.
- The result snapshot is immutable and has an explicit scoring handoff for `F03-T06`.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
