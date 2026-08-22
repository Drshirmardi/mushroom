# Phase 01 — Identity & Access: Execution Log

این لاگ شواهد تکمیل Taskهای Phase 01 را نگه می‌دارد. checklist و وضعیت زنده در
[`../phases/01-IDENTITY-ACCESS.md`](../phases/01-IDENTITY-ACCESS.md) و
[`../STATUS.md`](../STATUS.md) قرار دارند.

## F01-T01 — نهایی‌کردن auth flow، cookie policy، token claims و session model

Task ID: F01-T01
Completed at: 2026-08-20 19:43 +03:30
Agent/Thread: Codex /root
Changed files:
  - `plan/decisions/ADR-0001-auth-session-contract.md`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد (مدل‌های identity در `F01-T02`)
Tests run:
  - assertion حضور جریان‌ها، cookie policy، claimها، session fields، reuse behavior و task impact در ADR → PASS
  - بررسی link فایل فاز به ADR → PASS
  - `git diff --check` → PASS
Result:
  - جریان register → login → refresh → logout و contract پاسخ/cookie نهایی شد → PASS
  - access token ده‌دقیقه‌ای، refresh deadlineهای ۲۴ساعته/۳۰روزه و storage سمت frontend مشخص شد → PASS
  - claimهای کمینه JWT و ممنوعیت PII در token مشخص شد → PASS
  - مدل منطقی Session، rotation تراکنشی و reuse detection بدون ذخیره token خام مشخص شد → PASS
  - CORS allowlist، Origin validation و فرض same-site deployment مشخص شد → PASS
  - اثر تصمیم بر taskهای `F01-T02` تا `F01-T16` و validationهای لازم ثبت شد → PASS
Known limitations:
  - این task contract-only است؛ migration، endpoint، guard، rotation و frontend integration در taskهای بعدی Phase 01 پیاده می‌شوند.
  - نام فعلی فرم signup متعلق به profile در Phase 02 است و در `F01-T14` نباید به identity API ارسال شود.
Next task:
  - `F01-T02`

## F01-T02 — migration مدل‌های identity

Task ID: F01-T02
Completed at: 2026-08-20 19:54 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260820195000_identity_models/migration.sql`
  - `apps/api/prisma/seed.mjs`
  - `apps/api/test/migrations.integration.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - `20260820195000_identity_models` → PASS روی دیتابیس development و PostgreSQL خالی موقت
Tests run:
  - Prisma `format`، `validate` و `generate` با CLI قفل‌شده 7.9.1 → PASS
  - `migrate deploy` و `migrate status` روی development PostgreSQL → PASS
  - `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → PASS (no difference)
  - migration smoke test روی PostgreSQL خالی، اجرای دو‌باره seed و بررسی ۷ table/۴ role/constraintها → PASS
  - Vitest کامل API با PostgreSQL واقعی → PASS (۳ فایل، ۶ تست)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` → PASS
Result:
  - مدل‌های `User`، `Credential`، `Session`، `Role`، `UserRole`، `LoginAttempt` و `AuditEvent` با relationهای صریح ایجاد شدند → PASS
  - timestampها از نوع `TIMESTAMPTZ(3)` و IPها از نوع PostgreSQL `INET` هستند → PASS
  - credential یک‌به‌یک، role code یکتا، user-role مرکب و FKهای ownership در دیتابیس enforce می‌شوند → PASS
  - constraintهای generation غیرمنفی، expiry معتبر و جفت‌بودن revoke timestamp/reason در PostgreSQL enforce می‌شوند → PASS
  - نقش‌های `PATIENT`، `DOCTOR`، `STAFF` و `ADMIN` به‌صورت idempotent seed می‌شوند → PASS
Known limitations:
  - شماره موبایل در این migration فقط index عادی دارد؛ normalization و unique constraint عمداً در `F01-T03` همراه migration داده انجام می‌شود.
  - hash واقعی password و refresh token در taskهای `F01-T04` و `F01-T08` پیاده می‌شوند؛ این task فقط storage contract را ایجاد کرده است.
Next task:
  - `F01-T03`

## F01-T03 — normalize شماره موبایل و unique constraint

Task ID: F01-T03
Completed at: 2026-08-21 08:17 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/src/modules/identity/domain/phone-number.ts`
  - `apps/api/test/phone-number.spec.ts`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260821081500_canonical_phone/migration.sql`
  - `apps/api/test/migrations.integration.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - `20260821081500_canonical_phone` → PASS روی دیتابیس development و PostgreSQL خالی موقت
Tests run:
  - Prisma `format`، `validate` و `generate` با CLI 7.9.1 → PASS
  - unit/integration اختصاصی phone و migration → PASS (۲ فایل، ۱۷ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۴ فایل، ۲۲ تست)
  - migration روی schema بازسازی‌شده قبل از F01-T03 با داده فارسی و `0098` → PASS
  - PostgreSQL rejection برای format غیرcanonical و شماره تکراری → PASS (`23514` و `23505`)
  - `migrate deploy`، `migrate status` و schema diff → PASS (no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` → PASS
Result:
  - شماره‌های موبایل معتبر ایران با ارقام لاتین/فارسی/عربی و قالب‌های محلی/کشوری به `+989XXXXXXXXX` تبدیل می‌شوند → PASS
  - ورودی دارای حروف، کشور دیگر، تلفن ثابت یا طول نامعتبر با code پایدار `INVALID_PHONE_NUMBER` رد می‌شود → PASS
  - migration داده موجود را normalize و در invalid/collision صریحاً fail می‌کند → PASS
  - PostgreSQL canonical format، طول ۱۳ و uniqueness کاربر را enforce می‌کند → PASS
Known limitations:
  - اتصال normalizer به DTO/register در `F01-T05` انجام می‌شود.
  - ثبت login attempt با شماره canonical در `F01-T06` انجام می‌شود.
Next task:
  - `F01-T04`

## F01-T04 — password hashing با Argon2id و policy رمز

Task ID: F01-T04
Completed at: 2026-08-21 08:35 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/package.json`
  - `pnpm-lock.yaml`
  - `apps/api/src/modules/identity/domain/password-policy.ts`
  - `apps/api/src/modules/identity/infrastructure/password-hasher.ts`
  - `apps/api/test/password-policy.spec.ts`
  - `apps/api/test/password-hasher.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد
Tests run:
  - تست اختصاصی password policy و Argon2id → PASS (۲ فایل، ۱۸ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۶ فایل، ۴۰ تست)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - Prisma client generation → PASS
  - `git diff --check` → PASS
Result:
  - policy حداقل ۱۵/حداکثر ۱۲۸ Unicode code point، NFC و بدون composition rule پیاده شد → PASS
  - space، Unicode و نیم‌فاصله فارسی حفظ و control character/blocklist رد می‌شوند → PASS
  - خطاهای policy code پایدار دارند و password خام را در message بازتاب نمی‌دهند → PASS
  - Argon2id v19 با ۶۴ MiB، سه pass، چهار lane، salt تصادفی ۱۶‌بایتی و hash ۳۲‌بایتی تولید می‌شود → PASS
  - verify صحیح/غلط/malformed و تشخیص rehash برای hash ضعیف پوشش داده شد → PASS
Known limitations:
  - baseline blocklist محلی حداقلی است؛ `F01-T05` می‌تواند مقادیر وابسته به کاربر مانند شماره موبایل را از طریق context مسدود کند.
  - wrapper محلی pnpm 11 با store نصب‌شده pnpm 10 ناسازگار بود؛ dependency با pnpm 10.10.0 قفل شد و binaryهای همان workspace برای verification کامل استفاده شدند.
Next task:
  - `F01-T05`

## F01-T05 — register use case و endpoint

Task ID: F01-T05
Completed at: 2026-08-21 08:57 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/src/app.module.ts`
  - `apps/api/src/common/errors/api-error.ts`
  - `apps/api/src/common/filters/http-exception.filter.ts`
  - `apps/api/src/modules/identity/application/ports/password-hasher.ts`
  - `apps/api/src/modules/identity/application/ports/registration.repository.ts`
  - `apps/api/src/modules/identity/application/register-user.use-case.ts`
  - `apps/api/src/modules/identity/infrastructure/password-hasher.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-registration.repository.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/register.dto.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/prisma/migrations/20260821084000_seed_identity_roles/migration.sql`
  - `apps/api/test/register-user.spec.ts`
  - `apps/api/test/register.integration.spec.ts`
  - `apps/api/test/migrations.integration.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - `20260821084000_seed_identity_roles` → PASS روی development و PostgreSQL خالی؛ چهار نقش قبل از اجرای development seed موجودند
Tests run:
  - unit و integration اختصاصی register/migration → PASS (۳ فایل، ۹ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۸ فایل، ۴۸ تست)
  - race دو register معادل → PASS (یک `201`، یک `409`، فقط یک user)
  - `migrate status` و schema diff → PASS (up to date، no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - OpenAPI path `/v1/auth/register` → PASS
  - `git diff --check` و بررسی عدم وابستگی application/domain به Prisma/Nest/infrastructure → PASS
Result:
  - `POST /v1/auth/register` با DTO محدود به phone/password و پاسخ production-shaped ایجاد شد → PASS
  - normalize، policy و Argon2id پیش از persistence اعمال می‌شوند → PASS
  - User، Credential و UserRole/PATIENT در transaction واحد ذخیره می‌شوند → PASS
  - response فاقد password/hash/token/cookie است و register طبق ADR session ایجاد نمی‌کند → PASS
  - duplicate و race با `PHONE_ALREADY_REGISTERED` و status `409` مدیریت می‌شوند → PASS
  - خطاهای phone/password با code پایدار و status `422` بدون echo مقدار حساس پاسخ می‌دهند → PASS
  - reference roleها از migration deployment تأمین و seed توسعه همچنان idempotent است → PASS
Known limitations:
  - login، session و token خارج از scope این task و متعلق به `F01-T06` تا `F01-T08` هستند.
  - rate limit endpoint register همراه زیرساخت login rate limit در `F01-T06` اضافه می‌شود.
Next task:
  - `F01-T06`
