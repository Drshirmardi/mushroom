# Client integration commit handoff — 2026-10-19

Task: F12-FE01; batch: CLIENT-INTEGRATION; owner/reviewer: Codex /root.

The owner explicitly requested committing all remaining changes in related sections. This supersedes the previous instruction to leave reviewable work uncommitted. These are scoped local checkpoints, not a claim that full integration acceptance is DONE. Phase and F12-FE01 remain IN_PROGRESS/REWORK and unchecked; no provider activation, migration, production publish or remote push was performed.

## Verification gate

- Final combined app tree:31 test files/165 tests PASS; Next.js production build including TypeScript and46 static pages PASS.
- git diff --check PASS before staging; every commit staged from an explicit literal path list, checked for exact ownership and whitespace errors.
- Prior read-only live and fully intercepted browser evidence: [service screens](../service-screens-verification.md), [Home/backend limits](../home-client-verification.md), [assessment review](../assessment-verification.md).
- Same shared F12-FE01 scope; no separate roadmap task mixed into these commits. Existing user .gitignore additions included in their own commit because the owner asked to commit everything.
- Remaining acceptance: real two-account/clinical/legal/provider release checks. Store TEST_OFFERS still display-only; real catalog has no compare-at price. No tests claim those external conditions are complete.
- Next action: owner UI review and authorized remaining integration acceptance in the same batch; do not start a new batch or mark F12-FE01 DONE.

## Section commits and changed files

### 5a63346 — feat(F12-FE01): add patient service clients and shared UI

- `apps/app/src/components/assessments/assessment-wizard.tsx`
- `apps/app/src/components/shared/page-header.tsx`
- `apps/app/src/components/shared/patient-pagination.tsx`
- `apps/app/src/components/shared/patient-resource-state.tsx`
- `apps/app/src/components/shared/policy-acceptance.tsx`
- `apps/app/src/components/shared/service-page.tsx`
- `apps/app/src/lib/api.ts`
- `apps/app/src/lib/appointment-api.spec.ts`
- `apps/app/src/lib/appointment-api.ts`
- `apps/app/src/lib/appointment-labels.ts`
- `apps/app/src/lib/assessment-api.ts`
- `apps/app/src/lib/assessment-catalog.spec.ts`
- `apps/app/src/lib/assessment-catalog.ts`
- `apps/app/src/lib/assessment-sharing-api.ts`
- `apps/app/src/lib/couples-api.ts`
- `apps/app/src/lib/digital-services-api.ts`
- `apps/app/src/lib/follow-up-api.spec.ts`
- `apps/app/src/lib/follow-up-api.ts`
- `apps/app/src/lib/order-labels.ts`
- `apps/app/src/lib/patient-journey-api.ts`
- `apps/app/src/lib/patient-request.ts`
- `apps/app/src/lib/security-api.ts`
- `apps/app/src/lib/use-operation-key.ts`
- `apps/app/src/lib/use-patient-resource.ts`

### d0492ca — style(F12-FE01): refresh patient theme and store product presentation

- `apps/app/public/fonts/IRANSansWebFaNum.woff2`
- `apps/app/public/fonts/IRANYekanX-Medium.woff`
- `apps/app/public/fonts/IRANYekanX-Regular.woff`
- `apps/app/public/fonts/README.md`
- `apps/app/src/app/globals.css`
- `apps/app/src/components/store/incredible-offers.tsx`
- `apps/app/src/components/store/product-card.tsx`
- `apps/app/src/components/store/store-collection.tsx`
- `apps/app/src/lib/product-image.ts`

### 3405d22 — fix(F12-FE01): clarify wallet top-ups and route purchase payments

- `apps/app/src/app/(app)/profile/wallet/pay/page.tsx`
- `apps/app/src/app/(app)/profile/wallet/payment-result/page.tsx`
- `apps/app/src/components/billing/payment-chooser.spec.tsx`
- `apps/app/src/components/billing/payment-chooser.tsx`
- `apps/app/src/components/billing/topup-sheet.tsx`
- `apps/app/src/lib/wallet-billing-api.ts`
- `apps/app/src/lib/wallet-labels.ts`

### 369c7ca — fix(F12-FE01): handle notification categories and add bottom sheet

- `apps/app/src/app/(app)/notifications/page.tsx`
- `apps/app/src/app/(app)/profile/notifications/page.tsx`
- `apps/app/src/components/notifications/notification-center.tsx`
- `apps/app/src/components/notifications/notification-sheet.tsx`
- `apps/app/src/lib/notification-presentation.spec.ts`
- `apps/app/src/lib/notification-presentation.ts`

### 99c6764 — feat(F12-FE01): connect individual and couple assessment journeys

- `apps/app/src/app/(app)/appointments/[id]/assessment-sharing/page.tsx`
- `apps/app/src/app/(app)/assessment/[type]/page.tsx`
- `apps/app/src/app/(app)/assessment/couples/[id]/page.tsx`
- `apps/app/src/app/(app)/assessment/couples/links/[id]/page.tsx`
- `apps/app/src/app/(app)/assessment/couples/page.tsx`
- `apps/app/src/app/(app)/assessment/offerings/[id]/page.tsx`
- `apps/app/src/app/(app)/assessment/page.tsx`
- `apps/app/src/app/(app)/assessment/purchases/[id]/page.tsx`
- `apps/app/src/app/(app)/assessment/result/page.tsx`
- `apps/app/src/app/(app)/assessment/resume/page.tsx`

### 7cc81a9 — feat(F12-FE01): connect educational and custom program journeys

- `apps/app/src/app/(app)/guidance/[id]/page.tsx`
- `apps/app/src/app/(app)/programs/content/[id]/page.tsx`
- `apps/app/src/app/(app)/programs/custom-offerings/[id]/page.tsx`
- `apps/app/src/app/(app)/programs/custom/[id]/page.tsx`
- `apps/app/src/app/(app)/programs/custom/[id]/versions/[versionId]/page.tsx`
- `apps/app/src/app/(app)/programs/offerings/[id]/page.tsx`
- `apps/app/src/app/(app)/programs/page.tsx`
- `apps/app/src/app/(app)/programs/purchases/[id]/page.tsx`

### 8443804 — feat(F12-FE01): connect appointment selection and detail navigation

- `apps/app/src/app/(app)/appointments/[id]/page.tsx`
- `apps/app/src/app/(app)/appointments/book/confirm/page.tsx`
- `apps/app/src/app/(app)/appointments/book/page.tsx`
- `apps/app/src/app/(app)/appointments/book/schedule/page.tsx`
- `apps/app/src/app/(app)/appointments/page.tsx`
- `apps/app/src/app/(app)/chat/page.tsx`

### c91564a — feat(F12-FE01): connect account security and profile service entry points

- `apps/app/src/app/(app)/profile/health-record/page.tsx`
- `apps/app/src/app/(app)/profile/page.tsx`
- `apps/app/src/app/(app)/profile/security/page.tsx`
- `apps/app/src/app/onboarding/layout.tsx`
- `apps/app/src/app/onboarding/page.tsx`

### a9e87a5 — style(F12-FE01): improve care and health article screens

- `apps/app/src/app/(app)/articles/[title]/page.tsx`
- `apps/app/src/app/(app)/articles/page.tsx`
- `apps/app/src/app/(app)/treatment/page.tsx`

### 5a0f791 — fix(F12-FE01): connect order history and tracking navigation

- `apps/app/src/app/(app)/store/order-tracking/page.tsx`
- `apps/app/src/app/(app)/store/orders/page.tsx`

### ea75a3b — feat(F12-FE01): connect home journey and contextual service actions

- `apps/app/src/app/(app)/page.tsx`
- `apps/app/src/components/shared/global-sheet.tsx`
- `apps/app/src/lib/home-journey.spec.ts`
- `apps/app/src/lib/home-journey.ts`
- `apps/app/src/lib/navigation.ts`

### 9464f9f — fix(F12-FE01): remove duplicate splash and simplify session loading

- `apps/app/src/components/auth/session-gate.tsx`
- `apps/app/src/components/layout/app-shell.tsx`
- `apps/app/src/components/shared/splash-screen.tsx`
- `apps/app/src/stores/ui.ts`

### d9559f5 — chore: ignore local archives and data snapshots

- `.gitignore`

### Documentation handoff commit

This document, plan/status synchronization, and existing integration/assessment/Home/service verification reports are committed together after the section commits above. See Git history for this documentation commit hash. No acceptance checkbox is changed to DONE.
