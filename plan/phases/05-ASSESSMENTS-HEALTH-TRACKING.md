# Phase 05 — Assessments & Health Tracking

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `B`
- پیش‌نیاز: `Phase 04 DONE` برای اتصال بالینی کامل
- خروجی اصلی: ارزیابی versioned، نتیجه deterministic و پایش سلامت

## مدل‌های داده

- `AssessmentDefinition`
- `AssessmentVersion`
- `AssessmentQuestion`
- `AssessmentOption`
- `AssessmentSubmission`
- `AssessmentAnswer`
- `AssessmentResult`
- `HealthObservation`
- `MezajResult`

## Taskها

- [ ] `F05-T01` — استخراج assessment typeها و سؤال‌های واقعی از UI/Product
- [ ] `F05-T02` — تعریف lifecycle draft/published/retired و versioning
- [ ] `F05-T03` — migration assessment definitions/submissions
- [ ] `F05-T04` — admin create/edit/publish assessment
- [ ] `F05-T05` — patient start/save/submit assessment
- [ ] `F05-T06` — scoring engine deterministic و result snapshot
- [ ] `F05-T07` — health observation write/query
- [ ] `F05-T08` — mezaj result و ارتباط با assessment version
- [ ] `F05-T09` — clinician/admin review endpoints
- [ ] `F05-T10` — index و time-series query برای trackerها
- [ ] `F05-T11` — API/client و اتصال assessment/mezaj/tracker در app
- [ ] `F05-T12` — اتصال assessments/health tracking در dashboard
- [ ] `F05-T13` — حذف mockهای assessment و charts مربوطه
- [ ] `F05-T14` — versioning، scoring و authorization tests
- [ ] `F05-T15` — evidence و review

## قواعد دامنه

- submission به AssessmentVersion ثابت متصل است.
- انتشار نسخه جدید نتیجه قبلی را تغییر نمی‌دهد.
- result شامل snapshot ورودی‌ها و نسخه الگوریتم است.
- draft assessment برای بیمار قابل مشاهده نیست.
- AI بخشی از scoring authoritative این فاز نیست.
- metric، unit و measuredAt در observation اجباری‌اند.
- مقادیر خارج از range تعریف‌شده reject یا flag می‌شوند.

## تست‌های اجباری

- version publication
- submission روی نسخه قدیمی و جدید
- deterministic scoring
- duplicate submit/idempotency
- patient ownership
- clinician review permission
- tracker range query و index

## معیار خروج

- ادمین ارزیابی را version و publish می‌کند.
- بیمار آن را تکمیل و نتیجه ثابت دریافت می‌کند.
- health trackerها persist و query می‌شوند.
- app و dashboard از منبع داده مشترک استفاده می‌کنند.
