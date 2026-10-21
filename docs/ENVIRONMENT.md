# راهنمای کامل متغیرهای محیطی و secretها

برای نصب جدید روی Ubuntu 24.04، [نصاب مستقل](../installation/README.md) فایل‌ها را روی خود سرور تولید می‌کند.
`python -B installation/manager.py audit-env --current` پوشش schema واقعی API، Composeها و کلیدهای فایل‌های محلی را
بدون نمایش مقدار محرمانه یا تغییر `.env` بررسی می‌کند. `.env` محلی منبع تنظیمات سرور نیست.

این سند مرجع تنظیم environment پروژه Mushroom است. فایل‌های نمونه فقط placeholder و مقدار عمومی دارند؛ مقدار واقعی
رمز، token، pepper، کلید رمزنگاری یا آدرس محرمانه نباید وارد Git، log، issue یا پیام شود.

## فایل مناسب برای هر محیط

| سناریو | فایل نمونه | فایل واقعی | آیا وارد Git می‌شود؟ |
|---|---|---|---|
| اجرای API روی سیستم توسعه | `apps/api/.env.example` | `apps/api/.env` | خیر |
| اجرای frontendها روی سیستم توسعه | `.env.example` هر app | `.env.local` همان app | خیر |
| shared dev روی VPS | `deploy/vps/dev-env.example` | `~/mushroom/dev/runtime.env` | خیر |
| staging یا production-sim روی VPS | `deploy/vps/env.example` | `~/mushroom/<environment>/runtime.env` | خیر |
| production واقعی با PostgreSQL خارجی | `deploy/vps/production-env.example` | `/home/mushroom-prod/mushroom/production/runtime.env` | خیر |
| secretهای VPS | این سند | فایل‌های `secrets/` | خیر |
| GitHub Actions | این سند | Repository Secrets/Variables | خیر |

`runtime.env` فقط تنظیمات عمومی و عملیاتی را نگه می‌دارد. secretها در فایل‌های مجزا با permission برابر `600`
نگهداری و به‌صورت Docker secret وارد container می‌شوند.

## runtime.env سرور

برای shared dev از template کامل زیر استفاده کنید:

```bash
cp deploy/vps/dev-env.example "$HOME/mushroom/dev/runtime.env"
chmod 600 "$HOME/mushroom/dev/runtime.env"
```

### هویت و مسیر محیط

| متغیر | نوع/مقدار مجاز | نمونه | کاربرد |
|---|---|---|---|
| `MUSHROOM_ENVIRONMENT` | یکی از `development`، `staging`، `production-sim`، `production` | `development` | نام منطقی محیط؛ dev deploy دقیقاً `development` می‌خواهد. |
| `COMPOSE_PROJECT_NAME` | نام یکتای Compose | `mushroom-dev` | از تداخل container، network و volume محیط‌ها جلوگیری می‌کند. |
| `MUSHROOM_ENV_ROOT` | مسیر absolute | `/home/deploy/mushroom/dev` | ریشه runtime، state و secrets محیط. |
| `DEV_WORKSPACE_PATH` | مسیر absolute، فقط dev | `/home/deploy/mushroom/dev/workspace` | سورس syncشده که داخل container mount می‌شود. |
| `DEV_CACHE_PATH` | مسیر absolute، فقط dev | `/home/deploy/mushroom/dev/cache` | cache مشترک pnpm/Next برای deploy سریع. |
| `DEV_UID` | عدد صحیح غیر صفر | `1000` | UID کاربر deploy داخل container؛ باید با `id -u` برابر باشد. |
| `DEV_GID` | عدد صحیح غیر صفر | `1000` | GID کاربر deploy؛ باید با `id -g` برابر باشد. |

### PostgreSQL

| متغیر | نوع/مقدار مجاز | مقدار پیشنهادی dev | کاربرد |
|---|---|---|---|
| `POSTGRES_IMAGE` | image و tag صریح | `postgres:16-alpine` | نسخه PostgreSQL container. از tag شناور در release استفاده نشود. |
| `POSTGRES_DB` | نام دیتابیس | `mushroom_dev` | دیتابیس همان محیط؛ در dev باید شامل `dev` باشد. |
| `POSTGRES_USER` | نام role | `mushroom_dev` | مالک دیتابیس همان محیط؛ در dev باید شامل `dev` باشد. |
| `POSTGRES_PORT` | پورت ۱ تا ۶۵۵۳۵، فقط local compose | `5432` | binding دیتابیس محلی؛ در VPS دیتابیس مستقیماً expose نمی‌شود. |
| `POSTGRES_PASSWORD` | secret متنی، فقط local compose | مقدار تصادفی | رمز PostgreSQL محلی؛ روی VPS از فایل `postgres_password` استفاده می‌شود. |
| `DATABASE_URL` | PostgreSQL URI | `postgresql://user:pass@localhost:5432/db?schema=public` | اتصال Prisma و API؛ روی VPS در فایل secret قرار می‌گیرد. |
| `SHADOW_DATABASE_URL` | PostgreSQL URI یا خالی | خالی | دیتابیس disposable فقط برای Prisma Migrate در توسعه؛ هرگز production نباشد. |

### دامنه‌ها، CORS و reverse proxy

| متغیر | نوع/مقدار مجاز | نمونه dev واقعی | کاربرد |
|---|---|---|---|
| `PUBLIC_API_URL` | origin کامل HTTP(S)، در حالت live سداد حتماً HTTPS | `https://dev-api.roxco.ir` | آدرس عمومی API برای frontend، callback و runtime config. مسیر پایانی نداشته باشد. |
| `PUBLIC_WEB_URL` | origin کامل HTTP(S) | `https://dev.roxco.ir` | سایت عمومی و صفحات ورود/ثبت‌نام. |
| `PUBLIC_APP_URL` | origin کامل HTTP(S) | `https://dev-app.roxco.ir` | اپ بیمار و مقصد ورود PATIENT. |
| `PUBLIC_DASHBOARD_URL` | origin کامل HTTP(S) | `https://dev-dashboard.roxco.ir` | داشبورد ADMIN/DOCTOR/STAFF. |
| `APP_ORIGINS` | فهرست comma-separated از originهای دقیق | سه دامنه بالا | allowlist CORS و browser session؛ wildcard ممنوع است. |
| `TRUSTED_PROXIES` | IP یا CIDRهای صریح و comma-separated | `127.0.0.1/32` | proxyهایی که Fastify هدرهای forwarded آن‌ها را می‌پذیرد؛ `0.0.0.0/0` مجاز نیست. |
| `NEXT_ALLOWED_DEV_ORIGINS` | hostname/originهای dev و comma-separated | `192.168.1.20` | فقط اجرای Next dev از LAN یا tunnel؛ compose dev آن را از `APP_ORIGINS` می‌سازد. |

### API، session و تجارت

| متغیر | نوع/محدوده | پیش‌فرض | کاربرد |
|---|---|---:|---|
| `NODE_ENV` | `development`، `test` یا `production` | `development` | رفتار runtime و cookie امن را تعیین می‌کند. |
| `PORT` | پورت معتبر | `3003` | پورت داخلی API در اجرای مستقیم. |
| `LOG_LEVEL` | `fatal/error/warn/info/debug/trace` | dev: `debug`، release: `info` | سطح log ساخت‌یافته API. |
| `JWT_ACCESS_ISSUER` | رشته ۱ تا ۱۲۸ کاراکتر | `sabz-zendegi-api` | issuer توکن access؛ بعد از انتشار بدون برنامه rotation تغییر نکند. |
| `JWT_ACCESS_AUDIENCE` | رشته ۱ تا ۱۲۸ کاراکتر | `sabz-zendegi-frontends` | audience توکن access. |
| `COMMERCE_RESERVATION_TTL_MINUTES` | عدد صحیح ۱ تا ۱۴۴۰ | `20` | مدت رزرو موجودی سبد خرید پیش از آزادسازی. |

### ارسال پیامک و OTP

| متغیر | نوع/مقدار مجاز | پیش‌فرض | کاربرد |
|---|---|---:|---|
| `SMS_TRANSPORT_MODE` | `disabled` یا `live` | `disabled` | gate عملیاتی ارسال واقعی SMS؛ `live` فقط runtime را باز می‌کند و provider هنوز باید در داشبورد تنظیم و فعال شود. |
| `SMS_REQUEST_TIMEOUT_MS` | عدد صحیح ۱۰۰۰ تا ۳۰۰۰۰ | `5000` | timeout تماس server-to-server با provider. timeout نتیجه نامشخص دارد و نباید موفق فرض شود. |
| `SMS_CREDENTIAL_ENCRYPTION_KEY_VERSION` | شناسه ۱ تا ۶۴ کاراکتر | `v1` | نسخه کلید فعال AES-256-GCM برای رمزکردن token provider. |

`OTP_PEPPER`، کلید فعال SMS و keyring تاریخی secret هستند و در `runtime.env` قرار نمی‌گیرند. token فراز نیز env نیست؛
از بخش «پیامک و کد یک‌بارمصرف» داشبورد به‌صورت write-only ذخیره و در دیتابیس رمز می‌شود.

### درگاه سداد

| متغیر | نوع/مقدار مجاز | پیش‌فرض | کاربرد |
|---|---|---:|---|
| `SADAD_TRANSPORT_MODE` | `disabled` یا `live` | `disabled` | gate تماس واقعی PaymentRequest/Verify. فعال‌سازی adapter در داشبورد همچنان جداست. |
| `SADAD_REQUEST_TIMEOUT_MS` | عدد صحیح ۱۰۰۰ تا ۳۰۰۰۰ | `5000` | timeout درخواست‌های سداد. |
| `SADAD_RETURN_URL` | HTTPS URL دقیق با مسیر callback | `https://dev-api.roxco.ir/v1/payments/providers/sadad/callback` | callback ثبت‌شده نزد بانک؛ query و fragment ممنوع است. |
| `SADAD_RESULT_URL` | HTTPS URL با مسیر `/store/order-success` | `https://dev-app.roxco.ir/store/order-success` | مقصد کاربر بعد از callback و Verify سرور. |
| `SADAD_REDIRECT_PROFILE` | یکی از `PDF_PURCHASE`، `PHP_VPG_PURCHASE`، `DOTNET_PURCHASE_INDEX` یا خالی | خالی | شکل redirect تأییدشده برای پذیرنده. در حالت live اجباری است. |
| `PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION` | شناسه ۱ تا ۶۴ کاراکتر | `v1` | نسخه کلید فعال رمزنگاری credential پذیرنده. |

`Merchant ID`، `Terminal ID` و `Terminal Key` داخل env قرار نمی‌گیرند؛ ADMIN آن‌ها را از تنظیمات درگاه ثبت می‌کند
و API نسخه رمزنگاری‌شده را نگه می‌دارد.

### binding پورت و منابع shared dev

| متغیر | نمونه | کاربرد |
|---|---|---|
| `API_PORT` | `127.0.0.1:3303` | API فقط روی loopback؛ Caddy آن را منتشر می‌کند. |
| `WEB_PORT` | `127.0.0.1:3300` | سایت عمومی. |
| `APP_PORT` | `127.0.0.1:3301` | اپ بیمار. |
| `DASHBOARD_PORT` | `127.0.0.1:3302` | داشبورد. |
| `DEV_POSTGRES_CPUS` / `DEV_POSTGRES_MEMORY` | `0.50` / `512m` | سقف منابع PostgreSQL dev. |
| `DEV_API_CPUS` / `DEV_API_MEMORY` | `1.00` / `1g` | سقف منابع API dev. |
| `DEV_WEB_CPUS` / `DEV_WEB_MEMORY` | `0.75` / `768m` | سقف سایت dev. |
| `DEV_APP_CPUS` / `DEV_APP_MEMORY` | `0.75` / `768m` | سقف اپ dev. |
| `DEV_DASHBOARD_CPUS` / `DEV_DASHBOARD_MEMORY` | `0.75` / `768m` | سقف داشبورد dev. |

مقادیر memory از قالب Docker مانند `512m` و `1g` و CPU از عدد اعشاری مثبت استفاده می‌کنند. پورت‌های محیط‌های dev،
staging و production-sim نباید مشترک باشند.

## secretهای فایل‌محور VPS

production واقعی هشت secret مربوط به API را دارد و `postgres_password` محلی ندارد؛ `database_url` به سرویس خارجی
با TLS اشاره می‌کند. keyring تاریخی می‌تواند خالی باشد و لازم نیست یک کلید بازنشستهٔ ساختگی ساخته شود. حالت
disabled پیامک/پرداخت هم مانع تولید و نگهداری امن کلیدهای مستقل موردنیاز برای تنظیم بعدی نیست.

این ۹ فایل باید زیر `$MUSHROOM_ENV_ROOT/secrets/` باشند و با `chmod 600` محافظت شوند:

| فایل | قالب دقیق | کاربرد |
|---|---|---|
| `postgres_password` | رشته تصادفی قوی | رمز role دیتابیس container. |
| `database_url` | PostgreSQL URI کامل | اتصال API و migration. |
| `jwt_access_secret` | base64url با حداقل ۳۲ بایت entropy، ۴۳ تا ۲۵۶ کاراکتر | امضای access token. |
| `refresh_token_pepper` | base64url مستقل، ۴۳ تا ۲۵۶ کاراکتر | HMAC refresh token؛ نباید با JWT key برابر باشد. |
| `otp_pepper` | base64url مستقل، ۴۳ تا ۲۵۶ کاراکتر | HMAC کد OTP و IP؛ با دو secret قبلی متفاوت باشد. |
| `sms_credential_encryption_key` | base64 استانداردِ دقیقاً ۳۲ بایت | کلید فعال AES-256-GCM برای credential پیامک. |
| `sms_credential_decryption_keys` | خالی یا `version:base64key`های comma-separated | فقط کلیدهای تاریخی SMS هنگام rotation. |
| `payment_credential_encryption_key` | base64 استانداردِ دقیقاً ۳۲ بایت | کلید فعال credential درگاه. |
| `payment_credential_decryption_keys` | خالی یا `version:base64key`های comma-separated | کلیدهای تاریخی پرداخت هنگام rotation. |

ساخت secretهای جدید dev:

```bash
cd "$HOME/mushroom/dev"
install -d -m 700 secrets
openssl rand -hex 32 > secrets/postgres_password
openssl rand -base64 48 | tr -d '\n=+/' > secrets/jwt_access_secret
openssl rand -base64 48 | tr -d '\n=+/' > secrets/refresh_token_pepper
openssl rand -base64 48 | tr -d '\n=+/' > secrets/otp_pepper
openssl rand -base64 32 | tr -d '\n' > secrets/sms_credential_encryption_key
printf 'v0:%s' "$(openssl rand -base64 32 | tr -d '\n')" > secrets/sms_credential_decryption_keys
openssl rand -base64 32 | tr -d '\n' > secrets/payment_credential_encryption_key
printf 'v0:%s' "$(openssl rand -base64 32 | tr -d '\n')" > secrets/payment_credential_decryption_keys
chmod 600 runtime.env secrets/*
```

`database_url` باید پس از انتخاب نام database، user و password همان محیط ساخته شود. secret محیط دیگر را کپی نکنید.
تعویض کلید رمزنگاری باید با version جدید و نگه‌داری کلید قبلی در keyring تاریخی انجام شود؛ حذف زودهنگام کلید قبلی
credentialهای ثبت‌شده را ناخوانا می‌کند.

## متغیرهای local development

علاوه بر متغیرهای API بالا، این متغیرها فقط برای توسعه محلی‌اند:

| متغیر | قالب | کاربرد |
|---|---|---|
| `DEV_DASHBOARD_ADMIN_PHONE` | موبایل canonical مانند `+989100000001` | حساب ADMIN که seed فقط در development می‌سازد یا sync می‌کند. |
| `DEV_DASHBOARD_ADMIN_PASSWORD` | رمز قوی و محلی | credential همان حساب؛ در محیط مشترک یا production استفاده نشود. |

Frontendها فقط URLهای عمومی مورد نیاز خود را می‌خوانند. فایل‌های نمونه در `apps/web/.env.example`،
`apps/app/.env.example` و `apps/dashboard/.env.example` مشخص می‌کنند هر برنامه کدام `PUBLIC_*_URL` را نیاز دارد.
این URLها secret نیستند و در VPS هنگام startup داخل `/runtime-config.js` نوشته می‌شوند.

## GitHub Actions

برای production واقعی چهار Secret مستقل با نام‌های `PRODUCTION_VPS_HOST`، `PRODUCTION_VPS_USER`،
`PRODUCTION_VPS_SSH_PRIVATE_KEY` و `PRODUCTION_VPS_KNOWN_HOSTS` استفاده می‌شوند. متغیرهای
`PRODUCTION_VPS_PORT`، `PRODUCTION_CD_ENABLED` و `RELEASE_APPROVER` مقصد و اجازهٔ انتشار production را تعیین می‌کنند.
`PRODUCTION_AUTO_DEPLOY=false` پیش‌فرض است؛ با انتخاب صریح مالک می‌تواند انتشار خودکار پس از staging موفق را فعال کند.
نصاب نام و محل مقدارهای لازم را در `/etc/mushroom/github/GITHUB-SETUP.txt` می‌نویسد؛ مقادیر داخلی API روی سرور می‌مانند.

Repository Secrets:

| نام | نوع | کاربرد |
|---|---|---|
| `VPS_HOST` | hostname یا IP | مقصد SSH. |
| `VPS_USER` | username | کاربر non-root استقرار، معمولاً `deploy`. |
| `VPS_SSH_PRIVATE_KEY` | private key کامل | کلید SSH runner؛ در log چاپ نشود. |
| `VPS_KNOWN_HOSTS` | خروجی تأییدشده known_hosts | pin کردن host key و جلوگیری از MITM. |

Repository Variables:

| نام | مقدار | کاربرد |
|---|---|---|
| `VPS_PORT` | پورت SSH، پیش‌فرض `22` | اتصال runner به VPS. |
| `VPS_DEV_CD_ENABLED` | `true` یا `false` | فعال‌سازی sync خودکار branch `dev`. |
| `VPS_CD_ENABLED` | `true` یا `false` | فعال‌سازی pipeline release غیرتوسعه‌ای. |

متغیرهای build اختیاری شامل `IMAGE_REGISTRY`، `IMAGE_TAG`، `SOURCE_REPOSITORY`، `SOURCE_CI_RUN_ID` و
`RELEASE_MANIFEST_PATH` هستند. این‌ها فقط نام artifact و provenance را کنترل می‌کنند و secret runtime نیستند.

## اعمال تغییرات shared dev

پس از ویرایش `runtime.env`، فقط ذخیره فایل کافی نیست؛ container باید با environment جدید recreate شود:

```bash
cd "$HOME/mushroom/dev/workspace"
docker compose \
  --project-name mushroom-dev \
  --env-file "$HOME/mushroom/dev/runtime.env" \
  --file deploy/vps/compose.dev.yaml \
  up -d --no-deps --force-recreate api
```

یا workflow «Sync shared dev VPS» را اجرا کنید. deploy script اثرانگشت تنظیمات runtime API را نگه می‌دارد و هنگام
تغییر mode، timeout، URL، origin، proxy، issuer یا key version، API را recreate می‌کند.

بررسی نهایی:

```bash
curl -fsS https://dev-api.roxco.ir/v1/health/ready
docker compose \
  --project-name mushroom-dev \
  --env-file "$HOME/mushroom/dev/runtime.env" \
  --file "$HOME/mushroom/dev/workspace/deploy/vps/compose.dev.yaml" \
  config >/dev/null
```

هرگز خروجی `docker compose config` را در جایی عمومی paste نکنید؛ ممکن است مسیرها یا مقادیر عملیاتی محیط را نشان دهد.
