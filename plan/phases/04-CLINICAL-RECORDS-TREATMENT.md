# Phase 04 — Clinical Records & Treatment

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `B`
- پیش‌نیاز: `Phase 03 DONE`
- خروجی اصلی: encounter، پرونده، نسخه و برنامه درمان واقعی

## مدل‌های داده

- `Encounter`
- `ClinicalNote`
- `ClinicalNoteRevision`
- `Diagnosis`
- `Prescription`
- `PrescriptionItem`
- `PrescriptionRevision`
- `TreatmentPlan`
- `TreatmentMedication`
- `ExercisePlan`
- `NutritionPlan`
- `MedicalFile`
- `PatientAccessAudit`

## Taskها

- [ ] `F04-T01` — تعیین policy حقوقی/محصولی retention، sign و amendment
- [ ] `F04-T02` — مدل encounter و ارتباط با appointment
- [ ] `F04-T03` — migration clinical core
- [ ] `F04-T04` — clinical note با revision و optimistic concurrency
- [ ] `F04-T05` — diagnosis و patient medical timeline
- [ ] `F04-T06` — prescription draft/issue/revision lifecycle
- [ ] `F04-T07` — treatment، medication، exercise و nutrition plans
- [ ] `F04-T08` — resource-level authorization رابطه پزشک/بیمار
- [ ] `F04-T09` — audit خواندن و نوشتن داده پزشکی
- [ ] `F04-T10` — Object Storage، presigned upload و metadata
- [ ] `F04-T11` — file validation، private download و audit
- [ ] `F04-T12` — API/client و اتصال treatment/profile pages در app
- [ ] `F04-T13` — اتصال prescriptions و patient workspace در dashboard
- [ ] `F04-T14` — حذف mockهای clinical مربوطه
- [ ] `F04-T15` — security، revision و authorization tests
- [ ] `F04-T16` — backup/restore drill داده و فایل
- [ ] `F04-T17` — evidence و review

## قواعد دامنه

- Appointment و Encounter موجودیت‌های جدا هستند.
- Encounter فقط برای تعامل درمانی واقعی ایجاد می‌شود.
- نسخه صادرشده mutable نیست.
- اصلاح نسخه با revision/amendment است.
- update هم‌زمان clinical note با version conflict رد می‌شود.
- تمام read/writeهای حساس audit می‌شوند.
- doctor role به‌تنهایی مجوز تمام پرونده‌ها نیست.
- binary فایل در PostgreSQL ذخیره نمی‌شود.

## تست‌های اجباری

- create encounter از appointment معتبر
- جلوگیری از encounter نامعتبر/تکراری
- clinical note optimistic concurrency
- prescription immutability
- amendment history
- doctor-patient resource policy
- admin/staff محدودیت دسترسی
- private file access و expiry
- audit read/write/export
- عدم ثبت محتوای پزشکی در log

## معیار خروج

- پزشک ویزیت را شروع و تکمیل می‌کند.
- یادداشت و تشخیص ثبت می‌شود.
- نسخه و برنامه درمان صادر می‌شود.
- بیمار همان اطلاعات مجاز را در app می‌بیند.
- history و revision قابل بازیابی است.
- backup و restore تست شده است.
