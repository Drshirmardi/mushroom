# لاگ‌های اجرایی فازها

هر فایل این پوشه شواهد تکمیل taskهای یک فاز را به‌ترتیب زمانی نگه می‌دارد. این فایل‌ها
immutable تاریخی نیستند، اما entry تکمیل‌شده نباید بازنویسی شود مگر برای اصلاح خطای
مستندشده یا ثبت نتیجهٔ verification جدید.

## نام‌گذاری

```text
phase-00.md
phase-01.md
...
```

## قالب entry

```text
## Fxx-Tyy — عنوان task

Task ID: Fxx-Tyy
Completed at: YYYY-MM-DD HH:mm TZ
Agent/Thread: شناسه قابل تشخیص
Batch ID: Fxx-Bnn
Reviewed by: Codex /root
Changed files:
  - مسیر
Migrations:
  - ندارد | نام migration و نتیجه
Tests run:
  - command یا verification → PASS/FAIL
Result:
  - acceptance criterion → PASS
Known limitations:
  - ندارد | مورد مشخص و مالک/Task پیگیری
Next batch:
  - Fxx-Bnn | Phase review
```

`STATUS.md` محل نگهداری این entryها نیست. worker فقط handoff می‌دهد و این فایل را تغییر
نمی‌دهد. پس از عبور batch از review gate، Agent اصلی entry taskهای پذیرفته‌شده را به لاگ همان
فاز append می‌کند، checklist را به‌روز می‌کند و در `STATUS.md` فقط claim را پاک و Batch بعدی
واجد شرایط را ثبت می‌کند.
