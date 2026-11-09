# Unified two-person test journey — implementation handoff

Date: 2026-11-09. Source: dev@2a6e2e6b79947bdcc1cfd0ae49c6a52c624cf335.
Implementation branch: `codex/couples-unified-test-flow-20261109`.

## Product constraints

- In patient-facing content use **«تست»**, not «آزمون» or «ارزیابی», when referring to two-person tests. Keep API/DB/TypeScript identifiers unchanged.
- One discoverable journey: catalog and received invitations -> enter phone/role -> receive/accept invitation -> independent consents -> one verified payment / two owned grants -> independent test attempts -> authorized two-person result.
- Read the actual title/price/roles/eligibility from the published offering. Never hardcode a specific test name or price.
- Three **user-facing destinations**: `/assessment/couples` (catalog, invite form, inbox, active, history), `/assessment/marriage/requests/[id]` (request plus linked educational participation), `/assessment/couples/educational/result/[id]` (authorized joint result).
- Shared app facilities remain independent: `/assessment/resume`, `/profile/wallet/pay`, `/profile/wallet/payment-result`, login/signup/welcome and profile edit.

## Backend identity and authorization (do NOT flatten)

- `AssessmentOfferingVersion` + `AssessmentAdminPublication`: immutable published config including two semantic FIRST/SECOND roles (independent of inviter/recipient), genders, minimum ages, text/policy versions, IRR amount, ordered role interpretation.
- `MarriageServiceRequest`: PENDING/ACCEPTED/CANCELLED/REPLACED, phone fingerprint/encryption, verified phone recipient ownership, original `linkId`, nullable `educationalId`, independent inviter/recipient status, `invitationPath` and `continuation`.
- `CoupleSession` + participant/link consent; `EducationalCoupleSession` + `EducationalCoupleParticipant` separate processing and result-sharing consent.
- `BillingIntent` + `AssessmentPurchase`: real payment, idempotency, retained original amount; `AssessmentAccessGrant` per beneficiary; `PatientAssessmentSubmission` per person. Partner responses and private source IDs must NEVER be leaked through client summaries.
- `MarriageInvitationDelivery`: queued/sending/provider-accepted/failed/unknown; provider acknowledgment is NOT carrier delivery. Copy invitation link works independently.
- Marriage acceptance transaction materializes the educational session and stores `educationalId` atomically. Backend `continuation.nextPath` currently points to historical educational route; preserve its API meaning but the main patient UI can render the educational workspace inside request detail.
- Legacy `CoupleInvitation`, `CoupleAssessmentSession` and old educational contexts may have no marriage request; do not force their IDs through the new request route.
- Public new attempts are paid. `EducationalCoupleService.create` requires paid ACTIVE COUPLES publication; existing historical FREE grants must still be readable as allowed by their retained data.
- Actual policies (account link / processing / result sharing / purchase terms) are distinct persisted legal acceptances. Never merge their consent records or rewrite published document hashes.

## Inbound navigation inventory

- `apps/app/src/app/(app)/assessment/page.tsx`: pending received invites, in-progress submissions, catalog, purchase/history; couple catalog needs the unified form entry URL.
- `apps/app/src/app/(app)/page.tsx`: service card to `/assessment/couples`.
- `apps/app/src/lib/home-status.ts` and `home-journey.ts`: historical couple link and paid assessment references MUST continue working.
- `apps/app/src/lib/marriage-return.ts`, `marriage-profile-return.ts`, `marriage-context.ts`, `api.ts`: validated next/return paths, session-scoped `marriageRequestId`, `X-Marriage-Request-Id` and signup/login/welcome continuity. New inline `newTestId` URL must pass the profile return allowlist.
- `apps/app/src/lib/payment-return.ts` and `profile/wallet/payment-result/page.tsx`: return to the invitation request; pending/compensated/expired are NOT success.
- `apps/dashboard/src/features/assessments/inline-offering-form.tsx` + `marriage-settings.tsx`: admin publication controls price, roles, age and actual joint text. No dashboard change required for patient route consolidation.
- Existing `marriage` list/create and `couples/educational/[id]` links remain compatible; legacy data continues via `couples/legacy`, `couples/links/[id]`, `couples/[id]`.

## Database inventory required before deleting any historical route (read-only)

Run on the DEV database only, without using production credentials or exporting user data:

```sql
SELECT 'marriage_service_requests' AS source, count(*) AS total FROM marriage_service_requests
UNION ALL SELECT 'couple_sessions', count(*) FROM couple_sessions
UNION ALL SELECT 'couple_invitations', count(*) FROM couple_invitations
UNION ALL SELECT 'educational_couple_sessions', count(*) FROM educational_couple_sessions
UNION ALL SELECT 'couple_assessment_sessions', count(*) FROM couple_assessment_sessions;

SELECT status, count(*) FROM marriage_service_requests GROUP BY status ORDER BY status;

SELECT count(*) AS educational_without_marriage_request
FROM educational_couple_sessions e
WHERE NOT EXISTS (SELECT 1 FROM marriage_service_requests r WHERE r.educational_id = e.id);
```

Do not delete/redirect legacy detail routes until the nonzero/zero counts and audit/payment references are reviewed. If DB access is unavailable, keep the compatibility routes.

## Focused verification

- `pnpm --filter @sabz/app test`, `pnpm --filter @sabz/app typecheck`, repository lint and build; GitHub CI is the execution gate for connector-only edits.
- Update existing navigation/browser contracts without weakening payment/consent assertions.
- Two independent authenticated accounts: pending recipient before signup; verified-phone login, profile return, role eligibility; request acceptance; independent processing+disclosure consent; one payment and two grants; both autosave/resume/complete; authorized result; withdrawal; SMS failure/copy fallback; cancellation/replacement; expired/compensated/pending payments; historical owned contexts.
- Performance: list summary once for the main page; load per-request detail only upon navigation, and no loading of historical link/assessment APIs until legacy is explicitly opened.

## No destructive migration

This feature is a route/composition and terminology change. Never drop tables, overwrite historical snapshots, rewrite financial records, or delete retained historical routes without a separate data migration review and explicit authorization.
