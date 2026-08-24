# Phase 02 — Patient Onboarding & Consent

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `A — بیمار آماده رزرو`
- پیش‌نیاز: `Phase 01 DONE`
- خروجی اصلی: بیمار پس از ورود اول پرونده پزشکی اولیه را کامل می‌کند و همان داده در داشبورد قابل کنترل است.

## محدوده UI

### apps/app

- `/onboarding`
- `/profile`
- `/profile/edit`
- `/profile/medical` برای داده‌های self-reported اولیه

### apps/dashboard

- `/patients`
- `/patients/[id]`: overview و medical اولیه
- Dashboard Home: تعداد بیمار جدید و پرونده ناقص/کامل

## مدل‌های داده

- `Clinic` با یک رکورد فعال در MVP
- `UserProfile`
- `PatientProfile`
- `PatientMedicalIntake`
- `PatientMedicalIntakeRevision`
- `ConsentPolicyVersion`
- `PatientConsentRecord`

داده intake شامل تاریخ تولد، جنسیت، قد، وزن، گروه خونی، آلرژی، بیماری مزمن، داروی فعلی و
سبک زندگی self-reported است. این داده خودکار diagnosis یا clinical fact پزشک نمی‌شود.

## Taskها

- [x] `F02-T01` — قرارداد فیلدهای canonical، required fields، consent و مرز self-reported/clinical؛
  منبع پیاده‌سازی: [`../contracts/patient-onboarding-v1.md`](../contracts/patient-onboarding-v1.md)
- [ ] `F02-T02` — migration و constraintهای profile، medical intake و consent
- [ ] `F02-T03` — API وضعیت onboarding و next action
- [ ] `F02-T04` — API ذخیره draft، resume و complete پرونده بیمار
- [ ] `F02-T05` — patient self-profile query/update با ownership
- [ ] `F02-T06` — admin patient list/search/filter/create-on-behalf
- [ ] `F02-T07` — admin patient detail و اصلاح audit‌شده intake
- [ ] `F02-T08` — permissionهای عملیاتی ثابت و محدودکردن dashboard MVP به ADMIN
- [ ] `F02-T09` — OpenAPI/client و اتصال onboarding/profile در app
- [ ] `F02-T10` — اتصال patients و تب‌های overview/medical در dashboard
- [ ] `F02-T11` — اتصال widgetهای بیمار Dashboard Home و حذف widget/mock فاقد منبع
- [ ] `F02-T12` — authorization، audit، migration upgrade و browser E2E
- [ ] `F02-T13` — حذف mockهای profile/onboarding و ثبت evidence

## Endpointهای حداقلی

```text
GET   /v1/patients/me/onboarding-status
GET   /v1/patients/me
PATCH /v1/patients/me
GET   /v1/patients/me/medical-intake
PUT   /v1/patients/me/medical-intake
POST  /v1/patients/me/medical-intake/complete
GET   /v1/patients/me/consent-policy
POST  /v1/patients/me/consents
POST  /v1/patients/me/consents/:consentRecordId/withdraw

GET   /v1/admin/patients
GET   /v1/admin/patients/onboarding-summary
POST  /v1/admin/patients
GET   /v1/admin/patients/:id
PATCH /v1/admin/patients/:id
PATCH /v1/admin/patients/:id/medical-intake
```

## قواعد دامنه

- completeness از required fields محاسبه می‌شود؛ boolean قابل دست‌کاری منبع حقیقت نیست.
- مقدار «ندارم» و «نمی‌دانم» از مقدار خالی متمایز است.
- سن ذخیره نمی‌شود؛ از تاریخ تولد محاسبه می‌شود.
- بدون consent فعال، persist کردن draft پزشکی و complete intake مجاز نیست؛ profile غیرپزشکی مستقل است.
- بیمار ناقص به پروفایل و onboarding دسترسی دارد، ولی booking-ready نیست.
- read/write داده پزشکی و تغییر وضعیت حساب audit می‌شود.
- تب‌های dashboard که هنوز منبع داده ندارند مخفی می‌شوند؛ placeholder ساختگی نمایش داده نمی‌شود.

## تست و معیار خروج

- پس از accept consent و اولین save، refresh و دستگاه دیگر draft onboarding را حفظ می‌کند.
- بیمار به intake بیمار دیگر دسترسی ندارد.
- admin همان داده persist‌شده app را می‌بیند و اصلاحش audit می‌شود.
- migration هم روی DB خالی و هم upgrade از Phase 01 پاس می‌شود.
- مسیر register → onboarding → complete در browser E2E پاس است.
- mockهای scope حذف شده‌اند و Task بعدی `F03-T01` است.
