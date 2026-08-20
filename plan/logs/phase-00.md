# Phase 00 — Foundation: Execution Log

این لاگ شواهد تکمیل Taskهای Phase 00 را نگه می‌دارد. checklist و وضعیت زنده در
[`../phases/00-FOUNDATION.md`](../phases/00-FOUNDATION.md) و
[`../STATUS.md`](../STATUS.md) قرار دارند.

## F00-T01 — scaffold NestJS با Fastify

Task ID: F00-T01
Completed at: 2026-08-20 12:31 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/package.json، tsconfig*.json و src/{main,app}.module.ts
  - apps/api/README.md
  - pnpm-lock.yaml
  - plan/phases/00-FOUNDATION.md و plan/STATUS.md
Migrations:
  - ندارد (خارج از scope؛ F00-T05)
Tests run:
  - pnpm --filter @sabz-zendegi/api typecheck → PASS
  - pnpm --filter @sabz-zendegi/api build → PASS
  - node apps/api/dist/main.js و HTTP روی localhost:3003 → PASS
Result:
  - NestJS با FastifyAdapter و AppModule حداقلی روی پورت 3003 اجرا شد → PASS
Known limitations:
  - endpoint، config، database و test harness به Taskهای بعدی موکول شدند.
Next task:
  - F00-T02

## F00-T02 — scripts، workspace و Turbo

Task ID: F00-T02
Completed at: 2026-08-20 12:39 +03:30
Agent/Thread: /root
Changed files:
  - package.json، turbo.json، apps/api/package.json و apps/app/package.json
  - plan/phases/00-FOUNDATION.md و plan/STATUS.md
Migrations:
  - ندارد
Tests run:
  - pnpm typecheck (۴ workspace) → PASS
  - pnpm --filter @sabz-zendegi/api build → PASS
  - git diff --check → PASS
Result:
  - commandهای ریشه و API برای Turbo و workspace هم‌راستا شدند → PASS
Known limitations:
  - lint سراسری در F00-T13 همراه CI بررسی می‌شود.
Next task:
  - F00-T03

## F00-T03 — config و validation محیطی

Task ID: F00-T03
Completed at: 2026-08-20 12:49 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/.env.example و package.json
  - apps/api/src/{app.module,main}.ts و config/environment.validation.ts
  - pnpm-lock.yaml و فایل‌های plan
Migrations:
  - ندارد
Tests run:
  - typecheck و build API → PASS
  - bootstrap با env معتبر و رد شدن DATABASE_URL غایب → PASS
  - git diff --check → PASS
Result:
  - NODE_ENV، PORT، DATABASE_URL، APP_ORIGINS، LOG_LEVEL و JWT_ACCESS_SECRET پیش از bootstrap validate می‌شوند → PASS
Known limitations:
  - اتصال database در F00-T05 و readiness در F00-T09 تکمیل می‌شود.
Next task:
  - F00-T04

## F00-T04 — Docker Compose توسعه PostgreSQL

Task ID: F00-T04
Completed at: 2026-08-20 12:58 +03:30
Agent/Thread: /root
Changed files:
  - compose.yaml، apps/api/.env.example و فایل‌های plan
Migrations:
  - ندارد
Tests run:
  - docker compose config → PASS
  - docker compose up -d --wait postgres و pg_isready → PASS
  - query اتصال PostgreSQL → PASS
Result:
  - PostgreSQL 16 توسعه با volume و healthcheck روی localhost:5432 اجرا شد → PASS
Known limitations:
  - migration و schema در F00-T05 افزوده شدند.
Next task:
  - F00-T05

## F00-T05 — Prisma و migration اولیه

Task ID: F00-T05
Completed at: 2026-08-20 13:09 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/prisma.config.ts، prisma/schema.prisma و migrations/20260820130000_init
  - database module/service، package.json، pnpm-lock.yaml و فایل‌های plan
Migrations:
  - 20260820130000_init → applied to local PostgreSQL
Tests run:
  - prisma:generate، prisma:migrate:deploy و prisma migrate status → PASS
  - typecheck، build و git diff --check → PASS
Result:
  - Prisma 7، PrismaPg adapter و migration history versioned آماده‌اند → PASS
Known limitations:
  - baseline migration عمداً فاقد مدل business است.
Next task:
  - F00-T06

## F00-T06 — prefix، validation، serialization و exception filter

Task ID: F00-T06
Completed at: 2026-08-20 13:18 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/src/main.ts و common/filters/http-exception.filter.ts
  - Prisma service/schema، package.json، tsconfig.json، pnpm-lock.yaml و فایل‌های plan
Migrations:
  - ندارد
Tests run:
  - typecheck، build، آزمون مستقیم HttpExceptionFilter و git diff --check → PASS
Result:
  - prefix `/v1`، ValidationPipe، ClassSerializerInterceptor و پاسخ امن exception فعال شدند → PASS
Known limitations:
  - error contract کامل در F00-T07 و validation DTO واقعی در F00-T11 پیگیری می‌شود.
Next task:
  - F00-T07

## F00-T07 — error contract پایدار

Task ID: F00-T07
Completed at: 2026-08-20 13:23 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/src/common/errors/api-error.ts و filters/http-exception.filter.ts
  - فایل‌های plan
Migrations:
  - ندارد
Tests run:
  - typecheck، build، آزمون validation/internal error و git diff --check → PASS
Result:
  - contract شامل `code`، `message`، `requestId` و `details` برای تمام خطاها اعمال شد → PASS
Known limitations:
  - correlation ID کامل در F00-T08 افزوده شد.
Next task:
  - F00-T08

## F00-T08 — logging، correlation ID و redaction

Task ID: F00-T08
Completed at: 2026-08-20 13:47 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/src/common/logging/fastify-logging.config.ts و main.ts
  - فایل‌های plan
Migrations:
  - ندارد
Tests run:
  - compiler مستقیم TypeScript، آزمون correlation/redaction و git diff --check → PASS
Result:
  - logger structured، پذیرش/تولید request ID و redaction credentialها فعال شدند → PASS
Known limitations:
  - verification رسمی typecheck/build در F00-T13 بازبینی می‌شود.
Next task:
  - F00-T09

## F00-T09 — health و readiness

Task ID: F00-T09
Completed at: 2026-08-20 14:04 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/src/common/health/health.controller.ts
  - apps/api/src/app.module.ts و common/errors/api-error.ts
  - فایل‌های plan
Migrations:
  - ندارد
Tests run:
  - compiler مستقیم TypeScript → PASS
  - GET /v1/health/live و /v1/health/ready با PostgreSQL در دسترس → PASS (200)
  - readiness با DATABASE_URL غیرقابل‌دسترسی → PASS (503، SERVICE_UNAVAILABLE)
Result:
  - liveness مستقل و readiness وابسته به PostgreSQL ارائه شدند → PASS
Known limitations:
  - verification رسمی typecheck/build در F00-T13 بازبینی می‌شود.
Next task:
  - F00-T10

## F00-T10 — Swagger/OpenAPI و bearer scheme

Task ID: F00-T10
Completed at: 2026-08-20 14:12 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/package.json
  - apps/api/src/main.ts
  - pnpm-lock.yaml
  - plan/phases/00-FOUNDATION.md و plan/STATUS.md
Migrations:
  - ندارد
Tests run:
  - compiler مستقیم TypeScript (`tsc --noEmit`) → PASS
  - compiler مستقیم TypeScript برای build config (`tsc -p tsconfig.build.json`) → PASS
  - HTTP: `GET /docs` و `GET /docs-json` و اعتبارسنجی health pathها و bearer scheme → PASS
  - git diff --check → PASS
Result:
  - Swagger UI در `/docs` و سند OpenAPI در `/docs-json` سرو می‌شوند → PASS
  - scheme اولیهٔ `bearerAuth` با HTTP bearer و JWT در OpenAPI ثبت شد → PASS
Known limitations:
  - endpointهای محافظت‌شده در Phase 01 اعمال می‌شوند.
  - دستورهای رسمی typecheck/build با pre-hook Prisma به ناسازگاری `proper-lockfile` در runtime محلی برخورد می‌کنند؛ رفع و verification در F00-T13 است.
Next task:
  - F00-T11

## F00-T11 — test harness با PostgreSQL واقعی

Task ID: F00-T11
Completed at: 2026-08-20 14:31 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/src/app.factory.ts و src/main.ts
  - apps/api/test/health.controller.spec.ts و test/health.integration.spec.ts
  - apps/api/tsconfig.test.json و package.json
  - package.json، turbo.json و pnpm-lock.yaml
  - plan/phases/00-FOUNDATION.md، plan/logs/phase-00.md و plan/STATUS.md
Migrations:
  - ندارد
Tests run:
  - `tsc -p tsconfig.test.json --noEmit` → PASS
  - `vitest run --no-file-parallelism` → PASS (2 files, 5 tests)
  - `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - git diff --check → PASS
Result:
  - harness Vitest و commandهای root/API برای test در repository موجود است → PASS
  - unit test استقلال liveness، ready موفق و failure 503 را پوشش می‌دهد → PASS
  - integration test با bootstrap واقعی API و PostgreSQL واقعی، endpointهای live/ready را پوشش می‌دهد → PASS
Known limitations:
  - اجرای `pnpm --filter @sabz-zendegi/api test` در runtime محلی پیش از شروع script به ناسازگاری store/node_modules و درخواست حذف non-interactive برخورد می‌کند؛ اجرای مستقیم commandهای همان script PASS است. رفع و verification دستورهای رسمی در F00-T13 انجام می‌شود.
Next task:
  - F00-T12

## F00-T12 — migration smoke test و seed framework

Task ID: F00-T12
Completed at: 2026-08-20 14:47 +03:30
Agent/Thread: /root
Changed files:
  - apps/api/prisma.config.ts و prisma/seed.mjs
  - apps/api/test/migrations.integration.spec.ts و package.json
  - plan/phases/00-FOUNDATION.md، plan/logs/phase-00.md و plan/STATUS.md
Migrations:
  - `20260820130000_init` → PASS روی دیتابیس PostgreSQL خالی و موقت
Tests run:
  - `node prisma/seed.mjs` → PASS
  - `vitest run test/migrations.integration.spec.ts --no-file-parallelism` → PASS
  - git diff --check → PASS
Result:
  - seed development با اتصال واقعی آماده است و در نبود مدل business داده‌ای ایجاد نمی‌کند → PASS
  - migration history از صفر روی PostgreSQL خالی اعمال می‌شود → PASS
Known limitations:
  - اجرای commandهای رسمی pnpm در runtime محلی همچنان به همگام‌سازی store/node_modules برخورد می‌کند؛ verification آن در F00-T13 انجام می‌شود.
Next task:
  - F00-T13

## F00-T13 — CI و verification فرمان‌های ریشه

Task ID: F00-T13
Completed at: 2026-08-20 14:51 +03:30
Agent/Thread: /root
Changed files:
  - .github/workflows/ci.yml
  - plan/phases/00-FOUNDATION.md، plan/logs/phase-00.md و plan/STATUS.md
Migrations:
  - CI پیش از test، `prisma migrate deploy` را روی PostgreSQL service اجرا می‌کند.
Tests run:
  - git diff --check → PASS
  - بررسی محلی `pnpm lint` → در preflight pnpm به store/node_modules محلی برخورد کرد.
Result:
  - workflow GitHub Actions با install قفل‌شده، PostgreSQL 16 و lint/typecheck/test/build/migration check موجود است → PASS
Known limitations:
  - اجرای workflow از این محیط ممکن نیست؛ نخستین push/PR باید نتیجهٔ CI را تأیید کند.
  - ناسازگاری محلی pnpm store/node_modules خارج از نصب تمیز CI است.
Next task:
  - F00-T14

## F00-T14 — اصلاح README و دستورهای development

Task ID: F00-T14
Completed at: 2026-08-20 14:54 +03:30
Agent/Thread: /root
Changed files:
  - README.md و apps/{api,app,dashboard}/README.md
  - plan/phases/00-FOUNDATION.md و plan/STATUS.md و plan/logs/phase-00.md
Tests run:
  - git diff --check → PASS
Result:
  - پورت‌ها، pnpm workspace commandها، API و Swagger در مستندات development هم‌راستا شدند → PASS
Next task:
  - F00-T15
