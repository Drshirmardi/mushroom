# Active Task Batch

- Updated: `2026-08-26 16:10 +03:30`
- Batch: `F03-B07`
- Status: `READY`
- Goal: verify and complete the booking eligibility endpoint with its full blocker matrix.

## Tasks

### F03-T07 — `READY`

- Dependencies: deterministic assessment scoring and result-band behavior are complete.
- Scope: complete the booking eligibility test matrix. `PROFILE_INCOMPLETE`, disabled policy and expiry are verified; add required/latest-version completion paths and authorization/API coverage.
- Owned paths: booking eligibility domain/application/API and focused tests only.
- Acceptance:
  - All blocker codes and next actions are stable.
  - Eligibility remains based on valid completion, never score or risk.
- Required checks: focused assessment tests, eligibility tests, API authorization/integration tests, OpenAPI/client generation check, affected package typechecks.

## Batch review gate

- Main agent reviews the final diff, persisted snapshot immutability, authorization/audit boundaries, generated contract drift, tests, and unrelated files.
- Set `F03-T07` to `DONE` only after all acceptance checks pass.
- After acceptance, replace this file with the next eligible batch of up to three dependency-safe tasks; do not start that batch in the same turn.

## Protected

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
