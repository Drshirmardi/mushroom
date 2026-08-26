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
