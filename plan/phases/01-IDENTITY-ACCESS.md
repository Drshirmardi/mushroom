# Phase 01 — Identity & Access

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `A`
- پیش‌نیاز: `Phase 00 DONE`
- خروجی اصلی: ثبت‌نام، ورود، session و authorization واقعی

## مدل‌های داده

- `User`
- `Credential`
- `Session`
- `Role`
- `UserRole`
- `LoginAttempt`
- `AuditEvent`

نقش‌های اولیه:

```text
PATIENT
DOCTOR
STAFF
ADMIN
```

## Taskها

- [ ] `F01-T01` — نهایی‌کردن auth flow، cookie policy، token claims و session model
- [ ] `F01-T02` — migration مدل‌های identity
- [ ] `F01-T03` — normalize شماره موبایل و unique constraint
- [ ] `F01-T04` — password hashing با Argon2id و policy رمز
- [ ] `F01-T05` — register use case و endpoint
- [ ] `F01-T06` — login use case، rate limit و ثبت login attempt
- [ ] `F01-T07` — access token و auth guard
- [ ] `F01-T08` — refresh token rotation، hash storage و reuse detection
- [ ] `F01-T09` — logout، logout-all و revoke session
- [ ] `F01-T10` — endpointهای `/me` و change password
- [ ] `F01-T11` — RBAC guard و permission contract پایه
- [ ] `F01-T12` — audit رویدادهای امنیتی
- [ ] `F01-T13` — OpenAPI و API client احراز هویت
- [ ] `F01-T14` — اتصال login/signup در `apps/web`
- [ ] `F01-T15` — session bootstrap و route protection در `apps/app`
- [ ] `F01-T16` — route protection نقش‌محور در `apps/dashboard`
- [ ] `F01-T17` — حذف auth حافظه‌ای پس از verification
- [ ] `F01-T18` — تست امنیت و ثبت evidence

## Endpointها

```text
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/logout-all
GET    /v1/auth/sessions
DELETE /v1/auth/sessions/:id
GET    /v1/me
PATCH  /v1/me
POST   /v1/me/change-password
```

## قواعد دامنه

- شماره موبایل canonical و unique است.
- password خام هیچ‌وقت persist یا log نمی‌شود.
- refresh token خام persist نمی‌شود.
- reuse یک refresh token rotate‌شده، خانواده session را revoke می‌کند.
- logout-all تمام sessionهای کاربر را revoke می‌کند.
- کاربر بدون نقش مدیریتی dashboard API را دریافت نمی‌کند.
- تغییر password تمام sessionهای دیگر را طبق policy revoke می‌کند.

## تست‌های اجباری

- register با شماره تکراری
- login با password اشتباه
- rate limit login
- access token منقضی
- refresh موفق
- refresh reuse detection
- logout و logout-all
- role guard
- عدم نشت password/token در response و log
- CORS و credential flow سه frontend

## معیار خروج

- جریان register → login → refresh → logout واقعی است.
- `web` دیگر از auth in-memory استفاده نمی‌کند.
- app و dashboard session خود را از API تشخیص می‌دهند.
- dashboard برای نقش نامعتبر قابل دسترسی نیست.
- authorization test matrix پاس شده است.

## خارج از scope

- OTP و SMS
- MFA
- OAuth/social login
- PatientProfile و DoctorProfile
- permission builder پویا در dashboard
