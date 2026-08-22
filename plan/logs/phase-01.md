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

## F01-T06 — login use case، rate limit و ثبت login attempt

Task ID: F01-T06
Completed at: 2026-08-22 14:44 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260822143500_login_attempt_pending/migration.sql`
  - `apps/api/src/modules/identity/application/login-user.use-case.ts`
  - `apps/api/src/modules/identity/application/ports/login.repository.ts`
  - `apps/api/src/modules/identity/application/ports/password-hasher.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-login.repository.ts`
  - `apps/api/src/modules/identity/infrastructure/password-hasher.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/test/login-user.spec.ts`
  - `apps/api/test/login.integration.spec.ts`
  - `apps/api/test/migrations.integration.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - `20260822143500_login_attempt_pending` → PASS روی development و PostgreSQL خالی موقت
Tests run:
  - unit و integration اختصاصی login → PASS (۲ فایل، ۱۱ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۱۰ فایل، ۵۹ تست)
  - رقابت ۱۲ رزرو هم‌زمان برای یک شماره → PASS (۵ مجاز، ۷ rate-limited)
  - rate limit مشترک IP روی شماره‌های متفاوت → PASS
  - migration smoke روی PostgreSQL خالی و بررسی enum `PENDING` → PASS
  - Prisma validate، migrate status و schema diff → PASS (up to date، no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` → PASS
Result:
  - login برای credential معتبر principal کمینه و برای password/phone/account نامعتبر خطای عمومی یکسان می‌دهد → PASS
  - dummy Argon2id verification مسیر حساب ناشناخته و شماره malformed را از مسیر سریع جدا می‌کند → PASS
  - محدودیت ۱۵دقیقه‌ای ۵ failure برای شماره و ۳۰ failure برای IP اعمال می‌شود → PASS
  - advisory lock تراکنشی و outcome موقت `PENDING` عبور درخواست‌های موازی از سقف را مسدود می‌کند → PASS
  - نتیجه‌های success، invalid credentials، disabled و rate-limited همراه IP/user-agent در `LoginAttempt` ثبت می‌شوند → PASS
  - password خام و شماره malformed در attempt ذخیره نمی‌شوند → PASS
Known limitations:
  - endpoint نهایی login عمداً تا ایجاد access token و session در `F01-T07` و `F01-T08` منتشر نمی‌شود.
  - rate limit فعلاً بر PostgreSQL تکیه دارد؛ backend توزیع‌شده Redis در Phase 06/11 قابل جایگزینی است.
  - rate limit ثبت‌نام، برخلاف یادداشت handoff `F01-T05`، در scope مصوب login این task نبود و باید پیش از release عمومی در `F01-T18`/Phase 11 تعیین تکلیف شود.
Next task:
  - `F01-T07`

## F01-T07 — access token و auth guard

Task ID: F01-T07
Completed at: 2026-08-22 15:06 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/package.json`
  - `pnpm-lock.yaml`
  - `turbo.json`
  - `apps/api/.env.example`
  - `apps/api/src/app.module.ts`
  - `apps/api/src/common/auth/access-token.service.ts`
  - `apps/api/src/common/auth/access-token.guard.ts`
  - `apps/api/src/common/auth/auth.module.ts`
  - `apps/api/src/common/auth/public.decorator.ts`
  - `apps/api/src/common/health/health.controller.ts`
  - `apps/api/src/config/environment.validation.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/test/access-token.spec.ts`
  - `apps/api/test/access-token.guard.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد
Tests run:
  - unit اختصاصی access token و guard → PASS (۲ فایل، ۲۵ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۱۲ فایل، ۸۴ تست)
  - token منقضی، algorithm/issuer/audience/signature نادرست، claim اضافه و lifetime طولانی → PASS
  - Bearer header مفقود/malformed و mapping خطای عمومی → PASS
  - routeهای public سلامت و register زیر global guard → PASS
  - migration smoke روی PostgreSQL خالی → PASS
  - Prisma validate، migrate status و schema diff → PASS (up to date، no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` → PASS
Result:
  - access JWT ده‌دقیقه‌ای با `HS256` و claimهای دقیق ADR صادر و validate می‌شود → PASS
  - algorithm، issuer، audience، signature، زمان، UUID، role و فهرست claimها سخت‌گیرانه validate می‌شوند → PASS
  - token نامعتبر یا منقضی بدون نشت جزئیات با `UNAUTHORIZED` رد می‌شود → PASS
  - global guard همه routeها را پیش‌فرض protected و فقط `Public`های صریح را bypass می‌کند → PASS
  - principal معتبر با user/session/token id و roleها روی request قرار می‌گیرد → PASS
  - secret نمونه رد و secret حداقل ۳۲ بایت base64url همراه issuer/audience در config ثبت می‌شود → PASS
Known limitations:
  - صدور access token هنوز به login route وصل نیست؛ ایجاد Session و اتصال login در `F01-T08` انجام می‌شود.
  - guard طبق ADR stateless است و revoke فوری access token را تضمین نمی‌کند؛ window حداکثر ده دقیقه است.
Next task:
  - `F01-T08`

## F01-T08 — refresh token rotation، hash storage و reuse detection

Task ID: F01-T08
Completed at: 2026-08-22 15:27 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/package.json`
  - `pnpm-lock.yaml`
  - `turbo.json`
  - `apps/api/.env.example`
  - `apps/api/src/app.factory.ts`
  - `apps/api/src/common/auth/auth.module.ts`
  - `apps/api/src/common/auth/browser-origin.service.ts`
  - `apps/api/src/common/auth/refresh-cookie.service.ts`
  - `apps/api/src/common/errors/api-error.ts`
  - `apps/api/src/config/environment.validation.ts`
  - `apps/api/src/modules/identity/application/login-session.use-case.ts`
  - `apps/api/src/modules/identity/application/ports/refresh-token-manager.ts`
  - `apps/api/src/modules/identity/application/ports/session.repository.ts`
  - `apps/api/src/modules/identity/application/refresh-session.use-case.ts`
  - `apps/api/src/modules/identity/infrastructure/hmac-refresh-token-manager.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-session.repository.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/login.dto.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/test/auth-session.integration.spec.ts`
  - `apps/api/test/refresh-cookie-origin.spec.ts`
  - `apps/api/test/refresh-token-manager.spec.ts`
  - `apps/api/test/session-use-cases.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ مدل Session موجود تمام constraintها و fieldهای لازم را پوشش می‌دهد
Tests run:
  - unit و integration اختصاصی session/refresh/cookie/origin → PASS (۴ فایل، ۲۲ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۱۶ فایل، ۱۱۵ تست)
  - login عادی و remember، refresh موفق، reuse ترتیبی و refresh هم‌زمان → PASS
  - token/cookie مفقود یا malformed، session منقضی و user غیرفعال → PASS
  - عدم نشت refresh/password/hash در response و ذخیره فقط HMAC در دیتابیس → PASS
  - cookie policy توسعه/production، Origin allowlist و OpenAPI login/refresh → PASS
  - Prisma validate، migrate status و schema diff → PASS (up to date، no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` و بررسی عدم وابستگی application/domain به Prisma/Nest/infrastructure → PASS
Result:
  - login واقعی Session و access token می‌سازد و refresh credential را فقط در cookie قرار می‌دهد → PASS
  - refresh token opaque با verifier تصادفی و HMAC-SHA256/pepper مستقل پیاده شد → PASS
  - rotation با row lock تراکنشی، replacement hash و generation اتمیک انجام می‌شود → PASS
  - reuse token قدیمی، از جمله race دو refresh، session را بدون grace period revoke می‌کند → PASS
  - deadline مطلق ۲۴ساعته/سی‌روزه در rotation تمدید نمی‌شود → PASS
  - cookie امن production و variant صریح development همراه CORS credentialed/Origin validation فعال شد → PASS
  - همه خطاهای refresh با پاسخ عمومی `INVALID_REFRESH_TOKEN` و پاک‌سازی cookie نگاشت می‌شوند → PASS
Known limitations:
  - refresh-specific rate limit در این task اضافه نشد؛ rotation تک‌مصرف و reuse detection فعال است،
    اما محدودسازی درخواست‌های malformed باید در `F01-T18`/Phase 11 تکمیل و تست شود.
  - revoke و مدیریت session endpointها متعلق به `F01-T09` هستند.
Next task:
  - `F01-T09`

## F01-T09 — logout، logout-all و revoke session

Task ID: F01-T09
Completed at: 2026-08-22 16:04 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/src/modules/identity/application/manage-sessions.use-case.ts`
  - `apps/api/src/modules/identity/application/ports/session.repository.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-session.repository.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/session.dto.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/test/manage-sessions.spec.ts`
  - `apps/api/test/session-management.integration.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ enum و indexهای Session موجود دلایل revoke و query فعال را پوشش می‌دهند
Tests run:
  - unit و integration اختصاصی session management → PASS (۲ فایل، ۱۰ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۱۸ فایل، ۱۲۵ تست)
  - logout و logout-all تکراری، refresh پس از logout و جداسازی session کاربر دیگر → PASS
  - revoke session انتخابی/جاری، عدم افشای ownership و پاک‌سازی cookie جاری → PASS
  - فهرست paginated، metadata امن، current marker و validation query/UUID → PASS
  - bearer guard، Origin allowlist و security contract چهار endpoint در OpenAPI → PASS
  - Prisma validate، migrate status و schema diff → PASS (up to date، no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` و بررسی عدم وابستگی application/domain به Prisma/Nest/infrastructure → PASS
Result:
  - logout فقط session جاری را با `LOGOUT` revoke و cookie را پاک می‌کند → PASS
  - logout-all همه sessionهای revokeنشده کاربر را با `LOGOUT_ALL` لغو می‌کند → PASS
  - revokeها idempotent هستند و عملیات روی session غیرمالک وجود آن را افشا نمی‌کند → PASS
  - session جاری و session انتخابی با کنترل userId/sessionId دقیق از هم تفکیک می‌شوند → PASS
  - فهرست session فقط داده امن و active را با pagination محدود برمی‌گرداند → PASS
Known limitations:
  - audit رویدادهای logout/logout-all/revoke طبق برنامه در `F01-T12` اضافه می‌شود.
  - access tokenهای قبلی طبق ADR stateless هستند و ممکن است حداکثر ده دقیقه تا expiry معتبر بمانند.
Next task:
  - `F01-T10`

## F01-T10 — endpointهای `/me` و change password

Task ID: F01-T10
Completed at: 2026-08-22 16:43 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/src/common/errors/api-error.ts`
  - `apps/api/src/modules/identity/application/manage-account.use-case.ts`
  - `apps/api/src/modules/identity/application/ports/account.repository.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-account.repository.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/me.dto.ts`
  - `apps/api/src/modules/identity/presentation/http/me.controller.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/test/manage-account.spec.ts`
  - `apps/api/test/me.integration.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ Credential و Session موجود update اتمیک و دلیل `PASSWORD_CHANGED` را پوشش می‌دهند
Tests run:
  - unit و integration اختصاصی current account → PASS (۲ فایل، ۱۹ تست)
  - Vitest کامل API با PostgreSQL واقعی → PASS (۲۰ فایل، ۱۴۴ تست)
  - GET حساب active و رد حساب disabled بدون نشت credential → PASS
  - تغییر شماره canonical، حالت بدون تغییر، شماره تکراری/نامعتبر و password اشتباه → PASS
  - تغییر password، Argon2id جدید، timestamp و revoke تمام sessionها → PASS
  - refresh قدیمی، login با password قدیمی و cookie پس از تغییر password → PASS
  - رقابت دو تغییر password با credential قدیمی → PASS (یک `204`، یک `401`)
  - bearer guard، Origin allowlist و OpenAPI هر سه endpoint → PASS
  - Prisma validate، migrate status و schema diff → PASS (up to date، no difference)
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` و بررسی عدم وابستگی application/domain به Prisma/Nest/infrastructure → PASS
Result:
  - bootstrap حساب از PostgreSQL با response کمینه و امن پیاده شد → PASS
  - PATCH شماره فقط با current password و unique/canonical enforcement انجام می‌شود → PASS
  - تغییر password متفاوت با policy و Argon2id مصوب انجام می‌شود → PASS
  - credential update و revoke تمام sessionها در transaction واحد قرار دارند → PASS
  - compare-and-set روی hash قبلی race تغییر password را کنترل می‌کند → PASS
  - password، hash و credential داخلی در body یا خطا نشت نمی‌کنند → PASS
Known limitations:
  - تأیید مالکیت شماره جدید با OTP خارج از scope Phase 01 است؛ فعلاً current password عامل تأیید است.
  - audit تغییر شماره/password طبق برنامه در `F01-T12` اضافه می‌شود.
  - access tokenهای قبلی طبق ADR ممکن است حداکثر ده دقیقه تا expiry معتبر بمانند.
Next task:
  - `F01-T11`
