# Phase 03 — Assessment Engine & Booking Eligibility

- وضعیت: `IN_PROGRESS`
- Milestone: `A — بیمار آماده رزرو`
- پیش‌نیاز: `Phase 02 DONE`
- خروجی اصلی: آزمون اصلی versioned در داشبورد ساخته می‌شود و الزام آن پیش از رزرو قابل تنظیم است.

## محدوده UI

### apps/app

- `/assessment`
- `/assessment/[type]`
- `/assessment/result`
- route gate رزرو با CTA مرحله بعد

### apps/dashboard

- `/assessments`: list، builder، publish/archive، results
- `/patients/[id]`: نتایج assessment
- Dashboard Home: تکمیل/در انتظار آزمون و activity واقعی

## مدل‌های داده

- `AssessmentVersion` با definition/question/option و result-band به‌صورت snapshot ساختاری immutable
- `PatientAssessmentSubmission` با answer/result snapshot نسخه دقیق
- `BookingEligibilityPolicy` برای الزام، اعتبار زمانی و latest-version

## Taskها

- [x] `F03-T01` — قرارداد lifecycle، question types، scoring و policy رزرو؛ منبع: [`../contracts/assessment-booking-v1.md`](../contracts/assessment-booking-v1.md)
- [x] `F03-T02` — migration definition/version/question/submission/result/policy
- [x] `F03-T03` — admin assessment CRUD draft، preview، duplicate، publish و archive
- [x] `F03-T04` — تعیین main assessment و toggle الزام قبل از رزرو در transaction
- [x] `F03-T05` — patient list/start/save/resume/submit/result API
- [x] `F03-T06` — scoring deterministic، result snapshot و risk/review flag
- [x] `F03-T07` — booking eligibility service و endpoint دارای blocker code/nextAction
- [x] `F03-T08` — admin submissions/results/filter و اتصال به patient workspace
- [x] `F03-T09` — اتصال کامل builder/list/results در dashboard
- [x] `F03-T10` — اتصال assessment flow و route gate در app
- [x] `F03-T11` — widget/activity آزمون در Dashboard Home
- [x] `F03-T12` — versioning، idempotency، authorization، toggle matrix و browser E2E
- [ ] `F03-T13` — حذف mock assessment در scope و evidence Milestone A

## Endpointهای حداقلی

```text
GET  /v1/patients/me/booking-eligibility
GET  /v1/assessments
GET  /v1/assessments/main
POST /v1/assessments/:definitionId/submissions
PUT  /v1/assessment-submissions/:id
POST /v1/assessment-submissions/:id/submit
GET  /v1/assessment-submissions/:id/result

GET   /v1/admin/assessments
POST  /v1/admin/assessments
PATCH /v1/admin/assessments/:id
POST  /v1/admin/assessments/:id/publish
POST  /v1/admin/assessments/:id/archive
GET   /v1/admin/assessment-submissions
PATCH /v1/admin/clinic/patient-policy
```

## قواعد دامنه

- published version immutable است؛ ویرایش، نسخه جدید می‌سازد.
- فقط assessment منتشرشده main می‌شود.
- فعال‌کردن requirement بدون main assessment دارای نسخه منتشرشده رد می‌شود.
- requirement روی policy است، نه روی تعریف آزمون.
- submit نسخه معتبر شرط رزرو است؛ score شرط قبولی رزرو نیست.
- خاموش‌کردن requirement داده تاریخی را حذف نمی‌کند.
- پیش‌فرض: `validityDays=null` و `requireLatestPublishedVersion=false`.
- انتشار نسخه جدید بیماران قبلی را ناگهانی block نمی‌کند مگر policy صریح تغییر کند.
- eligibility blockerهای پایدار دارد: `PROFILE_INCOMPLETE`، `MAIN_ASSESSMENT_REQUIRED`،
  `ASSESSMENT_EXPIRED` و `LATEST_VERSION_REQUIRED`.

## تست و معیار خروج

- admin آزمون را از صفر ساخته و publish می‌کند.
- patient draft را save/resume و دقیقاً یک‌بار submit می‌کند.
- toggle خاموش، بیمار با پرونده کامل را فوراً eligible می‌کند.
- toggle روشن، submit نسخه معتبر را لازم می‌کند.
- direct API request نمی‌تواند gate را دور بزند.
- دو browser E2E اجباری و اختیاری پاس می‌شوند.
- app و dashboard نتیجه یک نسخه ثابت را نشان می‌دهند.
