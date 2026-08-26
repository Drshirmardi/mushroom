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
