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
- [x] `F02-T02` — migration و constraintهای profile، medical intake و consent
- [x] `F02-T03` — هسته domain/access بیمار: completeness، canonicalization، errorها، audit port و permissionها
- [x] `F02-T04` — آماده‌سازی فرم‌های canonical onboarding، consent و profile در app بدون اتصال موقت دستی به API
- [x] `F02-T05` — API self-profile و onboarding status
- [x] `F02-T06` — API consent، draft/resume/complete medical intake و revision conflict
- [x] `F02-T07` — API کامل admin بیمار: list/search/create/detail/update/intake correction/summary
- [x] `F02-T08` — OpenAPI/client و اتصال onboarding/profile/medical در app همراه حذف mock همان scope
- [x] `F02-T09` — اتصال patients list/detail و overview/medical در dashboard همراه حذف mock همان scope
- [x] `F02-T10` — اتصال widgetهای بیمار Dashboard Home و مخفی‌کردن widget فاقد منبع واقعی
- [x] `F02-T11` — verification دیتابیس: fresh migration، upgrade Phase 01، constraintها و seed idempotency
- [x] `F02-T12` — verification امنیت/API: ownership، ADMIN-only، audit، race/idempotency و contract regression
- [ ] `F02-T13` — browser E2E، mock audit، full build/typecheck و evidence نهایی فاز

## Batch map اجرایی

عدد سه سقف اجرای موازی است. Agent اصلی پیش از هر batch مسیرهای دقیق را در `STATUS.md` claim
می‌کند و پس از handoff همه laneها، combined diff و تست یکپارچه را review می‌کند. تا پایان این gate
هیچ taskی تیک نمی‌خورد.

### `F02-B01` — migration انحصاری در حال اجرا

- Taskها: `F02-T02`
- پیش‌نیاز: `F02-T01`
- مالک انحصاری: Agent اصلی برای `schema.prisma`، migrationها، seed و migration tests
- دلیل تک‌تسکی بودن: تغییر schema و upgrade path قابل تقسیم امن میان چند writer نیست.
- gate خروج: validate/generate، DB خالی، upgrade از Phase 01 و seed idempotency پاس شوند.

### `F02-B02` — آماده‌سازی دو lane مستقل

- Taskها: `F02-T03` و `F02-T04`
- پیش‌نیاز: `F02-T02`
- lane API domain: فقط domain/application shared بیمار و تست‌های واحد؛ بدون controller، Prisma، module wiring یا generated client
- lane app forms: فقط feature/routes onboarding و profile؛ بدون fetch ساختگی یا type دستی API
- gate خروج: domain rules تست شده، فرم‌ها typecheck شده و هیچ medical payload پیش از consent persist نشود.

### `F02-B03` — سه API lane

- Taskها: `F02-T05`، `F02-T06` و `F02-T07`
- پیش‌نیاز: `F02-T03`
- owned scopeها به‌ترتیب: `self-profile`، `intake/consent` و `admin` زیر ماژول patients
- Agentها `app.module.ts`، wiring مشترک patients، Prisma و generated client را تغییر نمی‌دهند.
- Agent اصلی wiring، API integration test، OpenAPI export و client generation را پس از ادغام انجام می‌دهد.
- gate خروج: build/test API، authorization/audit و تطبیق OpenAPI با قرارداد v1 پاس شوند.

### `F02-B04` — سه رابط مستقل

- Taskها: `F02-T08`، `F02-T09` و `F02-T10`
- پیش‌نیاز: `F02-T05` تا `F02-T07` و generated client freeze‌شده
- owned scopeها: app onboarding/profile، dashboard patients و Dashboard Home
- هیچ lane رابطی `openapi.json`، `schema.generated.ts` یا API type دستی ایجاد نمی‌کند.
- gate خروج: app/dashboard typecheck و build، stateهای loading/error/unauthorized و حذف mock همان scope تأیید شوند.

### `F02-B05` — سه verification lane

- Taskها: `F02-T11`، `F02-T12` و `F02-T13`
- پیش‌نیاز: `F02-T08` تا `F02-T10`
- laneها به‌ترتیب integrity دیتابیس، security/API review و browser E2E/mock audit هستند.
- verifier finding را گزارش می‌کند و production code lane دیگر را بدون reassignment اصلاح نمی‌کند.
- gate خروج: full test/typecheck/build، migration smoke، browser E2E و نبود finding بحرانی باز.

در کل Phase 02 فقط Agent اصلی مالک `schema.prisma`، migrationها، generated Prisma Client، wiring
نهایی moduleها، `packages/api-client/openapi.json` و `schema.generated.ts` است.

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
