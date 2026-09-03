# Phase 06 — Encounter & Clinical Workspace

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `C — هسته درمان`
- پیش‌نیاز: `Phase 05 DONE`
- خروجی اصلی: ویزیت از نوبت معتبر شروع می‌شود و پرونده بالینی کنترل‌شده در dashboard/app دیده می‌شود.

## محدوده UI

- app: `/appointments/summary`، `/profile/history`، `/profile/health-record`
- dashboard: patient workspace شامل overview، medical، history، appointments، assessments، traditional و timeline
- Dashboard Home: encounterهای شروع/تکمیل‌شده و نرخ بازگشت فقط پس از تعریف معتبر

## مدل‌ها

- `Encounter`
- `ClinicalNote` و `ClinicalNoteRevision`
- `Diagnosis`
- `AllergyRecord`
- `ConditionRecord`
- `MedicationStatement`
- `PatientAccessAudit`

## Taskها

- [x] `F06-T01` — policy حقوقی retention، patient visibility، sign و amendment
- [x] `F06-T02` — قرارداد تبدیل intake self-reported به clinical record reviewed
- [x] `F06-T03` — migration encounter/clinical core/audit
- [x] `F06-T04` — start/complete encounter از appointment معتبر
- [x] `F06-T05` — note revision با optimistic concurrency و private clinician note
- [x] `F06-T06` — diagnosis/allergy/condition/medication reconciliation
- [x] `F06-T07` — timeline، history و summary مجاز بیمار
- [x] `F06-T08` — resource-level authorization و audit read/write/export
- [ ] `F06-T09` — اتصال workspace dashboard و حذف placeholderهای scope
- [ ] `F06-T10` — اتصال summary/history/health-record در app
- [ ] `F06-T11` — OpenAPI/client، security، revision و browser E2E
- [ ] `F06-T12` — evidence

## قواعد و معیار خروج

- Appointment و Encounter جدا هستند و encounter تکراری ساخته نمی‌شود.
- self-reported intake خودکار clinical fact نمی‌شود.
- بیمار private note یا داده غیرمجاز را نمی‌بیند.
- doctor/admin بودن جایگزین resource permission نیست.
- محتوای پزشکی و PII در log عملیاتی ثبت نمی‌شود.
- پزشک ویزیت را کامل می‌کند و بیمار خلاصه مجاز همان ویزیت را می‌بیند.
