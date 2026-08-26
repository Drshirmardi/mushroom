# Live Handoff

- Updated: `2026-08-26 15:22 +03:30`
- Status: `READY`
- Active slice: complete `F03-T05`, patient assessment list/start/save/resume/submit/result API.

## Next action

Finish `F03-T05/F03-T06` boundary: replace the temporary `PENDING_F03_T06` scoring marker in the newly delivered submit path with deterministic answer validation, score and result-band selection before a submission becomes immutable. Existing submissions are deliberately untouched by the database immutability trigger.

## Acceptance

- Patients can submit only their own `IN_PROGRESS` submission and retrieve only their own result.
- Submit is idempotent and rejects a key reused with a different payload.
- Every newly completed submission has validated answers, deterministic score and result-band snapshot before it becomes immutable.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
