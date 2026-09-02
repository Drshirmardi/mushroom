# وضعیت زنده اجرای پروژه

> این فایل فقط وضعیت فعلی، ownership، blocker و handoff کوتاه را نگه می‌دارد. شواهد taskهای
> تکمیل‌شده در [`logs/`](logs/README.md) ثبت می‌شوند؛ checklist کامل هر فاز نیز در فایل همان
> فاز منبع حقیقت است.

## وضعیت کلی

- آخرین به‌رورسانی: `2026-09-02 19:29 +03:30`
- Milestone فعال: `Milestone B — کلینیک قابل رزرو`
- فاز فعال: `Phase 05 — Appointment Booking & Dashboard Operations`
- وضعیت فاز فعال: `IN_PROGRESS`
- batch فعال: ندارد
- task فعال: ندارد
- blocker فعال: ندارد

## پیشرفت کلان

- [x] Monorepo با pnpm workspace و Turborepo ایجاد شده است.
- [x] سایت عمومی `apps/web` پیاده‌سازی ظاهری شده است.
- [x] اپ کاربر `apps/app` پیاده‌سازی ظاهری و mock شده است.
- [x] داشبورد `apps/dashboard` پیاده‌سازی ظاهری و mock شده است.
- [x] بک‌اند NestJS پایه ایجاد شده است.
- [x] PostgreSQL و migration پایه ایجاد شده‌اند.
- [x] احراز هویت واقعی جایگزین mock شده است.
- [x] onboarding پزشکی و consent واقعی شده‌اند.
- [x] آزمون اصلی و eligibility قابل تنظیم واقعی شده‌اند.
- [ ] اولین جریان end-to-end رزرو نوبت کامل شده است.
- [ ] اطلاعات بالینی واقعی شده‌اند.
- [ ] فروشگاه و پرداخت واقعی شده‌اند.
- [ ] چت واقعی شده است.
- [ ] production readiness تأیید شده است.

## وضعیت فازها

- [x] `Phase 00` — Foundation — `DONE` — checklist: [`phases/00-FOUNDATION.md`](phases/00-FOUNDATION.md)
- [x] `Phase 01` — Identity & Access — `DONE` — checklist: [`phases/01-IDENTITY-ACCESS.md`](phases/01-IDENTITY-ACCESS.md)
- [x] `Phase 02` — Patient Onboarding & Consent — `DONE`
- [x] `Phase 03` — Assessment Engine & Booking Eligibility — `DONE`
- [x] `Phase 04` — Clinic, Doctors, Services & Availability — `DONE (CLOSED)`
- [ ] `Phase 05` — Appointment Booking & Dashboard Operations — `IN_PROGRESS`
- [ ] `Phase 06` — Encounter & Clinical Workspace — `NOT_STARTED`
- [ ] `Phase 07` — Prescription & Treatment — `NOT_STARTED`
- [ ] `Phase 08` — Follow-up, Health Tracking, Notifications & Content — `NOT_STARTED`
- [ ] `Phase 09` — Commerce, Inventory & Payments — `NOT_STARTED`
- [ ] `Phase 10` — Chat & Online Consultation — `NOT_STARTED`
- [ ] `Phase 11` — Dashboard Reporting & Access Expansion — `NOT_STARTED`
- [ ] `Phase 12` — Production Hardening — `NOT_STARTED`
- [ ] `Deferred` — AI, Bots & Advanced Automation — خارج از roadmap اجرایی فعلی

## handoff فاز فعال

- فاز قبلی: `Phase 01 — Identity & Access` پس از Bugbot و Security Review مستقل بدون یافته باز تکمیل شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- regression مسیر dev API که metadata تزریق وابستگی Nest را حذف می‌کرد در `F01-R01` اصلاح شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- هدر وب برای session معتبر دکمه داشبورد نمایش می‌دهد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- تشخیص LAN: CORS و API سالم‌اند؛ session cookie بین `localhost` و IP شبکه مشترک نیست؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- رابط‌های app، dashboard و web در صورت معطل‌ماندن refresh حداکثر پس از ۱۰ ثانیه از حالت checking خارج می‌شوند؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- build dashboard دیگر فایل cache موقت `.next/dev` را typecheck نمی‌کند؛ build کامل workspace پاس شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- اجرای production هر چهار سرویس با `pnpm start` ممکن است و رابط‌ها روی شبکه bind می‌شوند؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- runtime API و Prisma Client با CommonJS صریح هم‌راستا شدند؛ اجرای واقعی API روی پورت ۳۰۰۳ تأیید شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- roadmap از Phase 02 به بعد بر اساس app + dashboard + API بازطراحی شد؛ تصمیم: [`ADR-0002`](decisions/ADR-0002-feature-first-roadmap.md).
- آزمون اصلی و booking eligibility به پیش از scheduling منتقل شدند؛ الزام آزمون از dashboard قابل خاموش/روشن‌کردن است.
- Dashboard Home تدریجی است و widget فاقد منبع داده واقعی پنهان می‌شود؛ عدد mock/صفر ساختگی مجاز نیست.
- قرارداد onboarding v1 در `F02-T01` پس از سه review مستقل freeze شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- workflow از این نقطه batch-based است: حداکثر سه task مستقل توسط subagentها اجرا و فقط پس از review یکپارچه Agent اصلی تیک می‌خورند.
- `F02-B01` با تکمیل و review مستقل `F02-T02` بسته شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B02` با review و verification یکپارچه بسته شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B03` با review مستقل و verification یکپارچه بسته شد؛ endpointهای self-profile، consent/intake و admin patient همراه OpenAPI freeze شدند؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B04` با review مستقل و verification کامل app/dashboard/API بسته شد؛ UIها فقط از generated client استفاده می‌کنند و mockهای همان scope حذف شده‌اند؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B05` با تأیید دستی جریان واقعی، رفع blocker مرورگر، mock audit و گیت کامل بسته شد؛ `F02-T13` پذیرفته شد.
- `F03-T01` تا `F03-T08` مطابق checklist فاز تکمیل شده‌اند؛ شواهد بازسازی‌شده `F03-T03` تا `F03-T06` و verification جدید در [`logs/phase-03.md`](logs/phase-03.md) ثبت شد.
- dependency: `Phase 02` → DONE.

## وضعیت taskهای فاز فعال

- `F05-T01` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T02` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T03` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T04` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T05` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T06` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T07` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T08` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T09` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T10` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T11` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T12` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)

### وضعیت تاریخی Phase 04

- `F04-T01` — `DONE`
- `F04-T02` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T03` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T04` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T05` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T06` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T07` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T08` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T09` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T10` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T11` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T12` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md)

## آخرین batch بسته‌شده

`F05-B12` — `DONE`

- `F05-T12` پذیرفته شد: PostgreSQL واقعی ۱۰۰ درخواست هم‌زمان را با دقیقاً یک رزرو موفق و
  ۹۹ conflict پایدار کنترل می‌کند؛ idempotency، authorization و transitionهای تکراری نیز
  regression-tested هستند؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T13`؛ هنوز claim نشده است.

`F05-B11` — `DONE`

- `F05-T11` پذیرفته شد: runtime OpenAPI و generated client تمام endpointهای Phase 05 را پوشش
  می‌دهند و fixture appointment و badgeهای عملیاتی ساختگی حذف شدند؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T12`؛ هنوز claim نشده است.

`F05-B10` — `DONE`

- `F05-T10` پذیرفته شد: Dashboard Home V1 فقط KPI و برنامهٔ امروز clinic-local و activity
  واقعی رزرو را نمایش می‌دهد؛ widgetهای بیمار و assessment نیز فقط منابع زندهٔ پیشین دارند.
  integration PostgreSQL، typecheck و test dashboard پاس شدند؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T11`؛ هنوز claim نشده است. OpenAPI/generated client فقط در همین
  task هماهنگ خواهد شد.

`F05-B09` — `DONE`

- `F05-T09` پس از typecheck/build dashboard و integration واقعی PostgreSQL برای list و queue
  مرتب‌شده پذیرفته شد؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T10`؛ هنوز claim نشده است.
- هماهنگ‌سازی generated OpenAPI client عمداً در مالک آن، `F05-T11`، باقی مانده است؛ بنابراین
  `test/openapi-contract.spec.ts` تا آن task runtime document را با client checked-in ناسازگار گزارش می‌کند.

`F05-B01` بسته شد: `F05-T01` پس از review قرارداد lifecycle، cancellation/reschedule و price
snapshot پذیرفته شد؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).

`F04-B08` بدون تغییر implementation بسته شد: generated client مانع `F04-T08` و `F04-T09` بود. با authorization صریح مالک، `F04-B10` فقط prerequisite slice از `F04-T10` را اجرا و review کرد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B08-R1` برای `F04-T08` پس از dashboard verification و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B09` برای patient doctor detail، انتخاب doctor/service و availability مشتق‌شده پس از review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B10-R1` برای completion نهایی `F04-T10` پس از migration/seed smoke، contract drift و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B11` پس از review coordinator و گیت واقعی PostgreSQL/API/browser بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B12` پس از migration/seed smoke، full API suite، frontend/client verification، evidence reconciliation و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md).

`F04-CLOSE` با independent review بسته شد: تمام taskها، migration/seed، OpenAPI/generated client، تست‌های نهایی، browser evidence، mock boundary و Spec Kit consistency پذیرفته شدند؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md).

`Phase 04` اکنون `DONE (CLOSED)` است. `F05-B01` تا `F05-B03` پس از review بسته شدند؛ شواهد:
[`logs/phase-05.md`](logs/phase-05.md). `F05-T04` در batch جاری claim شده است.

## Blockerها و تصمیم‌های باز

- [ ] متن و الزامات حقوقی consent/retention پیش از release عمومی Phase 02؛ مدل versioned consent در خود Phase 02 اجباری است.
- [ ] تعیین سرویس SMS/OTP پیش از فعال‌سازی کانال پیامکی در `Phase 08`؛ in-app notification مستقل است.
- [ ] تعیین درگاه پرداخت و قرارداد webhook/تسویه پیش از شروع `Phase 09`.
- [ ] تعیین provider و policy ویدئو پیش از قابلیت ویدئویی `Phase 10`؛ chat متنی می‌تواند مستقل اجرا شود.
- [ ] تعیین deployment provider، RPO/RTO و secret manager در release planning فاز `Phase 12`.

## یادداشت وضعیت repository در زمان ایجاد این برنامه

- فایل `apps/app/src/components/home/slider-data.ts` دارای تغییر محلی از قبل بوده و متعلق به این برنامه نیست.
- فایل `justforcheck.md` untracked و منبع تحقیق معماری کاربر است.
- Agentها نباید این دو مورد را بدون درخواست صریح کاربر تغییر، حذف یا reset کنند.
