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

- [ ] `Phase 00` — Foundation — `IN_PROGRESS`
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
- [x] `F00-T02` — تنظیم اسکریپت‌ها و اتصال به workspace/Turborepo
- [x] `F00-T03` — راه‌اندازی config و validation متغیرهای محیطی
- [x] `F00-T04` — راه‌اندازی PostgreSQL و Docker Compose توسعه
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
Task ID: —
Agent/Thread: —
Started at: —
Scope: —
Expected files: —
```

## شواهد آخرین تکمیل

Task ID: F00-T04
Completed at: 2026-08-20 12:58 +03:30
Agent/Thread: /root
Changed files:
  - compose.yaml
  - apps/api/.env.example
  - plan/phases/00-FOUNDATION.md
  - plan/STATUS.md
Migrations:
  - ندارد (خارج از scope؛ F00-T05)
Tests run:
  - docker compose config → PASS
  - docker compose up -d --wait --wait-timeout 60 postgres → PASS
  - docker compose exec -T postgres pg_isready -U sabz_zendegi -d sabz_zendegi → PASS
  - docker compose exec -T postgres psql ... "SELECT current_database(), current_user" → PASS (`sabz_zendegi|sabz_zendegi`)
  - git diff --check → PASS
Result:
  - PostgreSQL 16 توسعه روی localhost:5432 با volume پایدار و healthcheck اجرا می‌شود → PASS
  - متغیرهای Compose و DATABASE_URL نمونه با یکدیگر هم‌راستا هستند → PASS
Known limitations:
  - container توسعه برای استفادهٔ محلی در حال اجرا باقی مانده است؛ migration و schema عمداً به F00-T05 موکول شده‌اند.
Next task:
  - F00-T05

Task ID: F00-T03
Completed at: 2026-08-20 12:49 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/package.json
  - apps/api/.env.example
  - apps/api/src/app.module.ts
  - apps/api/src/config/environment.validation.ts
  - apps/api/src/main.ts
  - pnpm-lock.yaml
  - plan/phases/00-FOUNDATION.md
  - plan/STATUS.md
Migrations:
  - ندارد (خارج از scope؛ F00-T05)
Tests run:
  - pnpm --filter @sabz-zendegi/api typecheck → PASS
  - pnpm --filter @sabz-zendegi/api build → PASS
  - اجرای API با DATABASE_URL و JWT_ACCESS_SECRET معتبر → PASS (Nest bootstrap)
  - اجرای API بدون DATABASE_URL → PASS (رد با `Config validation error`)
  - git diff --check → PASS
Result:
  - متغیرهای NODE_ENV، PORT، DATABASE_URL، APP_ORIGINS، LOG_LEVEL و JWT_ACCESS_SECRET قبل از bootstrap اعتبارسنجی می‌شوند → PASS
  - template فاقد secret واقعی و مسیرهای .env ریشه/API پشتیبانی می‌شوند → PASS
  - ConfigService مقدار PORT معتبرشده را برای listener استفاده می‌کند → PASS
Known limitations:
  - DATABASE_URL در این task صرفاً validate می‌شود؛ اتصال و readiness دیتابیس در F00-T05 و F00-T09 پیاده‌سازی می‌شود.
Next task:
  - F00-T04

Task ID: F00-T02
Completed at: 2026-08-20 12:39 +03:30
Agent/Thread: /root
Changed files:
  - package.json
  - turbo.json
  - apps/api/package.json
  - apps/app/package.json
  - plan/phases/00-FOUNDATION.md
  - plan/STATUS.md
Migrations:
  - ندارد (خارج از scope؛ F00-T05)
Tests run:
  - pnpm typecheck → PASS (۴ workspace: api, app, dashboard, web)
  - pnpm --filter @sabz-zendegi/api build → PASS
  - git diff --check → PASS
Result:
  - command ریشه `pnpm typecheck` تمام workspaceها را از طریق Turbo اجرا می‌کند → PASS
  - API script استاندارد `dev` برای اجرای `pnpm dev` و دستور محدودشدهٔ `pnpm dev:api` دارد → PASS
  - taskهای lint و typecheck در Turbo فاقد وابستگی نادرست به build هستند و خروجی cacheable تولید نمی‌کنند → PASS
Known limitations:
  - اجرای lint سراسری هنوز به تعریف lint واقعی برای همهٔ appها نیاز دارد و در F00-T13 همراه CI بررسی می‌شود.
Next task:
  - F00-T03

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
  - وابستگی‌های NestJS در F00-T03 به 11.1.8 به‌روزرسانی شدند؛ نسخهٔ 11.1.6 در نصب مجدد به فایل runtime `abstract.interface.js` مفقود اشاره می‌کرد و 11.1.8 با bootstrap تأیید شد.
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
