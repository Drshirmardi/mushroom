# راهنمای اجرای کار توسط Agentها

## هدف

این workflow از اجرای موازی ناسازگار، تیک‌زدن زودهنگام و گم‌شدن context جلوگیری می‌کند.

## قبل از شروع هر task

Agent باید:

1. `plan/README.md` را بخواند.
2. `plan/STATUS.md` را بخواند.
3. فایل فاز فعال را کامل بخواند.
4. `plan/04-ENGINEERING-STANDARDS.md` را بخواند.
5. `git status --short` را بررسی و تغییرهای موجود کاربر را حفظ کند.
6. task وابسته و پیش‌نیازها را بررسی کند.
7. فقط یک task کوچک و قابل verify را claim کند.

## Claim کردن task

قبل از تغییر کد، Agent باید در `STATUS.md` این موارد را ثبت کند:

```text
Task ID: Fxx-Tyy
Agent/Thread: شناسه قابل تشخیص
Started at: YYYY-MM-DD HH:mm TZ
Scope: خروجی دقیق task
Expected files: فایل‌ها یا پوشه‌های مورد انتظار
```

همچنین وضعیت فاز از `NOT_STARTED` به `IN_PROGRESS` تغییر می‌کند.

اگر task از قبل توسط Agent دیگری claim شده، Agent دوم نباید همان scope را شروع کند.

## ترتیب اجرای task

1. بررسی کد و requirement
2. ثبت یا اصلاح acceptance criteria در فایل فاز، اگر مبهم است
3. طراحی کوچک‌ترین تغییر کامل
4. migration یا contract در صورت نیاز
5. implementation
6. unit/integration/e2e test متناسب
7. اجرای verification
8. بررسی diff و تغییرهای unrelated
9. به‌روزرسانی docs و status
10. handoff

## قانون تیک‌زدن

checkbox فقط زمانی `[x]` می‌شود که:

- خروجی task در repository وجود داشته باشد.
- تست مرتبط اجرا و نتیجه ثبت شده باشد.
- acceptance criteria task پاس شده باشد.
- blocker پنهان یا TODO لازم برای همان task باقی نمانده باشد.

اگر بخشی ناقص است:

- checkbox `[ ]` باقی می‌ماند.
- وضعیت و بخش انجام‌شده در handoff نوشته می‌شود.
- در صورت مانع واقعی، task `BLOCKED` ثبت می‌شود.

## ثبت شواهد

پس از تکمیل task، Agent در `STATUS.md` اضافه می‌کند:

```text
Task ID: F03-T07
Completed at: 2026-..-..
Agent/Thread: ...
Changed files:
  - ...
Migrations:
  - ...
Tests run:
  - command → PASS/FAIL
Result:
  - acceptance criterion 1 → PASS
  - acceptance criterion 2 → PASS
Known limitations:
  - ...
Next task:
  - F03-T08
```

## پایان فاز

فاز فقط زمانی `READY_FOR_REVIEW` می‌شود که:

- تمام taskهای اجباری تیک خورده باشند.
- تمام exit criteria پاس شده باشند.
- migration از صفر تست شده باشد.
- تست‌های فاز پاس شده باشند.
- frontend integration تعیین‌شده انجام شده باشد.
- هیچ blocker بحرانی باز نباشد.

پس از review مستقل:

- فاز `DONE` می‌شود.
- checkbox فاز در `STATUS.md` تیک می‌خورد.
- فاز بعدی فعال می‌شود.
- taskهای فاز بعدی به بخش «taskهای فاز فعال» منتقل می‌شوند.

## Handoff در کار ناقص

اگر Agent نتوانست task را تمام کند، باید قبل از توقف بنویسد:

```text
Task ID:
Status: IN_PROGRESS | BLOCKED
Completed:
Remaining:
Files touched:
Commands/tests run:
Failure or blocker:
Safe next action:
Do not change:
```

## برخورد با تصمیم جدید

اگر پیاده‌سازی نیازمند تغییر معماری است:

1. Agent تغییر را پنهانی اعمال نمی‌کند.
2. یک ADR کوتاه در `plan/decisions/` پیشنهاد می‌دهد.
3. trade-off و اثر بر فازها را ثبت می‌کند.
4. `STATUS.md` را با blocker یا decision pending به‌روز می‌کند.
5. در صورت تغییر material، تأیید کاربر/مالک پروژه گرفته می‌شود.

قالب نام ADR:

```text
plan/decisions/ADR-0001-short-title.md
```

## قواعد کار موازی

- پس از Phase 03، clinical و commerce می‌توانند با مرزهای مشخص موازی شوند.
- تغییر مشترک در Prisma schema باید هماهنگ باشد.
- هر migration prefix/time یکتا دارد.
- تغییر در `common/auth`، error contract یا API client نیازمند اطلاع به تمام taskهای فعال است.
- یک Agent مسئول merge conflict یا cleanup تغییر Agent دیگر نیست مگر صریحاً واگذار شود.

## ممنوعیت‌ها

- تیک‌زدن بر اساس «کد نوشته شد» بدون تست ممنوع است.
- ساخت package، service یا abstraction خالی برای آینده ممنوع است.
- حذف mock قبل از آماده‌شدن API feature ممنوع است.
- اجرای destructive reset روی تغییرهای محلی ممنوع است.
- تغییر فاز فعال بدون به‌روزرسانی `STATUS.md` ممنوع است.
- ذخیره secret واقعی در repository ممنوع است.
