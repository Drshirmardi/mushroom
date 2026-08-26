# Live Handoff

- Updated: `2026-08-26 15:04 +03:30`
- Status: `READY`
- Active slice: complete `F03-T04`, configure the clinic's main-assessment booking requirement.

## Next action

Implement the authorized, audited clinic booking-eligibility policy read/update operation. It must select only a published same-clinic assessment version and preserve `validityDays=null` / `requireLatestPublishedVersion=false` defaults.

## Acceptance

- Only admins can read and update the policy.
- A required policy rejects draft, retired, or other-clinic assessment versions.
- Disabled policy clears its version without deleting historical submissions.
- OpenAPI, generated client, authorization and integration tests pass.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
