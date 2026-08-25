# Live Handoff

- Updated: `2026-08-26 00:30 +03:30`
- Status: `BLOCKED — local browser interaction policy`
- Active slice: finish onboarding/consent browser verification and close the current milestone slice.

## Known completed state

- Patient onboarding/consent database integrity and migration upgrade checks are accepted.
- Patient/admin API authorization, audit, idempotency, and OpenAPI contract checks are accepted.
- App and dashboard onboarding/patient integrations use the generated client and scoped mocks were removed.

## Next action

1. Inspect only the existing E2E configuration, relevant scripts, and onboarding/patient flows.
2. Restore or use the repository's normal local browser E2E path without weakening localhost/security policy.
3. Verify the real flow: register → consent → save draft → refresh/resume → complete → view the same persisted patient in dashboard.
4. Run targeted app/dashboard checks, then the required slice-level build/E2E gate.

## Acceptance

- Real browser E2E passes, or an external-only blocker is reproduced with the exact command/state needed to unblock it.
- No mock, fake success, or fabricated dashboard value remains in this scope.
- Main-agent diff and test review passes before this slice is accepted.

## After acceptance

Replace this file with one short next slice: freeze the main-assessment and configurable booking-eligibility contract. Do not copy historical logs here.

## Do not touch

- Unrelated dirty files
- `apps/app/src/components/home/slider-data.ts`
- `justforcheck.md`
