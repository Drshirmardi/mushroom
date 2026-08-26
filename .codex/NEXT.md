# Live Handoff

- Updated: `2026-08-26 15:32 +03:30`
- Status: `READY`
- Active slice: complete `F03-T07`, patient booking-eligibility endpoint with stable blocker codes.

## Next action

Implement `/v1/patients/me/booking-eligibility`, combining onboarding completeness, clinic policy and valid assessment completion. Return stable blocker codes and next actions without using score for eligibility.

## Acceptance

- Incomplete onboarding returns `PROFILE_INCOMPLETE` before assessment evaluation.
- Disabled policy returns eligible without reading score.
- Required policy returns the documented assessment/expiry/latest-version blocker and next action.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
