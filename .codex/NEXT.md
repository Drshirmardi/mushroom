# Live Handoff

- Updated: `2026-08-26 15:08 +03:30`
- Status: `READY`
- Active slice: complete `F03-T05`, patient assessment list/start/save/resume/submit/result API.

## Next action

Implement patient-facing assessment APIs for published versions: list, start/resume a draft submission, save answers, submit with an idempotency key, and return the immutable result snapshot. Keep every operation scoped to the authenticated patient and audit sensitive writes/reads.

## Acceptance

- Patients can see only published versions for their clinic and only their own submissions.
- Save/resume works only for `IN_PROGRESS`; completed results remain immutable.
- Submit is idempotent and rejects a key reused with a different payload.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
