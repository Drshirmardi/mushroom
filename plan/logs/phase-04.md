# لاگ اجرایی Phase 04

## F04-T01 — clinic directory and availability contract

Task ID: F04-T01
Completed at: 2026-09-01 01:52 +03:30
Agent/Thread: Codex /root/f04_t01_contract
Batch ID: F04-B01
Reviewed by: Codex /root
Changed files:
  - `plan/contracts/clinic-directory-availability-v1.md`
  - `plan/phases/04-CLINIC-DIRECTORY-AVAILABILITY.md`
  - `plan/STATUS.md`
  - `plan/logs/phase-04.md`
  - `specs/002-adopt-phase-04/tasks.md`
Migrations:
  - ندارد
Tests run:
  - `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` → PASS
  - Spec Kit requirements checklist → PASS (`16/16`)
  - required contract-topic coverage check → PASS
  - Markdown fence and unresolved-placeholder checks → PASS
  - owned-path and combined-diff review → PASS
  - `git diff --check` → PASS
Result:
  - فیلد، ownership، lifecycle و validation همه مفاهیم directory و availability فاز ۰۴ freeze شد → PASS
  - visit modeهای `IN_PERSON | ONLINE`، duration و buffer دقیقه‌ای و قیمت integer با currency صریح `IRR` بدون ابهام تعریف شد → PASS
  - clinic-local recurring time، UTC instant، precedence exceptionها و slot transient به‌صورت deterministic تعریف شد → PASS
  - capability و response visibility ادمین/بیمار، pagination، filter، error پایدار، permission و audit قابل پیاده‌سازی تعریف شد → PASS
  - appointment، hold، double-booking، payment و سایر مسئولیت‌های Phase 05 صریحاً خارج از قرارداد ماندند → PASS
  - هیچ implementation، migration، OpenAPI، Phase 03 یا roadmap task دیگری تغییر نکرد → PASS
Known limitations:
  - patient-facing read در v1 با نقش authenticated `PATIENT` و clinic مشتق‌شده از `PatientProfile` تعریف شده است؛ anonymous directory خارج از scope فعلی است.
  - currency در v1 فقط `IRR` است و rating/review/session metric تا ایجاد source of truth نمایش داده نمی‌شود.
Next batch:
  - `F04-T02` واجد شرایط است، اما claim نشده است.
