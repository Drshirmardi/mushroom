# ADR-0001 — قرارداد احراز هویت و session مرورگر

- وضعیت: `ACCEPTED`
- تاریخ: `2026-08-20`
- تصمیم‌گیرندگان: `Repository owner (برنامه Phase 01 و دستور ادامه)، Codex /root`
- فاز/task مرتبط: `F01-T01`
- جایگزین ADR قبلی: `ندارد`

## Context

سه frontend مستقل روی originهای جدا به API متصل می‌شوند. احراز هویت فعلی `apps/web`
حافظه‌ای است و API هنوز قرارداد token/session ندارد. قرارداد باید هم‌زمان این نیازها را
پوشش دهد: access کوتاه‌عمر، refresh rotation و reuse detection، logout تکی و سراسری،
RBAC، bootstrap امن session پس از reload، CORS محدود و عدم نگهداری token خام در دیتابیس.

این تصمیم فقط contract فاز را تثبیت می‌کند. migration، endpoint و اتصال frontend در
taskهای بعدی Phase 01 انجام می‌شوند.

## Decision

### جریان‌ها و پاسخ‌ها

- `register` فقط شماره موبایل canonical و password را می‌پذیرد، کاربر را با نقش اولیه
  `PATIENT` می‌سازد، session ایجاد نمی‌کند و refresh cookie تنظیم نمی‌کند. نام و profile
  متعلق به Phase 02 هستند؛ `F01-T14` نباید نام را به API identity ارسال کند. کاربر پس از
  ثبت‌نام از مسیر `login` وارد می‌شود.
- `login` پس از بررسی credential یک device session جدید می‌سازد، refresh token را در
  cookie تنظیم می‌کند و access token را در response JSON برمی‌گرداند.
- `refresh` فقط refresh cookie را می‌پذیرد، token را یک‌بارمصرف rotate می‌کند و access
  token جدید می‌دهد. refresh token هرگز در JSON یا header پاسخ برنمی‌گردد.
- `logout` با access token، session جاری (`sid`) را revoke و cookie را پاک می‌کند.
- `logout-all` تمام sessionهای فعال کاربر را revoke و cookie جاری را پاک می‌کند.
- `GET /v1/auth/sessions` فقط metadata امن sessionهای همان کاربر را برمی‌گرداند؛
  `DELETE /v1/auth/sessions/:id` فقط session متعلق به همان کاربر را revoke می‌کند.
- failure ورود عمداً با خطای عمومی یکسان پاسخ داده می‌شود تا وجود شماره موبایل افشا نشود.

### access token

- JWT با الگوریتم ثابت `HS256` و secret مستقل با حداقل 256 بیت entropy امضا می‌شود.
- عمر پیش‌فرض access token `10 دقیقه` است و refresh نمی‌تواند آن را تمدید کند؛ فقط access
  token جدید صادر می‌کند.
- claimهای مجاز: `iss`، `aud`، `sub` (User UUID)، `sid` (Session UUID)، `roles`، `jti`،
  `iat` و `exp`.
- شماره موبایل، نام، password metadata، permissionهای پویا و داده پزشکی claim نیستند.
- API الگوریتم، issuer، audience، signature و زمان token را صریح validate می‌کند.
- frontend access token را فقط در حافظه نگه می‌دارد؛ `localStorage`، `sessionStorage` و
  cookie غیر-HttpOnly برای آن ممنوع است. درخواست API آن را با `Authorization: Bearer`
  می‌فرستد و bootstrap پس از reload از `refresh` استفاده می‌کند.
- تغییر password و تغییر نقش همه sessionها را revoke می‌کند. access token صادرشده ممکن
  است حداکثر تا پایان عمر ۱۰ دقیقه‌ای معتبر بماند؛ عملیات حساس باید authorization جاری
  resource/action را از منبع اصلی بررسی کند.

### refresh cookie و CORS/CSRF

- نام production برابر `__Host-sz_refresh` است و ویژگی‌های آن `HttpOnly`، `Secure`،
  `SameSite=Lax` و `Path=/` هستند؛ `Domain` تنظیم نمی‌شود. محیط local HTTP از نام
  `sz_refresh_dev` بدون `Secure` استفاده می‌کند و سایر ویژگی‌ها یکسان‌اند.
- deployment frontend و API باید same-site و HTTPS باشد (برای نمونه زیردامنه‌های یک
  registrable domain). تغییر به cross-site نیازمند بازبینی این ADR است.
- login با `remember=false` یک family با مهلت مطلق `24 ساعت` و با `remember=true` مهلت
  مطلق `30 روز` می‌سازد. rotation این deadline را جلو نمی‌برد؛ `Max-Age` cookie از زمان
  باقی‌مانده همان deadline بیشتر نیست.
- تمام fetchهای browser که cookie نیاز دارند از `credentials: 'include'` استفاده می‌کنند.
- CORS فقط originهای دقیق `APP_ORIGINS` را با credentials می‌پذیرد؛ wildcard و بازتاب
  origin ناشناخته ممنوع است.
- endpointهای browser auth که state را تغییر می‌دهند (`register`، `login`، `refresh`،
  `logout`، `logout-all` و revoke session)، علاوه بر `SameSite=Lax`، header `Origin` را با
  allowlist تطبیق می‌دهند. Origin غایب/نامعتبر در درخواست browser رد می‌شود.

### session و refresh rotation

- هر login یک `Session` مستقل می‌سازد. حداقل فیلدهای منطقی آن عبارت‌اند از: `id`،
  `userId`، `refreshTokenHash`، `refreshGeneration`، `remembered`، `createdAt`،
  `lastUsedAt`، `expiresAt`، `revokedAt`، `revokedReason` و metadata محدود دستگاه.
- refresh token یک مقدار opaque با ساختار نسخه‌دار شامل شناسه lookup غیرمحرمانه session و
  verifier تصادفی حداقل 256 بیتی است. فقط HMAC-SHA-256 آن با pepper مستقل در دیتابیس ذخیره
  می‌شود؛ token و verifier خام persist یا log نمی‌شوند.
- rotation در یک transaction و با قفل/کنترل هم‌زمانی row انجام می‌شود: active بودن و
  deadline بررسی، hash فعلی ثابت‌زمان مقایسه، verifier جدید تولید و hash/generation به‌صورت
  اتمیک جایگزین می‌شود.
- ارائه token قدیمی یا verifier ناهماهنگ برای session شناخته‌شده reuse محسوب و همان session
  فوراً با دلیل `REFRESH_REUSE_DETECTED` revoke می‌شود. refresh هم‌زمان در frontend باید
  single-flight باشد؛ grace window تعریف نمی‌شود.
- revoke idempotent است. session منقضی یا revoke‌شده refresh نمی‌شود و cookie پاسخ پاک
  می‌شود.
- metadata دستگاه فقط برای امنیت session است: user-agent محدودشده، زمان آخرین استفاده و
  IP با retention محدود. refresh hash، IP کامل و user-agent خام در response عمومی نمایش
  داده نمی‌شوند.

## Alternatives Considered

- نگهداری access و refresh token در `localStorage`: به‌دلیل افزایش اثر XSS رد شد.
- session cookie برای تمام APIها: معتبر است، اما CSRF را به تمام endpointهای business
  گسترش می‌دهد و contract bearer موجود OpenAPI را بی‌استفاده می‌کند.
- refresh JWT: claim قابل‌خواندن مزیتی برای refresh ندارد و revocation/rotation همچنان
  state دیتابیس می‌خواهد؛ token opaque ساده‌تر انتخاب شد.
- refresh token بدون شناسه session: lookup reuse پس از rotation را دشوار می‌کند؛ ساختار
  نسخه‌دار session-id + verifier انتخاب شد.
- sliding expiration نامحدود: احتمال session بلندمدت ناخواسته دارد؛ deadline مطلق انتخاب شد.

## Consequences

### پیامدهای مثبت

- XSS نمی‌تواند refresh token را از JavaScript بخواند و CSRF به endpointهای cookie-based
  محدود و قابل‌کنترل می‌ماند.
- revoke، session management و reuse detection بدون ذخیره token خام قابل پیاده‌سازی‌اند.
- token claims کمینه‌اند و role/resource authorization از داده هویتی و پزشکی جدا می‌ماند.

### هزینه‌ها و trade-offها

- frontend به refresh single-flight و نگهداری access token در حافظه نیاز دارد.
- API به rotation تراکنشی، pepper مستقل و بررسی Origin نیاز دارد.
- revoke فوری access token عمومی نیست و window آن حداکثر ۱۰ دقیقه است.

### ریسک‌ها

- retry هم‌زمان refresh می‌تواند به‌عنوان reuse شناخته شود؛ کلاینت باید درخواست‌ها را تجمیع کند.
- deploy روی دامنه cross-site با `SameSite=Lax` کار نمی‌کند و بدون بازبینی نباید انجام شود.
- session lookup id محرمانه نیست؛ endpoint revoke باید ownership را مستقل بررسی کند.

## Implementation Impact

- `F01-T02` مدل و constraintهای Session را مطابق این قرارداد migration می‌کند.
- `F01-T07` access JWT، validation claimها و guard را پیاده می‌کند.
- `F01-T08` cookie، pepper، rotation تراکنشی و reuse detection را پیاده می‌کند.
- `F01-T09` revoke تکی/سراسری و session management را تکمیل می‌کند.
- `F01-T13` contract response و cookie auth را در OpenAPI ثبت می‌کند.
- `F01-T14` تا `F01-T16` access token حافظه‌ای، refresh bootstrap و credentialed CORS را
  در frontendها اعمال می‌کنند.

## Validation

- تست API برای login و نبود refresh token در body/log.
- تست claimهای مجاز و رد الگوریتم، issuer، audience و token منقضی.
- integration test PostgreSQL برای rotation موفق، refresh هم‌زمان و reuse detection.
- تست cookie attributes در development و production.
- تست CORS/Origin برای سه origin مجاز و origin ناشناخته.
- تست logout، logout-all، ownership session و تغییر password/role.

## Revisit Trigger

- frontend یا API روی registrable domain جدا deploy شود.
- native mobile client بدون browser cookie اضافه شود.
- نیاز عملیاتی به revoke فوری تمام access tokenها اثبات شود.
- سرویس مستقلی خارج از modular monolith نیازمند verify کردن token شود.
