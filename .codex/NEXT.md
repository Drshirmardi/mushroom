# Active Task Batch

- Updated: `2026-08-26 16:25 +03:30`
- Batch: `F03-B08`
- Status: `READY`
- Goal: expose real assessment submissions and results to ADMIN, filtered by patient, and surface them in the patient workspace.

## Tasks

### F03-T08 — `READY`

- Dependencies: F03-T05, F03-T06, and F03-T07 are complete.
- Scope: implement and verify the ADMIN submissions/results listing and patient filter, then connect that real data to the dashboard patient workspace.
- Owned paths: assessment-submissions ADMIN API, dashboard patient workspace assessment views, generated client only if the API contract changes, and focused tests.
- Acceptance:
  - ADMIN can retrieve only authorized assessment submission/result data and filter it by patient.
  - The patient workspace presents actual submission/result state; it does not fabricate empty counts or mock data.
  - Medical data boundaries retain authorization and audit behavior.
- Required checks: focused API authorization/integration tests, focused dashboard tests/typecheck, API typecheck, and OpenAPI/client generation check if the contract changes.

## Batch review gate

- Main agent reviews the final diff, persisted snapshot immutability, authorization/audit boundaries, generated contract drift, tests, and unrelated files.
- Set `F03-T08` to `DONE` only after all acceptance checks pass.
- After acceptance, replace this file with the next eligible batch of up to three dependency-safe tasks; do not start that batch in the same turn.

## Protected

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
