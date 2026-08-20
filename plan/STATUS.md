# وضعیت زنده اجرای پروژه

> این فایل باید بعد از هر task تکمیل‌شده یا تغییر وضعیت به‌روزرسانی شود. تیک فقط زمانی زده می‌شود که کد، تست و شواهد لازم وجود داشته باشد.

## وضعیت کلی

- آخرین به‌روزرسانی: `2026-08-20`
- Milestone فعال: `Milestone A — اولین نسخه عملیاتی کلینیک`
- فاز فعال: `Phase 00 — Foundation`
- وضعیت فاز فعال: `IN_PROGRESS`
- task فعال: `ندارد`
- مسئول/Agent: `تعیین نشده`
- blocker فعال: `ندارد`

## خلاصه پیشرفت

- [x] Monorepo با pnpm workspace و Turborepo ایجاد شده است.
- [x] سایت عمومی `apps/web` پیاده‌سازی ظاهری شده است.
- [x] اپ کاربر `apps/app` پیاده‌سازی ظاهری و mock شده است.
- [x] داشبورد `apps/dashboard` پیاده‌سازی ظاهری و mock شده است.
- [ ] بک‌اند NestJS واقعی ایجاد شده است.
- [ ] PostgreSQL و migrationها ایجاد شده‌اند.
- [ ] احراز هویت واقعی جایگزین mock شده است.
- [ ] اولین جریان end-to-end رزرو نوبت کامل شده است.
- [ ] اطلاعات بالینی واقعی شده‌اند.
- [ ] فروشگاه و پرداخت واقعی شده‌اند.
- [ ] چت واقعی شده است.
- [ ] production readiness تأیید شده است.

## وضعیت فازها

- [ ] `Phase 00` — Foundation — `NOT_STARTED`
- [ ] `Phase 01` — Identity & Access — `NOT_STARTED`
- [ ] `Phase 02` — Clinic, Doctors & Patients — `NOT_STARTED`
- [ ] `Phase 03` — Scheduling & Appointments — `NOT_STARTED`
- [ ] `Phase 04` — Clinical Records & Treatment — `NOT_STARTED`
- [ ] `Phase 05` — Assessments & Health Tracking — `NOT_STARTED`
- [ ] `Phase 06` — Notifications, Content & Jobs — `NOT_STARTED`
- [ ] `Phase 07` — Commerce & Payments — `NOT_STARTED`
- [ ] `Phase 08` — Chat & Online Consultation — `NOT_STARTED`
- [ ] `Phase 09` — Reporting, CRM & Automation — `NOT_STARTED`
- [ ] `Phase 10` — AI & Bots — `NOT_STARTED`
- [ ] `Phase 11` — Scale & Production Hardening — `NOT_STARTED`

## taskهای فاز فعال

این بخش باید با checklist فاز فعال هماهنگ بماند.

- [x] `F00-T01` — ایجاد scaffold بک‌اند NestJS در `apps/api`
- [ ] `F00-T02` — تنظیم اسکریپت‌ها و اتصال به workspace/Turborepo
- [ ] `F00-T03` — راه‌اندازی config و validation متغیرهای محیطی
- [ ] `F00-T04` — راه‌اندازی PostgreSQL و Docker Compose توسعه
- [ ] `F00-T05` — راه‌اندازی Prisma و migration اولیه
- [ ] `F00-T06` — تنظیم global prefix، validation، serialization و exception filter
- [ ] `F00-T07` — ایجاد error contract پایدار
- [ ] `F00-T08` — logging، correlation ID و redaction
- [ ] `F00-T09` — health/readiness endpointها
- [ ] `F00-T10` — Swagger/OpenAPI و security schemeهای اولیه
- [ ] `F00-T11` — test harness و integration test با PostgreSQL
- [ ] `F00-T12` — migration smoke test و seed framework
- [ ] `F00-T13` — CI و verification دستورات ریشه
- [ ] `F00-T14` — اصلاح مستندات و دستورهای development
- [ ] `F00-T15` — حذف وابستگی build فونت‌ها به شبکه خارجی
- [ ] `F00-T16` — ثبت شواهد و آماده‌سازی review فاز

## task در حال اجرا

قبل از شروع کار، Agent این بخش را پر می‌کند:

```text
Task ID: F00-T02
Agent/Thread: /root
Started at: 2026-08-20 12:35 +03:30
Scope: تنظیم scriptهای API و ریشه، Turbo taskها و TypeScript config برای اجرای یکنواخت workspace
Expected files: package.json, turbo.json, apps/api/package.json, apps/api/tsconfig.json, apps/api/tsconfig.build.json, plan/STATUS.md, plan/phases/00-FOUNDATION.md
```

## شواهد آخرین تکمیل

Task ID: F00-T01
Completed at: 2026-08-20 12:31 +03:30
Agent/Thread: /root
Changed files:
  - .gitignore
  - apps/api/package.json
  - apps/api/tsconfig.json
  - apps/api/tsconfig.build.json
  - apps/api/src/app.module.ts
  - apps/api/src/main.ts
  - apps/api/README.md
  - pnpm-lock.yaml
  - plan/phases/00-FOUNDATION.md
  - plan/STATUS.md
Migrations:
  - ندارد (خارج از scope؛ F00-T05)
Tests run:
  - pnpm --filter @sabz-zendegi/api typecheck → PASS
  - pnpm --filter @sabz-zendegi/api build → PASS
  - node apps/api/dist/main.js → PASS (Nest/Fastify bootstrap)
  - اجرای موقت روی localhost:3003 و GET / → HTTP 404 مورد انتظار، listener فعال است
Result:
  - NestJS scaffold با FastifyAdapter و AppModule حداقلی → PASS
  - خروجی JavaScript قابل اجرا و پورت پیش‌فرض 3003 → PASS
  - وابستگی‌ها و lockfile workspace ثبت شدند → PASS
Known limitations:
  - Endpoint، config، validation، database و test harness عمداً به taskهای بعدی Phase 00 موکول شده‌اند.
  - نسخه‌های NestJS دقیقاً روی 11.1.6 pin شدند: نسخهٔ 11.2.1 که از range اولیه resolve می‌شد در اجرای واقعی فایل runtime `abstract.interface.js` را نداشت؛ 11.1.6 با bootstrap تأیید شد.
Next task:
  - F00-T02

برای هر task تکمیل‌شده این قالب اضافه شود:

```text
Task ID:
Completed at:
Agent/Thread:
Changed files:
Migrations:
Tests run:
Result:
Known limitations:
Next task:
```

## Blockerها و تصمیم‌های باز

- [ ] تعیین provider نهایی deployment پیش از ورود به production؛ این تصمیم مانع فازهای ۰۰ تا ۰۸ نیست.
- [ ] تعیین درگاه پرداخت و قرارداد webhook پیش از شروع `Phase 07`.
- [ ] تعیین سرویس SMS/OTP پیش از فعال‌سازی OTP یا notification پیامکی در `Phase 06`.
- [ ] تعیین الزامات حقوقی نگهداری پرونده، نسخه و رضایت بیمار پیش از release عمومی `Phase 04`.
- [ ] تعیین provider مشاوره ویدئویی پیش از تکمیل `Phase 08`.

## یادداشت وضعیت repository در زمان ایجاد این برنامه

- فایل `apps/app/src/components/home/slider-data.ts` دارای تغییر محلی از قبل بوده و متعلق به این برنامه نیست.
- فایل `justforcheck.md` untracked و منبع تحقیق معماری کاربر است.
- Agentها نباید این دو مورد را بدون درخواست صریح کاربر تغییر، حذف یا reset کنند.
