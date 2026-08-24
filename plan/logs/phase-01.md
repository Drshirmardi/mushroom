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

## F01-T11 — RBAC guard و permission contract پایه

Task ID: F01-T11
Completed at: 2026-08-22 17:06 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/src/common/auth/access-token.service.ts`
  - `apps/api/src/common/auth/auth.module.ts`
  - `apps/api/src/common/auth/authorization.decorator.ts`
  - `apps/api/src/common/auth/authorization.guard.ts`
  - `apps/api/src/common/auth/authorization.policy.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/src/modules/identity/presentation/http/me.controller.ts`
  - `apps/api/test/authorization.guard.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ role reference data و assignmentهای موجود برای policy پایه کافی هستند
Tests run:
  - unit اختصاصی authorization به‌همراه access-token/guard → PASS (۳ فایل، ۴۰ تست)
  - تمام تست‌های غیر-migration API با PostgreSQL واقعی → PASS (۲۰ فایل، ۱۵۷ تست)
  - migration smoke روی PostgreSQL خالی در اجرای جداگانه → PASS (۱ فایل، ۱ تست)
  - ماتریس `PATIENT`/`DOCTOR`/`STAFF`/`ADMIN` برای dashboard و identity management → PASS
  - public bypass، principal مفقود، role any-of، permission all-of و denial بدون نشت policy → PASS
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` → PASS
Result:
  - قرارداد مرکزی چهار role و هفت permission پایه ایجاد و به validation JWT متصل شد → PASS
  - authorization guard سراسری پس از authentication guard فعال شد → PASS
  - بیمار مجوز dashboard ندارد و نقش‌های مدیریتی مصوب آن را دریافت می‌کنند → PASS
  - مدیریت user/role فقط به `ADMIN` اعطا می‌شود و role غیرمنتظره هیچ مجوزی نمی‌گیرد → PASS
  - endpointهای حساب و session با permission صریح self-service محافظت می‌شوند → PASS
  - ownership همچنان در use case/query اعمال می‌شود و ADMIN آن را به‌طور ضمنی دور نمی‌زند → PASS
Known limitations:
  - اتصال routeهای واقعی dashboard به `DASHBOARD_ACCESS` در `F01-T16` انجام می‌شود.
  - مستندسازی پاسخ `403` در OpenAPI و قرارداد client در `F01-T13` تکمیل می‌شود.
  - تغییر role ممکن است طبق access-token stateless مصوب تا پایان window حداکثر ده‌دقیقه‌ای دیده شود.
Next task:
  - `F01-T12`

## F01-T12 — audit رویدادهای امنیتی

Task ID: F01-T12
Completed at: 2026-08-22 17:20 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/src/modules/identity/application/security-audit.ts`
  - `apps/api/src/modules/identity/application/login-session.use-case.ts`
  - `apps/api/src/modules/identity/application/refresh-session.use-case.ts`
  - `apps/api/src/modules/identity/application/register-user.use-case.ts`
  - `apps/api/src/modules/identity/application/manage-account.use-case.ts`
  - `apps/api/src/modules/identity/application/manage-sessions.use-case.ts`
  - `apps/api/src/modules/identity/application/ports/account.repository.ts`
  - `apps/api/src/modules/identity/application/ports/registration.repository.ts`
  - `apps/api/src/modules/identity/application/ports/session.repository.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-security-audit.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-account.repository.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-registration.repository.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-session.repository.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/src/modules/identity/presentation/http/me.controller.ts`
  - `apps/api/test/security-audit.integration.spec.ts`
  - `apps/api/test/manage-account.spec.ts`
  - `apps/api/test/manage-sessions.spec.ts`
  - `apps/api/test/register-user.spec.ts`
  - `apps/api/test/session-use-cases.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ مدل و indexهای `AuditEvent` از migration پایه موجود هستند
Tests run:
  - unit اختصاصی register/session/account → PASS (۴ فایل، ۲۳ تست)
  - integration کامل audit روی API و PostgreSQL واقعی → PASS (۱ فایل، ۱ تست)
  - تمام تست‌های غیر-migration API با PostgreSQL واقعی → PASS (۲۱ فایل، ۱۵۹ تست)
  - migration smoke روی PostgreSQL خالی در اجرای جداگانه → PASS (۱ فایل، ۱ تست)
  - ثبت actor/subject/request/IP و metadata امن برای همه mutationهای identity/session → PASS
  - idempotent revoke بدون رویداد تکراری و refresh reuse با generation غیرحساس → PASS
  - عدم حضور password، شماره، user-agent و refresh cookie در audit serial‌شده → PASS
  - `tsc -p tsconfig.test.json --noEmit`، `tsc --noEmit` و `tsc -p tsconfig.build.json` → PASS
  - `git diff --check` و مرور نهایی diff → PASS
Result:
  - actionهای audit امنیتی در قرارداد مرکزی ثابت و محدود شدند → PASS
  - ثبت حساب/session، reuse، logoutها، revoke و تغییر credential audit می‌شوند → PASS
  - هر تغییر state و audit متناظر در transaction واحد PostgreSQL قرار گرفت → PASS
  - عملیات no-op idempotent رکورد audit تکراری ایجاد نمی‌کند → PASS
  - request ID، IP، actor session/user و subject قابل پیگیری ثبت می‌شوند → PASS
  - secret، credential و PII در metadata ذخیره نمی‌شوند → PASS
Known limitations:
  - endpoint تغییر role هنوز وجود ندارد؛ mutation آینده باید پیش از انتشار همین قرارداد audit را اعمال کند.
  - خواندن و retention/export رویدادهای audit خارج از scope این task است.
Next task:
  - `F01-T13`

## F01-T13 — OpenAPI و API client احراز هویت

Task ID: F01-T13
Completed at: 2026-08-22 17:53 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/package.json`
  - `apps/api/scripts/export-openapi.mjs`
  - `apps/api/src/app.factory.ts`
  - `apps/api/src/common/auth/browser-origin.decorator.ts`
  - `apps/api/src/common/auth/refresh-cookie.openapi.ts`
  - `apps/api/src/common/errors/api-error.ts`
  - `apps/api/src/common/errors/api-error.dto.ts`
  - `apps/api/src/common/errors/api-error-response.decorator.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/src/modules/identity/presentation/http/me.controller.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/login.dto.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/me.dto.ts`
  - `apps/api/src/modules/identity/presentation/http/dto/register.dto.ts`
  - `apps/api/test/openapi-contract.spec.ts`
  - `packages/api-client/package.json`
  - `packages/api-client/README.md`
  - `packages/api-client/tsconfig.json`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/index.ts`
  - `packages/api-client/src/schema.generated.ts`
  - `packages/api-client/test/api-client.spec.ts`
  - `package.json`
  - `pnpm-lock.yaml`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ این task فقط API contract و package client را تغییر می‌دهد
Tests run:
  - تولید OpenAPI و TypeScript client از runtime NestJS → PASS
  - contract اختصاصی OpenAPI → PASS (۱ فایل، ۵ تست)
  - تمام تست‌های غیر-migration API با PostgreSQL واقعی → PASS (۲۲ فایل، ۱۶۴ تست)
  - migration smoke روی PostgreSQL خالی → PASS (۱ فایل، ۱ تست)
  - تست runtime client و credentialed fetch → PASS (۱ فایل، ۱ تست)
  - stale check، typecheck و build package `api-client` → PASS
  - API test typecheck، no-emit typecheck و build typecheck → PASS
  - typecheck مستقیم `apps/web`، `apps/app` و `apps/dashboard` → PASS
  - `git diff --check` و مرور نهایی diff/lockfile → PASS
Result:
  - ده operation هویتی operation ID پایدار و schema کامل دارند → PASS
  - bearer، refresh cookie، Set-Cookie و Origin اختیاری دقیقاً مستند شدند → PASS
  - پاسخ‌های `401`/`403` و سایر خطاها error envelope تولیدپذیر دارند → PASS
  - password write-only و role/status/error code به union محدود تبدیل شدند → PASS
  - OpenAPI checked-in با runtime document همگام و stale type قابل تشخیص است → PASS
  - client مشترک typed با `credentials: include` و بدون persistence token ساخته شد → PASS
Known limitations:
  - اتصال client به frontendها و refresh single-flight در `F01-T14` تا `F01-T16` انجام می‌شود.
  - Turbo در runtime محلی Codex فرمان‌های child را با pnpm سراسری 11 اجرا کرد؛ typecheck مستقیم هر
    پنج workspace با binary قفل‌شده پاس شد و CI دارای pnpm 10 تحت تأثیر نیست.
Next task:
  - `F01-T14`

## F01-T14 — اتصال login/signup در apps/web

Task ID: F01-T14
Completed at: 2026-08-23 07:58 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/web/.env.example`
  - `apps/web/package.json`
  - `apps/web/src/components/auth/LoginForm.tsx`
  - `apps/web/src/components/auth/PasswordStrength.tsx`
  - `apps/web/src/components/auth/SignupForm.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/lib/validation.ts`
  - `apps/web/src/lib/validation.test.ts`
  - `apps/web/src/services/auth-session.ts`
  - `apps/web/src/services/auth.ts`
  - `apps/web/src/services/auth.test.ts`
  - `pnpm-lock.yaml`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ این task فقط frontend وب را به API موجود متصل می‌کند
Tests run:
  - تست سرویس auth وب، credentialed request، payload ثبت‌نام، session حافظه‌ای و خطاها → PASS (۱ فایل، ۳ تست)
  - تست همگامی password validation وب با policy API و Unicode → PASS (۱ فایل، ۱ تست)
  - typecheck مستقیم `apps/web` → PASS
  - production build `apps/web` و prerender مسیرهای `/login` و `/signup` → PASS
  - regression تست package `api-client` و stale OpenAPI check → PASS (۱ فایل، ۱ تست)
  - تست مرورگر محلی صفحات signup/login، validation فارسی و console error → PASS
  - بررسی نبود `localStorage`، `sessionStorage` و user map موقت در auth وب → PASS
  - `git diff --check` و مرور نهایی diff/lockfile → PASS
Result:
  - فرم‌های login و signup به client تولیدشده و API واقعی متصل شدند → PASS
  - تمام requestهای auth با credential ارسال می‌شوند و access token فقط در حافظه نگهداری می‌شود → PASS
  - register فقط phone/password می‌فرستد، session نمی‌سازد و سپس کاربر را به login هدایت می‌کند → PASS
  - login حالت remember، خطاهای عمومی/rate-limit/network و انتقال به اپ کاربر را پوشش می‌دهد → PASS
  - policy رمز وب با حداقل ۱۵ و حداکثر ۱۲۸ code point API همگام و passphraseهای Unicode مجاز شد → PASS
Known limitations:
  - bootstrap از refresh cookie و route protection داخل `apps/app` در `F01-T15` انجام می‌شود.
  - profile و دریافت نام کاربر طبق ADR در Phase 02 انجام می‌شود.
Next task:
  - `F01-T15`

## F01-T15 — session bootstrap و route protection در apps/app

Task ID: F01-T15
Completed at: 2026-08-23 08:14 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/app/.env.example`
  - `apps/app/package.json`
  - `apps/app/src/app/layout.tsx`
  - `apps/app/src/app/(app)/profile/page.tsx`
  - `apps/app/src/auth/session.ts`
  - `apps/app/src/auth/session.test.ts`
  - `apps/app/src/components/auth/session-gate.tsx`
  - `apps/app/src/lib/api.ts`
  - `pnpm-lock.yaml`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ این task فقط session integration اپ کاربر را تغییر می‌دهد
Tests run:
  - تست session manager برای refresh credentialed و بدون body، single-flight، failure و logout → PASS (۱ فایل، ۴ تست)
  - typecheck مستقیم `apps/app` → PASS
  - production build تمام ۳۹ route اپ → PASS
  - regression تست package `api-client` و stale OpenAPI check → PASS (۱ فایل، ۱ تست)
  - تست مرورگر محلی `/` بدون session: نمایش gate و انتقال به `apps/web/login` بدون render محتوای محافظت‌شده → PASS
  - بررسی console مرورگر هنگام route protection → PASS (بدون error/warning)
  - بررسی نبود `localStorage`، `sessionStorage` و `document.cookie` در auth اپ → PASS
  - `git diff --check` و مرور نهایی diff/lockfile → PASS
Result:
  - همه routeهای app شامل onboarding تا موفقیت bootstrap پشت SessionGate قرار گرفتند → PASS
  - refresh cookie با client تولیدشده و single-flight مصرف و access token فقط در حافظه نگهداری می‌شود → PASS
  - نبود/خرابی session به حالت anonymous و انتقال امن به login وب منجر می‌شود → PASS
  - context تایپ‌شده principal/access token را در اختیار اپ قرار می‌دهد → PASS
  - دکمه خروج profile به endpoint واقعی bearer-protected متصل و state موفق پاک می‌شود → PASS
Known limitations:
  - route protection نقش‌محور dashboard در `F01-T16` انجام می‌شود.
  - اتصال داده profile و onboarding به API طبق مرز ماژول‌ها در Phase 02 انجام می‌شود.
Next task:
  - `F01-T16`

## F01-T16 — route protection نقش‌محور در apps/dashboard

Task ID: F01-T16
Completed at: 2026-08-23 08:38 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/dashboard/.env.example`
  - `apps/dashboard/package.json`
  - `apps/dashboard/src/app/layout.tsx`
  - `apps/dashboard/src/auth/session.ts`
  - `apps/dashboard/src/auth/session.test.ts`
  - `apps/dashboard/src/components/auth/dashboard-session-gate.tsx`
  - `apps/dashboard/src/components/layout/sidebar.tsx`
  - `apps/dashboard/src/lib/api.ts`
  - `apps/web/.env.example`
  - `apps/web/src/components/auth/LoginForm.tsx`
  - `apps/web/src/lib/api.ts`
  - `apps/web/src/lib/api.test.ts`
  - `pnpm-lock.yaml`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ این task فقط session و role integration frontend را تغییر می‌دهد
Tests run:
  - matrix نقش و session manager dashboard برای `DOCTOR`/`STAFF`/`ADMIN`/`PATIENT`، single-flight، failure و logout → PASS (۱ فایل، ۸ تست)
  - تست allowlist مقصد پس از login وب و رد open redirect → PASS (همراه suite وب: ۳ فایل، ۵ تست)
  - typecheck مستقیم dashboard و web → PASS
  - lint کامل dashboard → PASS
  - production build تمام ۳۶ route dashboard و ۴ route web → PASS
  - regression تست package `api-client` و stale OpenAPI check → PASS (۱ فایل، ۱ تست)
  - تست مرورگر محلی route محافظت‌شده و انتقال بدون render dashboard به login وب → PASS
  - تست مرورگر مسیر بازگشت `/patients` در پارامتر `next` و console بدون error/warning → PASS
  - بررسی نبود `localStorage`، `sessionStorage` و `document.cookie` در auth dashboard → PASS
  - `git diff --check` و مرور نهایی diff/lockfile → PASS
Result:
  - تمام routeهای dashboard تا موفقیت bootstrap و تأیید نقش پشت gate قرار گرفتند → PASS
  - فقط `DOCTOR`، `STAFF` یا `ADMIN` مجاز و نشست صرفاً `PATIENT` به app هدایت می‌شود → PASS
  - refresh credentialed/no-body و single-flight است و access token فقط در حافظه می‌ماند → PASS
  - نبود session به login وب و مقصد امن پس از ورود به route اولیه dashboard بازمی‌گردد → PASS
  - مقصد خارجی پس از login رد و fallback اپ کاربر استفاده می‌شود → PASS
  - خروج sidebar با bearer token به endpoint واقعی متصل و نقش حساب از principal واقعی نمایش داده می‌شود → PASS
Known limitations:
  - authorization نهایی هر API مدیریتی همچنان در backend enforce می‌شود؛ این gate فقط از render ناخواسته UI جلوگیری می‌کند.
  - cleanup نهایی auth حافظه‌ای و verification در `F01-T17` انجام می‌شود.
Next task:
  - `F01-T17`

## F01-T17 — حذف auth حافظه‌ای پس از verification

Task ID: F01-T17
Completed at: 2026-08-23 08:59 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/web/src/services/auth-session.ts` (حذف شد)
  - `apps/web/src/services/auth.ts`
  - `apps/web/src/services/auth.test.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - ندارد؛ این task فقط cleanup و verification احراز هویت frontend است
Tests run:
  - تست سرویس auth وب برای login واقعی credentialed، نبود session injection، ثبت‌نام و خطاها → PASS (۳ فایل، ۵ تست)
  - تست session manager اپ برای refresh single-flight، failure و bearer logout → PASS (۱ فایل، ۴ تست)
  - تست matrix نقش و session manager dashboard → PASS (۱ فایل، ۸ تست)
  - تست و stale OpenAPI check در package `api-client` → PASS (۱ فایل، ۱ تست)
  - typecheck مستقیم web، app، dashboard و api-client → PASS
  - lint کامل dashboard → PASS
  - production build web (۴ route)، app (۳۹ route) و dashboard (۳۶ route) → PASS
  - ممیزی سورس سه frontend برای نبود `localStorage`، `sessionStorage`، `document.cookie`، auth mock و user map → PASS
  - `git diff --check` و مرور نهایی diff → PASS
Result:
  - session module منسوخ وب و نگه‌داری authentication response پس از login حذف شد → PASS
  - login/signup وب فقط از API client تولیدشده و refresh cookie امن استفاده می‌کنند → PASS
  - access token/principal حافظه‌ای app و dashboard مطابق ADR برای bootstrap، Bearer request و logout حفظ شد → PASS
  - هیچ auth mock، user map یا persistence قابل‌دسترسی JavaScript در سه frontend باقی نماند → PASS
Known limitations:
  - matrix امنیت یکپارچه، CORS/credential flow و evidence نهایی فاز در `F01-T18` اجرا و ثبت می‌شود.
Next task:
  - `F01-T18`

## F01-T18 — تست امنیت و ثبت evidence

Task ID: F01-T18
Completed at: 2026-08-23 12:46 +03:30
Agent/Thread: Codex /root
Changed files:
  - `apps/api/test/identity-security-boundaries.spec.ts`
  - `plan/phases/01-IDENTITY-ACCESS.md`
  - `plan/logs/phase-01.md`
  - `plan/STATUS.md`
Migrations:
  - migration smoke تمام migrationها روی PostgreSQL خالی را اعمال و seed/reference roleها را verify کرد → PASS
Tests run:
  - کل suite API شامل domain، guard، API و PostgreSQL integration و migration smoke → PASS (۲۴ فایل، ۱۷۰ تست)
  - تست مرزهای امنیتی جدید برای preflight سه origin، رد origin ناشناخته و redaction لاگ → PASS (۱ فایل، ۵ تست)
  - authorization matrix برای `PATIENT`، `DOCTOR`، `STAFF` و `ADMIN` و denial عمومی → PASS
  - register تکراری/race، login نامعتبر/rate limit، JWT منقضی/نامعتبر، refresh rotation/reuse/concurrency و logout/revoke → PASS
  - تست audit persistence و نبود password، phone، token، cookie و user-agent خام → PASS
  - suite و typecheck وب → PASS (۳ فایل، ۵ تست)
  - suite و typecheck app → PASS (۱ فایل، ۴ تست)
  - suite، typecheck و lint dashboard → PASS (۱ فایل، ۸ تست)
  - stale check، تست، typecheck و build package `api-client` → PASS (۱ فایل، ۱ تست)
  - تولید OpenAPI و API client از runtime NestJS بدون diff ناخواسته → PASS
  - typecheck و build API، web، app و dashboard → PASS
  - ممیزی سه frontend برای نبود storage/cookie قابل‌دسترسی JavaScript، auth mock و user map → PASS
  - `git diff --check` و مرور نهایی diff → PASS
Result:
  - تمام تست‌های اجباری Phase 01 و authorization matrix پاس شدند → PASS
  - CORS فقط سه origin دقیق frontend را با credential مجاز می‌کند و origin ناشناخته `Allow-Origin` نمی‌گیرد → PASS
  - client مشترک و جریان login/refresh/logout هر سه frontend credentialed هستند → PASS
  - response، audit و تنظیمات logger از نشت password/token/cookie/authorization محافظت می‌کنند → PASS
  - معیارهای خروج Phase 01 کامل و فاز برای review مستقل آماده است → PASS
Known limitations:
  - طبق workflow، تغییر وضعیت از `READY_FOR_REVIEW` به `DONE` و شروع Phase 02 به review مستقل نیاز دارد.
Next task:
  - review مستقل Phase 01

## F01-T18 — remediation review مستقل و تکمیل Phase 01

Task ID: F01-T18
Completed at: 2026-08-24 10:54 +03:30
Agent/Thread: Codex /root
Changed files:
  - `.github/workflows/ci.yml`
  - `apps/api/.env.example`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260824095500_public_auth_rate_limits/migration.sql`
  - `apps/api/src/app.factory.ts`
  - `apps/api/src/common/errors/api-error.ts`
  - `apps/api/src/common/logging/fastify-logging.config.ts`
  - `apps/api/src/config/environment.validation.ts`
  - `apps/api/src/modules/identity/application/ports/public-auth-rate-limiter.ts`
  - `apps/api/src/modules/identity/application/register-user.use-case.ts`
  - `apps/api/src/modules/identity/application/refresh-session.use-case.ts`
  - `apps/api/src/modules/identity/infrastructure/prisma-public-auth-rate-limiter.ts`
  - `apps/api/src/modules/identity/identity.module.ts`
  - `apps/api/src/modules/identity/presentation/http/auth.controller.ts`
  - `apps/api/test/identity-security-boundaries.spec.ts`
  - `apps/api/test/refresh-cookie-origin.spec.ts`
  - `apps/api/test/register-user.spec.ts`
  - `apps/api/test/session-use-cases.spec.ts`
  - `packages/api-client/openapi.json`
  - `packages/api-client/src/schema.generated.ts`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - migration bucketهای rate-limit را روی PostgreSQL خالی اعمال و تمام migrationها را smoke کرد → PASS (۱ فایل، ۱ تست)
Tests run:
  - اعتبارسنجی دقیق secretهای CI و استقلال access/refresh secret → PASS
  - typecheck مستقیم API و API client → PASS
  - تست use case ثبت‌نام، refresh و مرزهای امنیتی → PASS (۳ فایل، ۱۷ تست)
  - validation مستقیم trusted proxy برای production، CIDR معتبر و رد universal CIDR → PASS
  - OpenAPI runtime export و تولید API client با `openapi-typescript 7.10.0` → PASS
  - بررسی نگاشت مستقل `429` برای login و refresh در OpenAPI → PASS
  - `git diff --check` → PASS
  - Bugbot نهایی پس از remediation امنیتی → بدون یافته قابل اقدام
  - Security Review نهایی → بدون یافته
Result:
  - CI secretها با validation هماهنگ و pepper مستقل اضافه شد → PASS
  - redaction لاگ برای `currentPassword` و `newPassword` کامل شد → PASS
  - register پیش از Argon2 با bucketهای اتمیک IP/phone محدود می‌شود → PASS
  - refresh پیش از session lookup با bucketهای اتمیک IP/session محدود می‌شود → PASS
  - کلید bucketها hash شده، advisory lock مرتب دارد و bucket منقضی cleanup می‌شود → PASS
  - production فقط proxyهای IP/CIDR صریح را trust می‌کند و universal range رد می‌شود → PASS
  - Swagger authorization را persist نمی‌کند و UI/docs در production منتشر نمی‌شود → PASS
  - OpenAPI و client پاسخ‌های `429` صحیح و به‌روز دارند → PASS
  - Phase 01 پس از review مستقل به `DONE` رسید → PASS
Known limitations:
  - dependency cache محلی pnpm چند package ناقص استخراج کرده بود؛ verification نهایی با نسخه‌های دقیق lockfile در محیط موقت سالم اجرا شد و هیچ فایل dependency وارد Git نشد.
  - مقدار واقعی `TRUSTED_PROXIES` باید هنگام deployment بر اساس IP/CIDR load balancer نهایی تنظیم شود؛ production بدون آن start نمی‌شود.
Next task:
  - `F02-T01`

## F01-R01 — اصلاح metadata تزریق وابستگی در dev runtime API

Task ID: F01-R01
Completed at: 2026-08-24 12:15 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `apps/api/package.json`
  - `apps/api/scripts/dev.mjs`
  - `apps/api/test/dev-runtime.spec.ts`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - build با TypeScript compiler و بررسی runtime metadata پارامتر `BrowserOriginService` → PASS (`ConfigService`)
  - regression test مسیر dev runtime → PASS (۱ فایل، ۱ تست)
  - startup واقعی dev server با watch compiler → PASS (`Nest application successfully started`، port `3003`)
  - suite کامل API با PostgreSQL development → PASS؛ migration smoke به‌دلیل نبود `TEST_DATABASE_ADMIN_URL` skip شد
  - `tsc -p tsconfig.test.json --noEmit` و `git diff --check` → PASS
Result:
  - `tsx` که `emitDecoratorMetadata` را در runtime dev تولید نمی‌کرد از مسیر startup API حذف شد → PASS
  - dev runner ابتدا با compiler رسمی TypeScript build می‌کند، سپس compiler و Node را در watch mode نگه می‌دارد → PASS
  - `AuthModule`، `DatabaseModule` و `IdentityModule` با dependency injection واقعی initialize شدند → PASS
Known limitations:
  - migration smoke در این regression تکرار نشد؛ تغییر schema/migration وجود ندارد و آزمون‌های migration فاز در شواهد قبلی پاس شده‌اند.
Next task:
  - `F02-T01`

## F01-R02 — دکمه داشبورد در هدر وب برای session معتبر

Task ID: F01-R02
Completed at: 2026-08-24 12:30 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `apps/web/src/auth/web-session.ts`
  - `apps/web/src/auth/web-session.test.ts`
  - `apps/web/src/components/layout/Header.tsx`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - session/header و destination وب → PASS (۲ فایل، ۴ تست)
  - `tsc --noEmit` در `apps/web` → PASS
  - `next build` در `apps/web` → PASS
  - `git diff --check` → PASS
Result:
  - هدر با refresh cookie HttpOnly، session را بدون نگه‌داری token در browser بررسی می‌کند → PASS
  - session معتبر دکمه‌های ورود/ثبت‌نام را با دکمه «داشبورد» جایگزین می‌کند → PASS
  - بیمار به app کاربر و نقش‌های `DOCTOR`/`STAFF`/`ADMIN` به dashboard مدیریتی مسیردهی می‌شوند → PASS
Known limitations:
  - در حالت checking، تا دریافت نتیجه refresh یک skeleton کوتاه نمایش داده می‌شود تا دکمه‌های anonymous به‌صورت لحظه‌ای ظاهر نشوند.
Next task:
  - `F02-T01`

## F01-R03 — تشخیص اتصال LAN و session احراز هویت

Task ID: F01-R03
Completed at: 2026-08-24 13:23 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `apps/api/.env` (local ignored configuration)
  - `apps/app/.env` (local ignored configuration)
  - `apps/dashboard/.env` (local ignored configuration)
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - API listener روی `0.0.0.0:3003` → PASS
  - CORS preflight برای `localhost:3001` و `192.168.1.105:3001` → PASS (origin دقیق و credentials)
  - refresh بدون cookie از origin شبکه → `401 INVALID_REFRESH_TOKEN` با CORS header صحیح
  - bundle فعال app در port `3001` → API URL شبکه `http://192.168.1.105:3003`
Result:
  - `localhost` و `192.168.1.105` دو host متفاوت‌اند; refresh cookie host-only است و بین آن‌ها به‌اشتراک گذاشته نمی‌شود → PASS
  - لاگینی که با `localhost` ایجاد شده، هنگام بازکردن app با IP ارسال نمی‌شود و refresh درست نمی‌شود → PASS
Known limitations:
  - `SessionGate` برای request شبکه‌ای که timeout یا error ندارد، همیشه حالت checking را نمایش می‌دهد; این علت سر جا ماندن UI در برخی مرورگرهاست، اما اصلاحش خارج از scope تشخیص است.
Next task:
  - `F02-T01`

## F01-R04 — جلوگیری از گیرکردن session refresh در رابط‌ها

Task ID: F01-R04
Completed at: 2026-08-24 13:36 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `packages/api-client/src/index.ts`
  - `apps/app/src/auth/session.ts`
  - `apps/app/src/auth/session.test.ts`
  - `apps/dashboard/src/auth/session.ts`
  - `apps/dashboard/src/auth/session.test.ts`
  - `apps/web/src/auth/web-session.ts`
  - `apps/web/src/auth/web-session.test.ts`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - stale OpenAPI check و build مستقیم `api-client` → PASS
  - test manager اپ کاربر، شامل refresh معطل‌مانده → PASS (۱ فایل، ۵ تست)
  - test manager dashboard، شامل refresh معطل‌مانده → PASS (۱ فایل، ۹ تست)
  - test manager هدر وب، شامل refresh معطل‌مانده → PASS (۱ فایل، ۴ تست)
  - typecheck مستقیم app و web → PASS
  - typecheck مستقیم dashboard → فایل تولیدشدهٔ قبلی `.next/dev/types/validator.ts` نامعتبر بود و پیش از بررسی source متوقف شد
  - `git diff --check` → PASS
Result:
  - request refresh هر سه frontend پس از ۱۰ ثانیه به‌صورت کنترل‌شده fail می‌شود و manager به حالت anonymous می‌رود → PASS
  - `SessionGate` دیگر برای درخواست شبکه‌ای که هرگز settle نمی‌شود در حالت checking باقی نمی‌ماند و مسیر login عادی را اجرا می‌کند → PASS
  - هم‌زمانی refresh و رفتار موفق/ناموفق قبلی حفظ شده است → PASS
Known limitations:
  - این تغییر cookie را بین `localhost` و `192.168.1.105` مشترک نمی‌کند؛ برای session معتبر روی IP باید با همان IP وارد شوید یا همهٔ رابط‌ها را با یک hostname واحد باز کنید.
  - برای رفع خطای cache داشبورد، dev server dashboard را یک‌بار restart کنید تا `.next/dev/types/validator.ts` دوباره تولید شود.
Next task:
  - `F02-T01`

## F01-R05 — پایدارسازی build dashboard در حضور cache توسعه Next.js

Task ID: F01-R05
Completed at: 2026-08-24 14:15 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `apps/dashboard/tsconfig.json`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - build production مستقیم dashboard → PASS (۳۶ route)
  - build مستقیم API، شامل Prisma client generation و TypeScript → PASS
  - build مستقیم web → PASS (۵ route)
  - `corepack pnpm build` در root → PASS (۵ از ۵ package)
  - `git diff --check` → PASS
Result:
  - فایل‌های موقت `.next/dev` از ورودی typecheck production dashboard خارج شدند → PASS
  - cache ناقص Turbopack dev دیگر نمی‌تواند `next build` یا build کامل monorepo را متوقف کند → PASS
Known limitations:
  - ندارد
Next task:
  - `F02-T01`

## F01-R06 — اجرای یک‌دست production workspace

Task ID: F01-R06
Completed at: 2026-08-24 14:21 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `package.json`
  - `turbo.json`
  - `apps/web/package.json`
  - `apps/app/package.json`
  - `apps/dashboard/package.json`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - اجرای `corepack pnpm start` → PASS؛ API، web، app و dashboard هم‌زمان بالا آمدند
  - API روی `192.168.1.105:3003` و هر سه رابط Next روی `0.0.0.0` listen کردند → PASS
  - `git diff --check` → PASS
Result:
  - دستور root `pnpm start` همهٔ سرویس‌های production را موازی اجرا می‌کند → PASS
  - رابط‌های Next.js با hostname `0.0.0.0` برای دسترسی LAN اجرا می‌شوند → PASS
Known limitations:
  - پیش از `pnpm start` باید build موفق اجرا شده باشد.
Next task:
  - `F02-T01`

## F01-R07 — رفع ناسازگاری module format در اجرای dev API

Task ID: F01-R07
Completed at: 2026-08-24 16:08 +03:30
Agent/Thread: Codex / current task
Changed files:
  - `apps/api/package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/test/dev-runtime.spec.ts`
  - `plan/STATUS.md`
  - `plan/logs/phase-01.md`
Migrations:
  - ندارد
Tests run:
  - build مستقیم API، شامل Prisma client generation و TypeScript → PASS
  - `vitest run test/dev-runtime.spec.ts` → PASS (۱ فایل، ۳ تست)
  - اجرای مستقیم `node dist/main.js` → PASS؛ Nest بالا آمد و روی `192.168.1.105:3003` listen کرد
  - `git diff --check` → PASS
Result:
  - محدودهٔ package API صراحتاً CommonJS است و دیگر فایل CommonJS به‌صورت ESM اجرا نمی‌شود → PASS
  - Prisma Client با `moduleFormat = "cjs"` تولید می‌شود و با خروجی TypeScript API هم‌فرمت است → PASS
  - خطاهای `exports is not defined in ES module scope` و `import.meta outside a module` در اجرای dev رفع شدند → PASS
Known limitations:
  - پس از دریافت این تغییر، فرایند dev API در حال اجرا باید یک‌بار restart شود تا Prisma Client جدید تولید و بارگذاری شود.
Next task:
  - `F02-T01`
