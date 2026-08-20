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
