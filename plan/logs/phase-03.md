# Phase 03 — Execution Evidence

## F03-T01 — قرارداد Assessment و Booking Eligibility v1

Task ID: F03-T01
Completed at: 2026-08-26 11:38 +03:30
Reviewed by: Codex /root
Contract:
  - `plan/contracts/assessment-booking-v1.md`
Decisions:
  - ساختار سؤال‌ها و result bands داخل snapshot نسخه immutable نگه‌داری می‌شود.
  - question types v1: single choice، multiple choice، boolean، number و text.
  - scoring deterministic است و score هیچ نقشی در booking eligibility ندارد.
  - policy به نسخه منتشرشده همان clinic اشاره می‌کند؛ validity و latest-version اختیاری و پیش‌فرض غیرفعال‌اند.
  - submission تکمیل‌شده و result آن snapshot غیرقابل‌ویرایش هستند.
Verification:
  - قرارداد با قواعد Phase 03 و تصمیم‌های پایدار PROJECT-CONTEXT تطبیق داده شد.
  - تست فعلی eligibility برای scoreهای null، zero و positive → PASS.
Result:
  - F03-T01 → ACCEPTED
  - F03-T02 unblocked.

## F03-T02 — migration و constraintهای assessment/booking v1

Task ID: F03-T02
Completed at: 2026-08-26 14:52 +03:30
Reviewed by: Codex /root
Changed:
  - نسخه‌های immutable assessment، submission/result snapshot و booking policy در Prisma و migrationها تکمیل شدند.
  - policy تنها به نسخه منتشرشده همان clinic اشاره می‌کند و version required قابل archive نیست.
  - validityDays و requireLatestPublishedVersion با پیش‌فرض‌های قرارداد v1 اضافه شدند.
Verification:
  - Prisma generate/typecheck → PASS.
  - fresh migration + upgrade smoke → PASS.
  - migration روی دیتابیس توسعه → PASS.
  - API full suite: 32 files / 211 tests → PASS.
Result:
  - F03-T02 → ACCEPTED
  - F03-T03 unblocked.

## F03-T03 — admin assessment lifecycle

Task ID: F03-T03
Completed at: 2026-08-26 15:03 +03:30
Agent/Thread: historical thread not recorded; implementation commit authored by `sayh3x`
Batch ID: historical batch ID not recorded
Reviewed by: historical reviewer not recorded; checklist acceptance recorded in commit `82dcb2a`
Verified artifacts:
  - commit `91f83b1` — secured admin list/get/create/update/duplicate/publish/archive lifecycle
Changed files:
  - `apps/api/src/modules/assessments/admin/admin-assessments.controller.ts`
  - `apps/api/src/modules/assessments/admin/admin-assessments.dto.ts`
  - `apps/api/src/modules/assessments/admin/admin-assessments.module.ts`
  - `apps/api/src/modules/assessments/admin/admin-assessments.service.ts`
  - `apps/api/src/modules/assessments/application/assessment-audit.ts`
  - `apps/api/test/admin-assessments.authorization.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
Migrations:
  - ندارد
Tests run:
  - `pnpm --filter @sabz-zendegi/api exec vitest run test/admin-assessments.authorization.spec.ts test/admin-booking-policy.authorization.spec.ts test/patient-assessments.authorization.spec.ts test/assessment-scoring.spec.ts test/assessment-booking-contract.spec.ts --no-file-parallelism` → PASS (`5 files / 25 tests`, reconciliation run 2026-08-26)
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `pnpm --filter @sabz-zendegi/api-client typecheck` → PASS (generated contract matches committed output)
Result:
  - ADMIN-only lifecycle authorization → PASS
  - malformed draft structure rejection، duplicate-to-draft behavior و idempotent republish → PASS
  - OpenAPI/generated client artifacts exist in the implementation commit and pass current drift/type checks → PASS
Known limitations:
  - historical batch ID، thread ID و reviewer identity در artifacts موجود ثبت نشده‌اند.
Next batch:
  - historical handoff advanced to F03-T04.

## F03-T04 — transactional main assessment policy

Task ID: F03-T04
Completed at: 2026-08-26 16:01 +03:30
Agent/Thread: historical thread not recorded; implementation commit authored by `sayh3x`
Batch ID: historical batch ID not recorded
Reviewed by: historical reviewer not recorded; checklist acceptance recorded in commit `64f6fac`
Verified artifacts:
  - commit `6f8e031` — authorized booking-policy API and generated contract
  - commit `64f6fac` — transactional update and selection of a published `MAIN` assessment from the active clinic
Changed files:
  - `apps/api/src/modules/assessments/admin/admin-booking-policy.controller.ts`
  - `apps/api/src/modules/assessments/admin/admin-booking-policy.dto.ts`
  - `apps/api/src/modules/assessments/admin/admin-booking-policy.service.ts`
  - `apps/api/src/modules/assessments/admin/admin-assessments.module.ts`
  - `apps/api/src/modules/assessments/application/assessment-audit.ts`
  - `apps/api/test/admin-booking-policy.authorization.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
Migrations:
  - ندارد
Tests run:
  - focused Phase 03 API command recorded under `F03-T03` → PASS (`5 files / 25 tests`)
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `pnpm --filter @sabz-zendegi/api-client typecheck` → PASS
Result:
  - ADMIN-only policy read/update and safe disabled defaults → PASS
  - required policy filters by clinic، `MAIN` key و `PUBLISHED` status → PASS
  - disabling policy clears version/validity/latest flags inside the transaction → PASS
Known limitations:
  - historical batch ID، thread ID و reviewer identity در artifacts موجود ثبت نشده‌اند.
Next batch:
  - historical handoff advanced to F03-T05.

## F03-T05 — patient assessment submission API

Task ID: F03-T05
Completed at: 2026-08-26 15:22 +03:30
Agent/Thread: historical thread not recorded; implementation commits authored by `sayh3x`
Batch ID: historical batch ID not recorded
Reviewed by: historical reviewer not recorded; checklist acceptance recorded in commit `82dcb2a`
Verified artifacts:
  - commits `4916894` and `dc620dc` — patient list/start/resume/save/submit/result endpoints and generated contract
Changed files:
  - `apps/api/src/modules/assessments/patient/patient-assessments.controller.ts`
  - `apps/api/src/modules/assessments/patient/patient-assessments.dto.ts`
  - `apps/api/src/modules/assessments/patient/patient-assessments.module.ts`
  - `apps/api/src/modules/assessments/patient/patient-assessments.service.ts`
  - `apps/api/src/modules/assessments/application/assessment-audit.ts`
  - `apps/api/test/patient-assessments.authorization.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
Migrations:
  - ندارد
Tests run:
  - focused Phase 03 API command recorded under `F03-T03` → PASS (`5 files / 25 tests`)
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `pnpm --filter @sabz-zendegi/api-client typecheck` → PASS
Result:
  - patient-only route authorization and ownership-safe not-found behavior → PASS
  - completed submission cannot be saved and identical completion requests replay idempotently → PASS
  - list/start/resume/save/submit/result route artifacts and generated contracts are present in repository history → PASS
Known limitations:
  - historical batch ID، thread ID و reviewer identity در artifacts موجود ثبت نشده‌اند.
Next batch:
  - historical handoff advanced to F03-T06.

## F03-T06 — deterministic scoring and immutable result snapshot

Task ID: F03-T06
Completed at: 2026-08-26 16:08 +03:30
Agent/Thread: historical thread not recorded; implementation commits authored by `sayh3x`
Batch ID: historical batch ID not recorded
Reviewed by: historical reviewer not recorded; completed checklist state is present in the current authoritative phase file
Verified artifacts:
  - commit `5643e5f` — deterministic scoring and result-band snapshot
  - commit `b4aaae5` — persisted risk level and review flag classification
Changed files:
  - `apps/api/src/modules/assessments/domain/assessment-scoring.ts`
  - `apps/api/src/modules/assessments/patient/patient-assessments.service.ts`
  - `apps/api/test/assessment-scoring.spec.ts`
  - `plan/phases/03-ASSESSMENT-ELIGIBILITY.md`
Migrations:
  - ندارد
Tests run:
  - focused Phase 03 API command recorded under `F03-T03` → PASS (`5 files / 25 tests`)
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS
Result:
  - all five supported answer types score deterministically → PASS
  - malformed/unknown/duplicate answers and unmatched result bands are rejected → PASS
  - result-band snapshot includes verified risk level and review flag → PASS
Known limitations:
  - historical batch ID، thread ID و reviewer identity در artifacts موجود ثبت نشده‌اند.
Next batch:
  - F03-B07.

### Reconciliation verification note for F03-T03 through F03-T06

- `pnpm --filter @sabz-zendegi/api test` → PARTIAL: `37` test files and `236` tests passed؛ migration smoke suite did not start because `DATABASE_URL` was not available (`1` failed suite، `2` skipped tests).
- This run verifies the non-database API suite but is not evidence of a PostgreSQL migration/integration PASS for these historical tasks.
- The original historical test commands/results، batch IDs، thread IDs and reviewer identities for `F03-T03` through `F03-T06` could not be recovered from the available repository artifacts.

## F03-T07 — booking eligibility blocker matrix

Task ID: F03-T07
Completed at: 2026-08-26 16:22 +03:30
Agent/Thread: Codex /root/f03_t07
Batch ID: F03-B07
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/assessments/patient/patient-booking-eligibility.service.ts`
  - `apps/api/test/patient-booking-eligibility.spec.ts`
Migrations:
  - ندارد
Tests run:
  - `pnpm --filter @sabz-zendegi/api test` → PASS
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `pnpm generate:api-client` → PASS (no contract drift)
  - `git diff --check` → PASS
Result:
  - blocker code و nextAction برای profile، policy، completion، latest version و expiry → PASS
  - eligibility تنها بر اساس completion معتبر است؛ score/risk خوانده یا استفاده نمی‌شود → PASS
  - authorization endpoint برای PATIENT → PASS
Known limitations:
  - ندارد
Next batch:
  - تعریف نشده در `.codex/NEXT.md`

## F03-T08 — admin assessment submissions and patient workspace

Task ID: F03-T08
Completed at: 2026-08-26 19:45 +03:30
Agent/Thread: Codex /root/f03_t08
Batch ID: F03-B08
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/assessments/admin/admin-assessment-submissions.controller.ts`
  - `apps/api/test/admin-assessment-submissions.authorization.spec.ts`
  - `apps/dashboard/src/features/patients/workspace/patient-workspace.tsx`
  - `apps/dashboard/src/lib/patient-api.ts`
  - `apps/dashboard/src/lib/patient-api.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
Migrations:
  - ندارد
Tests run:
  - `pnpm --filter @sabz-zendegi/api test -- admin-assessment-submissions.authorization.spec.ts` → PASS
  - `pnpm --filter @sabz/dashboard test -- patient-api.spec.ts` → PASS
  - `pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `pnpm --filter @sabz/dashboard typecheck` → PASS
  - `pnpm --filter @sabz-zendegi/api-client typecheck` → PASS
  - `pnpm generate:api-client` → PASS
  - `git diff --check` → PASS
Result:
  - ADMIN submission reads are permission-protected, clinic-scoped, and audited → PASS
  - patient workspace renders actual submission/result state and truthful loading/error/empty states → PASS
  - typed query parameters were exported to the generated client → PASS
Known limitations:
  - ندارد
Next batch:
  - F03-B09

## F03-T09 — dashboard assessment builder, lifecycle, policy and results

Task ID: F03-T09
Completed at: 2026-08-26 21:43 +03:30
Agent/Thread: Codex /root
Batch ID: F03-B09
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/assessments/admin/admin-assessments.dto.ts`
  - `apps/api/src/modules/assessments/admin/admin-booking-policy.dto.ts`
  - `apps/dashboard/src/features/assessments/assessments-page.tsx`
  - `apps/dashboard/src/lib/assessment-api.ts`
  - `apps/dashboard/src/lib/assessment-api.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
Migrations:
  - ندارد
Tests run:
  - `corepack pnpm --filter @sabz/dashboard exec vitest run assessment` → PASS (`1 file / 4 tests`)
  - `corepack pnpm --filter @sabz/dashboard typecheck` → PASS
  - `corepack pnpm --filter @sabz-zendegi/api exec vitest run test/admin-assessments.authorization.spec.ts test/admin-assessment-submissions.authorization.spec.ts test/patient-assessments.authorization.spec.ts test/patient-booking-eligibility.spec.ts test/assessment-booking-contract.spec.ts --no-file-parallelism` → PASS (`5 files / 28 tests`)
  - `corepack pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `corepack pnpm --filter @sabz-zendegi/api-client typecheck` → PASS (generated-client drift check included)
  - `git diff --check` → PASS
Result:
  - assessment list، create/update draft، duplicate، publish/archive و booking policy از generated client واقعی استفاده می‌کنند → PASS
  - submission result list با filter نسخه، result snapshot و پیوند patient workspace از API واقعی نمایش داده می‌شود → PASS
  - loading، empty، forbidden، unavailable و error state بدون مقدار mock حفظ شدند → PASS
  - metadata ناقص request DTOها در منبع OpenAPI اصلاح و client یک‌بار regenerate شد → PASS
Known limitations:
  - سازندهٔ مینیمال از صفر سوال تک‌انتخابی می‌سازد؛ draft دارای نوع سوال دیگر برای جلوگیری از حذف داده به‌صورت read-only رد می‌شود. توسعهٔ editor انواع دیگر فقط با requirement مستقل لازم است.
Next task:
  - `F03-T10` واجد شرایط است، اما شروع نشده است.

## F03-T10 — patient assessment flow and booking route gate

Task ID: F03-T10
Completed at: 2026-08-27 12:11 +03:30
Agent/Thread: Codex /root
Batch ID: F03-B10
Reviewed by: Codex /root
Changed files:
  - `apps/api/src/modules/assessments/patient/patient-assessments.dto.ts`
  - `apps/app/src/app/(app)/assessment/page.tsx`
  - `apps/app/src/app/(app)/assessment/[type]/page.tsx`
  - `apps/app/src/app/(app)/assessment/result/page.tsx`
  - `apps/app/src/app/(app)/appointments/book/page.tsx`
  - `apps/app/src/lib/assessment-api.ts`
  - `apps/app/src/lib/assessment-api.spec.ts`
  - `apps/app/src/lib/booking-eligibility.ts`
  - `apps/app/src/lib/booking-eligibility.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
Migrations:
  - ندارد
Tests run:
  - `corepack pnpm --filter @sabz/app exec vitest run assessment booking-eligibility` → PASS (`2 files / 6 tests`)
  - `corepack pnpm --filter @sabz/app typecheck` → PASS
  - `corepack pnpm --filter @sabz-zendegi/api exec vitest run test/patient-assessments.authorization.spec.ts test/patient-booking-eligibility.spec.ts test/assessment-booking-contract.spec.ts --no-file-parallelism` → PASS (`3 files / 21 tests`)
  - `corepack pnpm --filter @sabz-zendegi/api typecheck` → PASS
  - `corepack pnpm --filter @sabz-zendegi/api-client typecheck` → PASS (generated-client drift/typecheck)
  - `corepack pnpm generate:api-client` → PASS
  - `git diff --check` → PASS
Result:
  - list/start/resume/save/submit/result بیمار با generated client واقعی و پاسخ‌های ذخیره‌شده متصل شد → PASS
  - هر پنج نوع سؤال قرارداد با ترتیب canonical، validation لازم و submit دارای idempotency key پایدار پشتیبانی شد → PASS
  - نتیجه immutable ذخیره‌شده شامل version، score، result band و review flag بدون محاسبه محلی نمایش داده شد → PASS
  - ورودی مستقیم رزرو فقط بر اساس eligibility سرور باز می‌شود و blocker/nextAction پایدار CTA مناسب دارد؛ score در gate استفاده نمی‌شود → PASS
  - loading، empty، unavailable و error state بدون داده mock حفظ شدند → PASS
Known limitations:
  - فایل mock قدیمی خارج از مسیر مصرف باقی ماند؛ حذف repository-wide آن در scope صریح `F03-T13` است.
Next task:
  - `F03-T11` واجد شرایط است، اما شروع و claim نشده است.

## F03-T11 — dashboard assessment activity

Task ID: F03-T11
Completed at: 2026-08-27 13:08 +03:30
Agent/Thread: Codex /root
Batch ID: F03-B11
Reviewed by: Codex /root
Changed files:
  - `apps/dashboard/src/features/dashboard/dashboard-page.tsx`
  - `apps/dashboard/src/lib/dashboard-assessment-summary.ts`
  - `apps/dashboard/src/lib/dashboard-assessment-summary.spec.ts`
Migrations:
  - ندارد
Tests run:
  - `corepack pnpm --filter @sabz/dashboard exec vitest run dashboard-assessment-summary` → PASS (`1 file / 5 tests`)
  - `corepack pnpm --filter @sabz/dashboard typecheck` → PASS
  - `git diff --check` → PASS
Result:
  - countهای completed و pending و فعالیت recent فقط از responseهای موجود submission مشتق می‌شوند → PASS
  - activity خالی است و صفرها فقط وقتی نمایش داده می‌شوند که total واقعی API صفر باشد → PASS
  - حالت‌های loading، forbidden و unavailable بدون widget یا activity ساختگی نمایش داده می‌شوند → PASS
Known limitations:
  - aggregate endpoint یا widgetهای بدون منبع داده اضافه نشدند.
Next task:
  - `F03-T12` واجد شرایط است، اما شروع و claim نشده است.
