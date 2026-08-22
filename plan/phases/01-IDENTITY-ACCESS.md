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

- [x] `F01-T01` — نهایی‌کردن auth flow، cookie policy، token claims و session model
- [x] `F01-T02` — migration مدل‌های identity
- [x] `F01-T03` — normalize شماره موبایل و unique constraint
- [x] `F01-T04` — password hashing با Argon2id و policy رمز
- [x] `F01-T05` — register use case و endpoint
- [x] `F01-T06` — login use case، rate limit و ثبت login attempt
- [x] `F01-T07` — access token و auth guard
- [x] `F01-T08` — refresh token rotation، hash storage و reuse detection
- [x] `F01-T09` — logout، logout-all و revoke session
- [x] `F01-T10` — endpointهای `/me` و change password
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

## قرارداد Task F01-T01

تصمیم اجرایی این task در
[`ADR-0001 — قرارداد احراز هویت و session مرورگر`](../decisions/ADR-0001-auth-session-contract.md)
ثبت شده است. معیار تکمیل task:

- جریان register/login/refresh/logout و مرز پاسخ/cookie بدون ابهام تعریف شده باشد.
- policy عمر access/refresh، `remember`، cookie و storage سمت frontend مشخص باشد.
- claimهای مجاز JWT و ممنوعیت PII در token مشخص باشد.
- مدل منطقی Session، rotation اتمیک و رفتار reuse detection مشخص باشد.
- CORS، Origin validation و فرض same-site deployment مشخص باشد.
- اثر تصمیم بر taskهای `F01-T02` تا `F01-T16` و تست‌های لازم ثبت شده باشد.

## قرارداد Task F01-T03

- نمایش canonical شماره موبایل ایران برابر `+989XXXXXXXXX` است.
- ارقام لاتین، فارسی و عربی پذیرفته می‌شوند؛ قالب‌های `09...`، `9...`، `98...`،
  `+98...` و `0098...` به یک مقدار تبدیل می‌شوند.
- فاصله، خط تیره و پرانتز فقط به‌عنوان جداکننده پذیرفته می‌شوند؛ حروف، کشور دیگر،
  تلفن ثابت و طول نامعتبر رد می‌شوند.
- application باید پیش از persistence از normalizer دامنه استفاده کند.
- PostgreSQL علاوه بر unique index، canonical format را با check constraint enforce می‌کند.
- migration باید داده موجود را normalize کند و در برخورد با مقدار نامعتبر یا collision
  صریحاً fail شود؛ اصلاح یا حذف ساکت داده مجاز نیست.

## قرارداد Task F01-T04

- رمز تک‌عاملی حداقل ۱۵ و حداکثر ۱۲۸ Unicode code point دارد؛ space و Unicode مجازند.
- رمز با NFC normalize می‌شود ولی trim، lowercase یا truncate نمی‌شود.
- composition rule، تغییر دوره‌ای اجباری و سؤال امنیتی بخشی از policy نیستند.
- control character، مقدار تماماً whitespace و مقادیر baseline/context blocklist رد می‌شوند؛
  Unicode format characterهایی مانند نیم‌فاصله فارسی حفظ می‌شوند.
- خطای policy code پایدار دارد و password خام را در message بازتاب نمی‌دهد.
- hash با Argon2id v19، salt تصادفی ۱۶ بایتی، خروجی ۳۲ بایتی، memory برابر ۶۴ MiB،
  سه pass و parallelism چهار تولید می‌شود.
- verify برای hash یا ورودی malformed فقط `false` می‌دهد و جزئیات داخلی را نشت نمی‌دهد.
- hashهای غیر-Argon2id یا دارای cost/version قدیمی برای rehash علامت‌گذاری می‌شوند.

## قرارداد Task F01-T05

- `POST /v1/auth/register` فقط `phone` و `password` می‌پذیرد و با `201` کاربر بدون session می‌سازد.
- شماره پیش از persistence canonical و رمز پیش از transaction با Argon2id hash می‌شود.
- ساخت `User`، `Credential` و assignment نقش `PATIENT` در یک transaction انجام می‌شود.
- پاسخ فقط `id`، `phone`، `roles` و `createdAt` دارد؛ password/hash/token/cookie برنمی‌گردد.
- شماره تکراری در race نیز یک user باقی می‌گذارد و با `PHONE_ALREADY_REGISTERED`/`409` پاسخ می‌دهد.
- phone/password نامعتبر با code پایدار و `422` پاسخ می‌گیرند و مقدار حساس در خطا echo نمی‌شود.
- نام و profile خارج از مالکیت identity هستند و فیلد اضافه توسط validation سراسری رد می‌شود.
- نقش‌های سیستمی به‌عنوان reference data توسط migration قابل‌اتکای deployment ایجاد می‌شوند.

## قرارداد Task F01-T06

- هسته login شماره را canonical می‌کند و برای password اشتباه، حساب ناشناخته، شماره نامعتبر
  و حساب disabled فقط خطای عمومی `INVALID_CREDENTIALS` برمی‌گرداند.
- verify برای حساب ناشناخته/شماره نامعتبر با Argon2id dummy hash هم‌هزینه اجرا می‌شود تا مسیر
  سریع قابل استفاده برای account enumeration نباشد.
- پنجره rate limit برابر ۱۵ دقیقه است: حداکثر ۵ failure برای هر شماره canonical و ۳۰ failure
  برای هر IP؛ success و denialهای قبلی پنجره را تمدید نمی‌کنند.
- رزرو attempt با advisory lock تراکنشی PostgreSQL انجام می‌شود؛ attemptهای `PENDING` نیز در
  سقف شمرده می‌شوند تا درخواست موازی یا crash نتواند محدودیت را دور بزند.
- هر درخواست پذیرفته‌شده با outcome نهایی `SUCCESS`، `INVALID_CREDENTIALS` یا
  `ACCOUNT_DISABLED` و هر denial با `RATE_LIMITED` ثبت می‌شود؛ password خام ثبت نمی‌شود.
- IP برای use case الزامی است، user-agent حداکثر ۵۱۲ کاراکتر ذخیره می‌شود و شماره malformed
  به‌جای مقدار خام با sentinel غیرحساس `INVALID` ثبت می‌شود.
- این task هسته login را فراهم می‌کند؛ endpoint نهایی پس از ایجاد access token و session در
  `F01-T07` و `F01-T08` فعال می‌شود تا پاسخ login ناقص و بدون session منتشر نشود.

## قرارداد Task F01-T07

- access token یک JWT ده‌دقیقه‌ای با الگوریتم ثابت `HS256`، secret مستقل حداقل ۳۲ بایت،
  issuer و audience صریح است؛ الگوریتم جایگزین پذیرفته نمی‌شود.
- payload دقیقاً claimهای `iss`، `aud`، `sub`، `sid`، `roles`، `jti`، `iat` و `exp` را دارد؛
  claim اضافه، PII، permission پویا یا lifetime طولانی‌تر رد می‌شود.
- `sub`، `sid` و `jti` UUID معتبر و roleها مجموعه‌ای غیرتکراری از چهار role مصوب هستند.
- guard به‌صورت global همه routeها را protected می‌کند؛ فقط handler/controller دارای
  decorator صریح `Public` بدون bearer token قابل دسترسی است.
- header باید یک Bearer credential منفرد باشد. نبودن header، قالب malformed، signature یا
  claim نامعتبر و token منقضی همگی با پاسخ عمومی `UNAUTHORIZED` و بدون جزئیات parser رد می‌شوند.
- principal اعتبارسنجی‌شده شامل user/session/token id، roleها و زمان‌های token روی request
  قرار می‌گیرد؛ guard در این task برای هر درخواست session را از دیتابیس query نمی‌کند.
- صدور token به session id نیاز دارد؛ اتصال login به صدور token پس از ساخت session در
  `F01-T08` انجام می‌شود.

## قرارداد Task F01-T08

- refresh token یک credential opaque و versioned شامل session UUID و verifier تصادفی ۲۵۶بیتی
  است؛ مقدار خام فقط در cookie مرورگر قرار می‌گیرد و هرگز در دیتابیس، response body یا log
  ذخیره نمی‌شود.
- دیتابیس فقط HMAC-SHA256 کل token را با pepper مستقل از access-token secret نگه می‌دارد؛
  مقایسه hash با زمان ثابت انجام می‌شود.
- login یک Session با deadline مطلق ۲۴ساعته یا، برای `remember=true`، سی‌روزه می‌سازد و access
  token ده‌دقیقه‌ای را در JSON برمی‌گرداند.
- refresh در transaction و با row lock انجام می‌شود؛ hash جایگزین، generation یک واحد زیاد و
  metadata به‌روز می‌شود، اما deadline اولیه تمدید نمی‌شود.
- ارائه token قدیمی یا hash نامطابق برای session فعال بدون grace period کل همان session را با
  دلیل `REFRESH_REUSE_DETECTED` revoke می‌کند؛ درخواست‌های refresh هم‌زمان نیز از همین قرارداد
  پیروی می‌کنند.
- خطاهای malformed، مفقود، منقضی، revoked و reused همگی پاسخ عمومی `INVALID_REFRESH_TOKEN`/`401`
  می‌دهند و cookie پاک می‌شود.
- cookie در production با نام `__Host-sz_refresh` و گزینه‌های `HttpOnly`، `Secure`،
  `SameSite=Lax` و `Path=/` تنظیم می‌شود؛ development نام صریح جداگانه و بدون `Secure` دارد.
- CORS فقط originهای دقیق `APP_ORIGINS` را با credentials می‌پذیرد و endpointهای browser در
  صورت وجود header مبدأ، آن را دوباره با همان allowlist اعتبارسنجی می‌کنند.

## قرارداد Task F01-T09

- `POST /v1/auth/logout` فقط session جاری claimشده در `sid` را در مالکیت `sub` با دلیل
  `LOGOUT` revoke و refresh cookie را پاک می‌کند.
- `POST /v1/auth/logout-all` تمام sessionهای revokeنشده همان کاربر را با دلیل `LOGOUT_ALL`
  revoke و refresh cookie جاری را پاک می‌کند.
- revoke تکی و سراسری idempotent هستند و پاسخ موفق `204` بدون body دارند؛ access tokenهای
  صادرشده طبق ADR stateless تا پایان عمر حداکثر ده‌دقیقه‌ای خود معتبر می‌مانند.
- `DELETE /v1/auth/sessions/:id` فقط session متعلق به همان `sub` را revoke می‌کند و برای id
  موجود ولی متعلق به کاربر دیگر نیز همان `204` را می‌دهد تا ownership افشا نشود؛ حذف session
  جاری cookie را هم پاک می‌کند.
- `GET /v1/auth/sessions` فقط sessionهای فعال و منقضی‌نشده همان کاربر را با page pagination
  و حداکثر ۵۰ مورد برمی‌گرداند؛ response به id، وضعیت current/remembered و timestampهای امن
  محدود است و refresh hash، IP و user-agent خام را نمایش نمی‌دهد.
- تمام endpointها bearer-protected هستند و عملیات state-changing، Origin حاضر را با allowlist
  مصوب اعتبارسنجی می‌کنند.

## قرارداد Task F01-T10

- `GET /v1/me` حساب active را از دیتابیس می‌خواند و فقط id، شماره canonical، status، roleها،
  زمان ساخت و `passwordChangedAt` را برمی‌گرداند؛ داده profile متعلق به Phase 02 است.
- `PATCH /v1/me` در این فاز فقط شماره ورود را تغییر می‌دهد، password فعلی را الزامی می‌کند،
  شماره جدید را canonical/unique می‌سازد و برای شماره canonical بدون تغییر idempotent است.
- password اشتباه در عملیات حساس با `INVALID_CURRENT_PASSWORD`/`401` و شماره تکراری با
  `PHONE_ALREADY_REGISTERED`/`409` پاسخ می‌گیرد؛ هیچ password یا hash در response/error نیست.
- `POST /v1/me/change-password` password فعلی را verify، یک password متفاوت را با همان policy
  و Argon2id مصوب hash و `passwordChangedAt` را به‌روز می‌کند.
- تغییر credential و revoke تمام sessionهای revokeنشده با دلیل `PASSWORD_CHANGED` در یک
  transaction انجام می‌شود؛ cookie جاری پاک و پاسخ موفق `204` است، بنابراین ورود دوباره لازم است.
- update شرطی روی hash قبلی تضمین می‌کند دو درخواست هم‌زمان با password قدیمی فقط یک موفقیت
  داشته باشند؛ درخواست stale همان خطای عمومی password فعلی را دریافت می‌کند.
- هر سه endpoint bearer-protected هستند؛ PATCH و change-password، Origin حاضر را با allowlist
  مصوب اعتبارسنجی می‌کنند و حساب disabled را نمی‌پذیرند.
