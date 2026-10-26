# قرارداد اجرایی OTP و مدیریت آداپتورهای پیامک V1

- وضعیت: `OWNER-AUTHORIZED / READY FOR IMPLEMENTATION CLAIM`
- تاریخ تدوین: `2026-10-11`
- دامنه: `apps/api`، `apps/web`، `apps/dashboard`، Prisma/OpenAPI/generated client و deployment
- change control پیشنهادی: `F01-R06 — Passwordless OTP authentication and modular SMS provider management`
- provider واقعی نخست: `farazsms`

## دستور مستقیم به مدل اجراکننده

این سند را قرارداد محصول و baseline اجرای این قابلیت بدان. ابتدا `AGENTS.md` و تمام اسناد startup اجباری repository
را بخوان، وضعیت Git و `plan/STATUS.md` را بررسی کن و تغییرهای unrelated را حفظ کن. سپس همین قابلیت را در plan فعال
به‌عنوان corrective رسمی `F01-R06` ثبت و طبق workflow repository به taskهای reviewable و وابسته تقسیم کن. مالک پروژه
اجرای کامل scope این سند را صریحاً مجاز کرده است؛ برای تصمیم‌های معمول پیاده‌سازی دوباره تأیید نگیر. تا تکمیل backend،
migration، OpenAPI/client، web، dashboard، تست، commitهای task-level، push روی `dev` و مشاهده deployment ادامه بده.

این کار یک prototype، mock، صفحه نمایشی یا صرفاً طرح معماری نیست. هیچ provider ساختگی در runtime ثبت نکن، هیچ
credential یا OTP واقعی در Git/log/test قرار نده و هیچ SMS واقعی یا تست اتصال واقعی را بدون credential و اقدام صریح
ADMIN ارسال نکن.

اگر `plan/STATUS.md` هنگام شروع batch دیگری را active نشان می‌دهد، ownership آن را رعایت کن و طبق handoff ادامه بده؛
scope را دور نزن. چون OTP در قرارداد اولیه Phase 01 خارج از scope بوده، پیش از implementation یک change-control کوتاه
برای `F01-R06` زیر Phase 12 ثبت کن. ADR-0001 را بازنویسی نکن؛ یک ADR جدید برای extension ورود passwordless، session
reuse و provider boundary بساز و اثر آن بر ADR-0001 را روشن کن.

## هدف محصول

یک سیستم OTP امن، production-ready و مستقل از provider بساز که:

1. در `apps/web` روش اصلی ورود و ثبت‌نام باشد؛
2. ورود و ثبت‌نام با رمز عبور را به‌عنوان روش جایگزین و قابل دسترس حفظ کند؛
3. همان Session، refresh-cookie، access-token، CORS/Origin و RBAC فعلی را استفاده کند؛
4. ارسال پیامک را از منطق OTP جدا کند؛
5. اولین adapter واقعی را برای FarazSMS پیاده کند؛
6. تنظیمات، credential، فعال/غیرفعال‌سازی، provider پیش‌فرض، تست اتصال، پیامک تست و policy OTP را از dashboard با UX
   شفاف و responsive مدیریت کند؛
7. provider دوم را بدون تغییر OTP engine قابل افزودن کند، ولی در این task provider جعلی یا آینده‌نما نسازد.

## واقعیت‌های repository که باید حفظ شوند

- monorepo با `pnpm@10.10.0` و Turborepo است؛ package را با pnpm و فقط در `apps/api` اضافه کن.
- API یک NestJS modular monolith با Fastify، Prisma و PostgreSQL است.
- شماره موبایل canonical برابر `+989XXXXXXXXX` است و `normalizeIranianMobile` ارقام فارسی/عربی و قالب‌های مصوب را
  پوشش می‌دهد؛ منطق موازی برای normalization نساز.
- `User.credential` اختیاری است. کاربر OTP-only نباید password تصادفی، placeholder hash یا credential جعلی داشته باشد.
- Session فعلی شامل access token ده‌دقیقه‌ای، refresh cookie امن، rotation/reuse detection و deadline مطلق ۲۴ساعته یا
  سی‌روزه است. OTP پس از verification موفق باید دقیقاً همین infrastructure را فراخوانی کند.
- access token فقط در حافظه frontend می‌ماند و refresh token فقط در cookie `HttpOnly` است؛ این قرارداد تغییر نکند.
- public auth endpointها `Origin` را validate و درخواست‌های browser را با `credentials: include` اجرا می‌کنند.
- rate limit عمومی auth هم‌اکنون PostgreSQL-backed و multi-instance-safe است؛ همان الگو را reuse/extend کن.
- `AuditEvent` و helperهای identity موجودند؛ actionهای OTP/provider را بدون secret، raw OTP یا شماره کامل audit کن.
- dashboard نقش‌های `ADMIN/DOCTOR/STAFF` را می‌شناسد، ولی تغییر provider، policy و test SMS فقط برای `ADMIN` مجاز است.
- payment provider subsystem نمونه خوبی برای registry، revision، write-only credential، enable/default، audit و UX
  کارت/پنل است؛ code یا table آن را برای SMS reuse نکن. domain پیامک global/system-scoped و پیش از انتخاب clinic است.
- encryption فعلی پرداخت payment-specific است. برای SMS سرویس/مدل مستقل با authenticated encryption و keyring مستقل
  بساز؛ secretهای جدید باید از deployment secret files/env وارد شوند.
- OpenAPI checked-in و `packages/api-client` generated هستند؛ endpoint جدید بدون regenerate و drift check پذیرفته نیست.
- settings dashboard اکنون read-first با کارت و editor متمرکز است. SMS & OTP را به همان information architecture اضافه
  کن و فایل بزرگ settings را بی‌دلیل پیچیده‌تر نکن؛ feature component و API adapter مستقل بساز.
- iconها از `lucide-react` و font از Yekan Bakh self-hosted هستند؛ asset خارجی اضافه نکن.
- محیط shared dev با Docker Compose و deployment incremental بالا می‌آید؛ migration فقط `prisma migrate deploy` است.

## قرارداد UX احراز هویت

### ورود (`/login`)

- روش اولیه و اولین چیزی که کاربر می‌بیند «ورود با کد یک‌بارمصرف» باشد.
- step اول: شماره موبایل، گزینه «مرا به خاطر بسپار»، CTA واضح «ارسال کد».
- step دوم: عنوان شامل شماره mask‌شده، input شش‌رقمی LTR، paste کامل، `autocomplete="one-time-code"`، focus مناسب،
  countdown انقضا، countdown ارسال مجدد، تغییر شماره، loading، status و error قابل دسترس.
- پس از verify موفق همان redirect فعلی اجرا شود: نقش مدیریتی به dashboard و بیمار به app یا `next` امن.
- یک switch/tab/segmented-control قابل دسترس با عنوان روشن «ورود با رمز عبور» وجود داشته باشد. فرم password فعلی،
  remember، error severity و redirect behavior حفظ شوند.
- تغییر method draft و error روش دیگر را leak نکند. back/forward و mobile keyboard تجربه را خراب نکنند.

### ثبت‌نام (`/signup`)

- OTP روش اصلی باشد و همان component/state machine مشترک را با copy متناسب ثبت‌نام استفاده کند.
- V1 برای جلوگیری از account enumeration و UX دوگانه، جریان OTP را به‌صورت passwordless authentication واحد تعریف کن:
  بعد از verify، اگر user فعال وجود دارد session او ساخته می‌شود؛ اگر وجود ندارد، User بدون Credential با نقش PATIENT و
  PatientProfile برای active clinic در یک transaction ساخته و سپس session ایجاد می‌شود.
- قفل/constraint باید race دو verify یا register هم‌زمان را حل کند؛ unique phone منبع نهایی حقیقت است.
- کاربر جدید OTP-only credential جعلی ندارد. password login برای او تا زمانی که credential واقعی تنظیم نکرده معتبر نیست.
- بخش جایگزین «ثبت‌نام با رمز عبور» قرارداد فعلی `POST /v1/auth/register` و policy Argon2id را حفظ کند؛ refactor مشترک
  مجاز است ولی backward compatibility endpoint و errorهای فعلی نشکند.
- checkbox قوانین موجود را به ادعای حقوقی جدید تبدیل نکن. copy باید تنها رفتار واقعی موجود را بیان کند.

### رفتار مشترک

- RTL فارسی، شماره و OTP با `dir=ltr`، touch target مناسب، keyboard navigation، screen-reader label، focus management و
  responsive layout برای موبایل/دسکتاپ اجباری است.
- timer از `expiresAt/resendAvailableAt` سرور مشتق شود، نه اینکه client منبع حقیقت باشد.
- refresh صفحه نباید OTP یا token خام را در local/session storage ذخیره کند. challenge ID غیرمحرمانه می‌تواند فقط در
  state لازم نگه‌داری شود؛ persistence آن باید کمینه و مستند باشد.
- پیام‌ها existence کاربر را افشا نکنند. request اولیه برای شماره موجود/ناموجود response عمومی هم‌شکل دارد.
- password reset، MFA، تغییر شماره و phone verification مستقل در V1 فعال نشوند.

## قرارداد جریان OTP V1

فقط purpose زیر را runtime کن:

```ts
type OtpPurpose = "AUTHENTICATION";
```

زیرساخت می‌تواند enum قابل گسترش داشته باشد، ولی purposeهای `PASSWORD_RESET`، `PHONE_CHANGE` یا `MFA` تا وجود use case
واقعی endpoint/UI عملیاتی نشوند.

### request

- ورودی: `phone`، `remember` و header `Idempotency-Key` معتبر.
- خروجی عمومی: `challengeId` opaque، `expiresAt`، `resendAvailableAt` و destination mask‌شده؛ هرگز code یا user existence.
- default policy: شش رقم، عمر ۱۲۰ ثانیه، cooldown شصت ثانیه، حداکثر پنج verify ناموفق، سه درخواست برای هر phone در
  پانزده دقیقه و محدودیت IP فعال.
- کد فقط روی backend با `crypto.randomInt` و zero-padding ساخته شود؛ `Math.random()` ممنوع است.
- verifier با HMAC-SHA-256 و secret مستقل `OTP_PEPPER` روی context نسخه‌دار شامل challenge id، purpose، canonical phone
  و code ساخته شود. hash ساده/بدون کلید برای فضای شش‌رقمی کافی نیست.
- raw code فقط در memory همان dispatch باقی بماند و هرگز در database، response، log، audit، trace یا analytics نرود.

### delivery state

- challenge و delivery attempt stateهای صریح داشته باشند: دست‌کم pending، accepted، failed، unknown، consumed، expired،
  superseded/locked.
- provider call خارج از transaction دیتابیس انجام شود. config/credential revision انتخاب‌شده روی attempt snapshot شود.
- rejection قطعی challenge را غیرقابل verify می‌کند. timeout/نتیجه مبهم `UNKNOWN` است، retry خودکار ندارد و اگر SMS دیر
  رسید verification همان challenge تا deadline می‌تواند معتبر بماند.
- resend ناموفق challenge قبلیِ هنوز معتبر را بی‌دلیل invalidate نکند. پس از accepted/unknown شدن challenge جدید، قبلی
  به‌صورت اتمیک supersede شود.
- idempotency و cooldown باید double-click/retry شبکه را بدون ارسال دوباره کنترل کنند.

### verify

- ورودی: `challengeId` و `code`؛ شماره یا provider از client دوباره پذیرفته نشود.
- expiry، state، purpose، attempt limit و verifier constant-time بررسی شوند.
- verify/consume با row lock یا conditional atomic update انجام شود تا دو request هم‌زمان هرگز هر دو موفق نشوند.
- attempt ناموفق شمارنده را اتمیک زیاد کند؛ پس از سقف challenge lock/consume شود.
- verify موفق در یک transaction identity را resolve/create می‌کند و challenge را consume می‌کند. session creation باید
  از use case مشترک فعلی استخراج/reuse شود تا password و OTP session behavior یکسان بماند.
- provider acceptance هیچ‌گاه verification یا session ایجاد نمی‌کند.

## مدل داده و migration

نام نهایی modelها را با convention Prisma انتخاب کن، ولی حداقل این مفاهیم را versioned migration بده:

1. `SmsProviderConfig`: providerCode unique، enabled، isDefault/active، activeRevisionId، safe health metadata و timestamps.
2. `SmsProviderConfigRevision`: immutable non-secret config JSON، credentialVersionId، capability snapshot، revision،
   actor، idempotency و timestamps.
3. `SmsProviderCredentialVersion`: ciphertext، nonce، auth tag، key version، status و rotation/retention metadata.
4. `OtpPolicy`: singleton/versioned policy با bounds امن، enabled kill switch و audit metadata.
5. `OtpChallenge`: purpose، canonical phone، verifier، state، expiry/cooldown، attempt count، consumed/superseded timestamps،
   idempotency/context و provider/config revision references.
6. `SmsDeliveryAttempt`: challenge/test correlation، provider/config revision، recipient hash/masked form، outcome، safe
   provider reference، normalized error، timestamps؛ message body، raw phone و code ذخیره نشود.

الزام‌ها:

- timestampها UTC/timestamptz، indexها بر اساس query واقعی، unique/idempotency/check constraint و active/default invariant
  در database تا حد عملی enforce شوند.
- OTP challenge retention کوتاه و cleanup bounded تعریف شود. delivery/audit retention را مستند کن.
- migration قبلی را بازنویسی نکن؛ migration جدید بساز و replay روی PostgreSQL 16 خالی اجرا کن.
- active provider global است، نه clinic-scoped. OTP قبل از clinic context استفاده می‌شود.

## معماری SMS provider

ماژول مستقل communications/SMS یا نام سازگار با ساختار فعلی بساز. OTP engine فقط به port عمومی delivery وابسته باشد و
FarazSMS را import/instantiate نکند.

descriptor هر adapter باید metadata امن زیر را server-owned اعلام کند:

- code، displayName، description؛
- capabilities واقعی (`PATTERN_SEND`, `CONNECTION_TEST` و موارد واقعاً پشتیبانی‌شده)؛
- config field schema allowlisted شامل key/label/help/type/required/secret/default/placeholder/order و validation metadata؛
- runtime availability و activation blockers؛
- هیچ function/schema executable یا credential در response frontend نباشد.

registry باید register/resolve/list/capability-check انجام دهد. فقط provider پیاده‌شده را نمایش دهد. انتخاب provider فعال از
database در runtime resolve شود و restart لازم نداشته باشد. enable/default atomically، audited و fail-closed باشد. provider
غیرفعال یا ناقص انتخاب نشود. automatic failover در V1 ممنوع است.

## FarazSMS — قرارداد تأییدشده package

در تاریخ این سند registry npm این اطلاعات را نشان می‌دهد:

- package رسمی: `farazsms`
- نسخه بررسی‌شده: `1.1.0`
- Node: `>=18`، exportهای ESM/CJS و `index.d.ts`
- base URL داخلی package: `https://api.iranpayamak.com`
- connection test: `lines()` → `GET /ws/v1/lines/accessible`
- pattern send: `sendPattern(code, recipient, attributes, line?)`
- recipient مورد انتظار provider: `0912...`، نه canonical `+989...`
- sender line پیش‌فرض package: `90008361`

با pnpm نسخه exact تأییدشده را به `apps/api` اضافه کن و lockfile را commit کن. هنگام اجرا metadata/exports را دوباره بررسی
کن و اگر نسخه registry تغییر کرده، بدون review ناخواسته upgrade نکن.

پیکربندی V1:

- `patternCode`: non-secret، required، default اولیه `5k9VJ4lCE1`، label «کد پترن»؛
- `apiToken`: secret/write-only، required، label «توکن API»؛
- endpoint/base URL از dashboard ورودی نگیرد و code-owned باقی بماند؛
- sender line اضافی فقط اگر مستندات/حساب واقعی نیاز قطعی نشان داد با migration/contract review اضافه شود.

ارسال دقیق:

```ts
await client.sendPattern(patternCode, providerPhone, { code: generatedOtp });
```

از `client.sendOtp()` استفاده نکن. implementation نسخه `1.1.0` در صورت ندادن token از `Math.random()` کد پنج‌رقمی
می‌سازد و raw code را برمی‌گرداند؛ این با ownership، طول کد و security این قرارداد ناسازگار است.

خروجی SDK `Json/any` است. پاسخ resolve‌شده را کورکورانه موفق فرض نکن؛ shapeهای مستند/مشاهده‌شده را validate و نتیجه ناشناخته
را `UNKNOWN` کن. `FarazError`، HTTP/auth rejection، network failure و timeout را به category امن normalize کن و raw body
یا token را log/return نکن. SDK AbortSignal نمی‌پذیرد؛ timeout wrapper نتیجه را ambiguous بداند، underlying call را retry نکند
و این محدودیت را در runbook ثبت کند.

## credential و runtime امنیتی

- `SMS_CREDENTIAL_ENCRYPTION_KEY` و version/keyring مستقل مطابق authenticated encryption موجود تعریف کن؛ key خارج database
  و Git باشد. key rotation revisionهای تاریخی لازم را خوانا نگه دارد.
- `OTP_PEPPER` secret مستقل و حداقل ۳۲ بایت entropy داشته باشد.
- برای dev/release secret file، Compose، environment validation، examples و runbook را به‌روز کن؛ placeholder فقط، بدون value.
- mode صریح `SMS_TRANSPORT_MODE=disabled|live` با default `disabled` بساز. runtime disabled باید save/rotate/disable را ممکن
  نگه دارد ولی connection/send/activation واقعی را fail-closed کند.
- credential decrypted فقط در adapter boundary و کوتاه‌عمر باشد. response فقط `credentialConfigured: boolean` بدهد.
- leaving secret input blank هنگام edit credential فعلی را حفظ کند؛ replacement صریح revision جدید بسازد.

## API V1

نام DTOها را با convention فعلی تنظیم کن، اما contract عملی زیر را پوشش بده:

### public auth

- `POST /v1/auth/otp/challenges` — request اولیه idempotent.
- `POST /v1/auth/otp/challenges/:challengeId/resend` — cooldown/idempotency.
- `POST /v1/auth/otp/challenges/:challengeId/verify` — consume و صدور همان `AuthenticationResponseDto` و refresh cookie.

هر سه endpoint `@Public`، Origin-validated، rate-limited و بدون provider selection/code response باشند. error codeهای پایدار برای
disabled/unavailable، rate limit، cooldown، invalid/expired/attempt-exhausted و delivery unavailable اضافه و در frontend به
پیام فارسی actionable نگاشت شوند. وجود حساب را از code/status/message قابل استنتاج نکن.

### admin

- list provider descriptors/config status؛
- read selected safe config metadata؛
- create/rotate config revision با `Idempotency-Key`؛
- enable/disable و select default؛
- test connection؛
- send deliberate rate-limited test SMS به phone validated؛
- read/update bounded OTP policy؛
- paginated recent safe delivery attempts.

routeها زیر `/v1/admin/sms/...` یا namespace سازگار باشند، bearer auth و `ADMIN` authorization server-side داشته باشند و همه
mutationها audit شوند. test SMS code تصادفی ولی بدون OtpChallenge باشد تا هرگز قابل verify نباشد. save/open صفحه هیچ SMS
خودکار نفرستد.

## Dashboard UX

در Settings یک کارت مستقل «پیامک و کد یک‌بارمصرف» با summary server-backed اضافه کن. کلیک، editor responsive موجود را باز
کند و داخل آن navigation روشن با سه بخش داشته باشد:

1. **آداپتورها**: کارت providerهای registry با نام، configured، enabled، default، runtime-ready و آخرین connection test.
2. **امنیت OTP**: enabled، length، expiry، resend cooldown، request/attempt/lockout limits با help و bounds قابل مشاهده.
3. **گزارش ارسال**: جدول/کارت responsive و paginated از outcomeهای امن؛ بدون شماره کامل، code یا credential.

در detail FarazSMS dynamic fields را از metadata امن API render کن، نه object hardcoded مشابه payment UI. secret state فقط
configured/not-configured باشد. actionها مستقل و دقیق باشند: ذخیره/جایگزینی، تست اتصال، ارسال پیامک تست با confirmation،
فعال/غیرفعال و default. connection success را با delivery success یکی نشان نده. تمام mutationها busy state مجزا، error قرمز،
success سبز، refresh پس از save و حفظ last-known data هنگام refresh failure داشته باشند.

desktop و mobile، focus trap/editor keyboard، RTL/LTR technical fields، copy و status badges را با design system فعلی و
`lucide-react` بساز. فرم‌ها همیشه باز و شلوغ نباشند؛ overview read-first و detail focused باقی بماند.

## تست و verification اجباری

### backend/domain

- secure generation و zero-padding؛ HMAC context/constant-time؛ expiry، attempt exhaustion، single-use، purpose/challenge
  binding، resend replacement، failed-resend preservation و concurrent verify؛
- atomic account create/existing login و session contract یکسان با password؛ OTP-only user بدون Credential؛
- PostgreSQL-backed phone/IP/request rate limits و idempotency؛
- disabled/no provider/misconfigured/timeout/unknown outcomes بدون auth bypass یا duplicate SMS؛
- provider registry contract با fake فقط داخل test، نه production registration.

### Faraz adapter

- exact pattern `5k9VJ4lCE1` default، `{ code }`، تبدیل `+989...` به `09...`، `lines()`، `FarazError`، malformed success،
  timeout ambiguity، secret replacement و ممنوعیت `sendOtp`؛
- SDK mock شود و suite هیچ network/SMS واقعی نداشته باشد.

### admin/security

- ADMIN allow و DOCTOR/STAFF/PATIENT deny؛ secret never returned/logged؛ encryption authentication/rotation؛ enable/default
  invariants؛ connection/test SMS rate limit و audits؛ policy bounds و multi-instance behavior.

### frontend

- login/signup پیش‌فرض OTP و password secondary؛ phone → code state machine، paste/autofill، timer، resend، edit phone،
  Persian errors، redirects و existing password regression؛
- dynamic provider fields، secret preservation، status/actions، policy form، delivery list و responsive/accessibility behavior.

### integration/release

- migration replay از PostgreSQL 16 خالی، seed compatibility، OpenAPI contract/export، generated-client drift، API/web/dashboard
  typecheck/lint/tests، `git diff --check`؛
- browser E2E با fake transport داخلی و بدون provider external: OTP request → code از test-only seam خارج از browser response →
  verify → refresh cookie → app/dashboard routing؛ password login/register نیز regression pass؛
- deployment env/secret contract test و shared-dev action بعد از push. runtime shared dev تا ورود credential واقعی و اقدام ADMIN
  می‌تواند `disabled` بماند؛ UI باید blocker واقعی را نشان دهد.

## ترتیب تحویل و commit

برای reviewability، taskهای وابسته را در batchهای متوالی انجام بده و هر task را مستقل verify/document/commit کن. پیشنهاد:

1. `F01-R06-A` — ADR/change control، schema/migration، encryption/runtime، SMS port/registry و Faraz adapter/admin backend.
2. `F01-R06-B` — OTP engine، public auth endpoints، session/account integration، OpenAPI/generated client.
3. `F01-R06-C` — web OTP-first/password-secondary UX، dashboard management UX، browser/integration/deployment evidence.

اگر repository task naming شکل دیگری الزام کرد، IDها را با plan هماهنگ کن ولی dependencyها و atomic commits را حفظ کن.
task وابسته را در همان batch task پایه اجرا نکن. با توجه به مجوز صریح مالک برای کل feature، پس از بسته‌شدن هر task و batch،
batch بعدی همین scope را طبق plan claim و ادامه بده تا feature کامل شود.

## خارج از scope V1

- MFA یا ادعای phishing-resistant authentication؛
- password reset، phone change و verification purpose جدا؛
- provider دوم واقعی، automatic fallback/failover یا routing وزنی؛
- Redis/queue جدید بدون bottleneck اثبات‌شده؛
- delivery webhook/status polling که FarazSMS contract آن در scope تأیید نشده؛
- arbitrary provider endpoint، pattern variable یا executable schema از dashboard؛
- SMS واقعی در CI/test یا commit کردن token/OTP.

## معیار پذیرش نهایی

- OTP در login و signup روش اول و password روش دوم است و هر دو session فعلی را درست حفظ می‌کنند.
- user جدید OTP-only بدون password جعلی ساخته می‌شود و patient role/profile دارد.
- code server-generated، HMAC-protected، expiring، attempt-limited، single-use و concurrent-safe است.
- FarazSMS فقط از adapter و `sendPattern(..., { code })` استفاده می‌شود و provider از OTP engine جدا است.
- ADMIN می‌تواند config dynamic، token write-only، enable/default، connection test، test SMS و policy را با UI تمیز مدیریت کند.
- credential encrypted، secrets خارج Git، auditها بدون PII/secret و runtime default-disabled است.
- migration/OpenAPI/client/tests/E2E/deployment docs کامل و تمام gateهای مرتبط PASS هستند.
- تغییرات روی `dev` push شده‌اند، GitHub Action مشاهده شده و نتیجه/محدودیت واقعی گزارش شده است.

## گزارش نهایی مورد انتظار از مدل

در پایان، task ID/status، commitها، فایل‌های اصلی، migrationها، endpointها، env/secrets لازم، تست‌ها و نتایج، GitHub Action،
نحوه فعال‌سازی FarazSMS از dashboard و هر gate خارجی باقی‌مانده را گزارش کن. secret یا شماره/OTP واقعی را در گزارش نیاور.
