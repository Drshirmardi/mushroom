# راه‌اندازی CD روی VPS آزمایشی

این مسیر برای یک VPS غیرپروداکشن است که دو محیط مستقل دارد:

- `staging`: پس از CI موفق `main` به‌صورت خودکار به‌روز می‌شود.
- `production-sim`: فقط پس از اجرای دستی مالک همان digestهای پذیرفته‌شدهٔ staging را می‌گیرد.

این topology برای تمرین انتشار است. داده، credential و اتصال واقعی سداد در آن مجاز نیست.

فایل versioned [`reference-data/rehearsal-consent-policy.json`](reference-data/rehearsal-consent-policy.json)
فقط برای همین دو محیط تمرینی مجاز است. متن آن صریحاً دادهٔ واقعی بیمار را منع می‌کند و ابزار انتشار، محیط مجاز و
SHA-256 دقیق body را پیش از هر write بررسی می‌کند. این فایل policy حقوقی production نیست و در محیط `production`
رد می‌شود.

## ۱. پیش‌نیاز سرور

یک Linux VPS اختصاصی تست با Docker Engine، Compose v2، `curl` و `jq` لازم است. یک مدیر سرور یک کاربر بدون
password و بدون دسترسی SSH ریشه می‌سازد و کلید عمومی deployment را در `authorized_keys` قرار می‌دهد. نمونه برای
Ubuntu:

```bash
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
sudo install -m 600 -o deploy -g deploy /dev/null /home/deploy/.ssh/authorized_keys
```

کلید عمومی را به `authorized_keys` اضافه کنید. کلید خصوصی را روی VPS کپی نکنید. عضویت در گروه Docker کنترل کامل
containerهای همان host را می‌دهد؛ این VPS باید فقط برای rehearsal پروژه باشد و کاربر `deploy` نباید sudo داشته باشد.
در نصب rootless Docker نیز همین pipeline کار می‌کند، به‌شرط آنکه session غیرتعاملی SSH به Docker socket دسترسی داشته
باشد.

پس از نصب ابزارها، با خود کاربر `deploy` بررسی کنید:

```bash
docker version
docker compose version
jq --version
curl --version
```

## ۲. ساخت دو محیط جدا

فایل [`env.example`](env.example) را مبنا قرار دهید. مسیرها را با user واقعی هماهنگ کنید:

```bash
install -d -m 700 \
  "$HOME/mushroom/staging/secrets" \
  "$HOME/mushroom/production-sim/secrets"
```

برای staging یک `runtime.env` با این مرزها بسازید:

```dotenv
MUSHROOM_ENVIRONMENT=staging
COMPOSE_PROJECT_NAME=mushroom-staging
MUSHROOM_ENV_ROOT=/home/deploy/mushroom/staging
POSTGRES_DB=mushroom_staging
POSTGRES_USER=mushroom_staging
```

برای production-sim از دامنه‌ها، پورت‌ها و نام‌های جدا استفاده کنید:

```dotenv
MUSHROOM_ENVIRONMENT=production-sim
COMPOSE_PROJECT_NAME=mushroom-production-sim
MUSHROOM_ENV_ROOT=/home/deploy/mushroom/production-sim
POSTGRES_DB=mushroom_production_sim
POSTGRES_USER=mushroom_production_sim
```

هر فایل باید بقیهٔ مقادیر عمومی `env.example` را هم با URL و loopback port مخصوص خودش داشته باشد.

## ۳. ساخت secretهای مصنوعی rehearsal

این فرمان‌ها را جداگانه در هر پوشهٔ محیط اجرا کنید. خروجی‌ها را در chat، Git، issue یا log قرار ندهید:

```bash
cd "$HOME/mushroom/staging"
db_password=$(openssl rand -hex 32)
printf '%s' "$db_password" > secrets/postgres_password
printf 'postgresql://mushroom_staging:%s@postgres:5432/mushroom_staging?schema=public' "$db_password" > secrets/database_url
openssl rand -base64 48 | tr -d '\n=+/' > secrets/jwt_access_secret
openssl rand -base64 48 | tr -d '\n=+/' > secrets/refresh_token_pepper
openssl rand -base64 32 | tr -d '\n' > secrets/payment_credential_encryption_key
printf 'v0:%s' "$(openssl rand -base64 32 | tr -d '\n')" > secrets/payment_credential_decryption_keys
chmod 600 runtime.env secrets/*
unset db_password
```

فایل‌ها روی host با مالک `deploy` و mode برابر `600` شروع می‌شوند. هنگام deployment، اسکریپت versioned با استفاده از
همان API image پذیرفته‌شده و یک helper بدون شبکه، group فایل‌های secret را به GID غیرریشه‌ای runtime یعنی `65532`
تبدیل و mode را `640` می‌کند. مالک host همچنان `deploy` می‌ماند؛ secretها هرگز world-readable نمی‌شوند. تغییر دستی
به `644` یا اجرای application به‌صورت root مجاز نیست.

برای `production-sim` همین کار را با user/database همان محیط و secretهای تازه تکرار کنید. هیچ فایل یا مقدار secret
بین دو محیط کپی نمی‌شود.

## ۴. تنظیم GitHub

در repository به مسیر `Settings → Secrets and variables → Actions → Secrets` بروید و این repository secretها را
تعریف کنید:

| نام | مقدار |
|---|---|
| `VPS_HOST` | IP یا hostname همان VPS |
| `VPS_USER` | معمولاً `deploy` |
| `VPS_SSH_PRIVATE_KEY` | کلید خصوصی مخصوص GitHub Actions |
| `VPS_KNOWN_HOSTS` | خط کامل و از قبل تأییدشدهٔ host key |

متغیر `VPS_PORT` را در بخش repository variables قرار دهید؛ نبود آن یعنی پورت `22`. host key را از یک کانال مورد
اعتماد با fingerprint سرور تطبیق دهید. workflow از `ssh-keyscan` خودکار استفاده نمی‌کند.

در `Settings → Actions → General` دسترسی workflow را فعال نگه دارید و packageهای `mushroom-*` را private و مرتبط
با همین repository نگه دارید. workflow برای publish و pull از `GITHUB_TOKEN` کوتاه‌عمر استفاده می‌کند؛ PAT روی VPS
ذخیره نمی‌شود.

این rehearsal برای repository خصوصی روی GitHub Free از Environment استفاده نمی‌کند، چون Environment و secret آن در
private repository به GitHub Pro/Team/Enterprise نیاز دارد. هر دو محیط روی یک VPS آزمایشی و با یک deployment identity
کار می‌کنند، اما database، volume، secret، port و release state آن‌ها جداست. gate مربوط به `production-sim` اجرای
دستی workflow و تطبیق `github.actor` با `RELEASE_APPROVER` است. real production باید credential و approval scope
مستقل داشته باشد. جزئیات محدودیت پلن در [مستند رسمی GitHub Environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
آمده است.

در `Settings → Secrets and variables → Actions → Variables` این repository variableها را تنظیم کنید:

```text
VPS_CD_ENABLED=false
RELEASE_APPROVER=YOUR_GITHUB_USERNAME
GHCR_ATTESTATIONS_ENABLED=false
VPS_PORT=22
```

`GHCR_ATTESTATIONS_ENABLED` اختیاری است. برای repository خصوصی روی پلنی که artifact attestation را پشتیبانی نمی‌کند
آن را `false` نگه دارید. release manifest و digestهای دقیق همچنان منبع استقرار هستند؛ فعال‌کردن attestation فقط
evidence تکمیلی provenance اضافه می‌کند و artifact قابل promotion را تغییر نمی‌دهد.

پس از آماده‌شدن هر دو محیط، `VPS_CD_ENABLED` را به `true` تغییر دهید. تا قبل از آن CI و انتشار GHCR انجام می‌شوند ولی jobهای VPS
به‌درستی skip می‌شوند.

## ۵. روند هر انتشار

1. pull request باز می‌شود و CI آن باید سبز باشد.
2. بعد از merge، CI دوباره روی `main` اجرا می‌شود.
3. فقط آخرین commit موفق `main` چهار image را build، smoke-test، scan و در GHCR خصوصی publish می‌کند.
4. release manifest شامل چهار digest و شناسهٔ CI ثبت و attest می‌شود.
5. staging از طریق SSH pinned، migration، انتشار idempotent policy تمرینی، verification آن و health check به‌روز
   می‌شود و workflow خودکار پایان می‌یابد.
6. مالک از `Actions → Promote staging release → Run workflow` شناسهٔ همان release run را وارد می‌کند.
7. workflow نام مالک، موفقیت staging و manifest را دوباره کنترل می‌کند و همان digestها را بدون rebuild روی
   production-sim اجرا می‌کند.

اگر migration شکست بخورد، application جدید switch نمی‌شود. اگر staging بعد از migration healthy نشود، script فقط
application digestهای قبلی را برمی‌گرداند و schema گسترش‌یافته را نگه می‌دارد. production-sim به‌صورت خودکار rollback
نمی‌شود.

اگر policy تمرینی missing، دست‌کاری‌شده، خارج از محیط مجاز یا ناسازگار با نسخهٔ فعال باشد، deployment پیش از switch
برنامه متوقف می‌شود. انتشار نسخهٔ جدید ابتدا نسخهٔ ACTIVE قبلی را در همان transaction بازنشسته می‌کند، نسخهٔ جدید
را فعال می‌کند و evidence غیرحساس release را در audit ثبت می‌کند. اجرای seed توسعه روی VPS بخشی از این مسیر نیست.

برای production واقعی باید سند جداگانه با متن حقوقی تأییدشده، hash بازبینی‌شده و `allowedEnvironments` مناسب از مسیر
approval مالک محصول/حقوقی ارائه شود؛ فایل rehearsal نباید کپی یا تغییرنام داده شود.

## ۶. rollback کنترل‌شده

از `Actions → Application rollback → Run workflow` محیط را انتخاب کنید. انتخاب `production-sim` فقط برای username
ثبت‌شده در `RELEASE_APPROVER` مجاز است. rollback
فقط release قبلی برنامه را فعال می‌کند؛ database reset، down migration یا بازیابی خودکار داده وجود ندارد.

## ۷. پذیرش VPS

پذیرش کامل پس از این موارد ثبت می‌شود:

- baseline تمیز و دو update متوالی از merge تا محیط‌ها؛
- تطبیق source SHA و چهار digest اجراشده با release manifest؛
- migration موفق و حفظ دادهٔ تست؛
- staging خودکار و production-sim approval-gated؛
- شکست کنترل‌شده و application-only rollback؛
- نبود credential رجیستری در Docker config دائمی کاربر؛
- جدایی database، volume، secret، port، origin و release state دو محیط.

## ۸. محیط توسعهٔ سریع و مشترک روی همین VPS

محیط `dev` یک مسیر جدا از release است: push روی branch به نام `dev` سورس را مستقیم sync می‌کند و watcherهای
Nest/Next روی سرور روشن می‌مانند. تغییر معمول سورس بدون build image یا restart سرویس دیده می‌شود؛ تغییر dependency،
Dockerfile یا Compose به‌صورت خودکار bootstrap/recreate می‌شود. این محیط فقط برای دادهٔ ساختگی تیم است و نتیجهٔ آن
هیچ‌وقت جای CI یا staging را نمی‌گیرد.

### ۸.۱. بررسی ظرفیت و نصب پیش‌نیاز

مدیر سرور ابتدا `rsync` را نصب می‌کند؛ سپس با کاربر `deploy` headroom و دسترسی ابزار را بررسی کنید:

```bash
sudo apt-get update && sudo apt-get install -y rsync
su - deploy
rsync --version
free -h
df -h /var/lib/docker "$HOME"
docker stats --no-stream
```

مقادیر پیش‌فرض dev حداکثر حدود `3.75 CPU` و `3.8 GiB RAM` بین PostgreSQL و چهار برنامه محدود می‌کنند. اگر پس از
سرویس‌های فعلی این ظرفیت آزاد نیست، مقادیر `DEV_*_CPUS` و `DEV_*_MEMORY` را پایین‌تر تنظیم کنید یا dev را به VPS
دوم ببرید؛ oversubscribeکردن همان host می‌تواند staging را کند کند.

### ۸.۲. ساخت runtime و secretهای مستقل dev

پس از mergeشدن فایل‌های این بخش در `main`، ابتدا یک‌بار روی سرور پوشه‌ها را بسازید:

```bash
install -d -m 700 \
  "$HOME/mushroom/dev/secrets" \
  "$HOME/mushroom/dev/workspace" \
  "$HOME/mushroom/dev/cache" \
  "$HOME/mushroom/dev/state"
```

سپس روی سیستم خودتان فایل نمونه را بفرستید:

```bash
scp -P 22 deploy/vps/dev-env.example deploy@YOUR_VPS_HOST:/home/deploy/mushroom/dev/runtime.env
```

پورت SSH، user، hostname و مسیر home را با مقادیر واقعی عوض کنید. بعد روی سرور identity را تنظیم کنید:

```bash
sed -i "s/^DEV_UID=.*/DEV_UID=$(id -u)/; s/^DEV_GID=.*/DEV_GID=$(id -g)/" \
  "$HOME/mushroom/dev/runtime.env"
chmod 600 "$HOME/mushroom/dev/runtime.env"
```

چهار دامنهٔ `dev*.example.com` داخل `runtime.env` را با دامنه‌های واقعی عوض کنید. مسیرهای `/home/deploy/...` نیز
باید با home واقعی `VPS_USER` برابر باشند. پورت‌های
پیش‌فرض dev عبارت‌اند از `3300` وب، `3301` اپ، `3302` داشبورد و `3303` API؛ آن‌ها باید فقط روی `127.0.0.1` بمانند
و با staging/production-sim تکراری نباشند.

secretهای dev را جداگانه بسازید؛ هیچ secret یا database URL از محیط‌های دیگر کپی نشود:

```bash
cd "$HOME/mushroom/dev"
db_password=$(openssl rand -hex 32)
printf '%s' "$db_password" > secrets/postgres_password
printf 'postgresql://mushroom_dev:%s@postgres:5432/mushroom_dev?schema=public' "$db_password" > secrets/database_url
openssl rand -base64 48 | tr -d '\n=+/' > secrets/jwt_access_secret
openssl rand -base64 48 | tr -d '\n=+/' > secrets/refresh_token_pepper
openssl rand -base64 32 | tr -d '\n' > secrets/payment_credential_encryption_key
printf 'v0:%s' "$(openssl rand -base64 32 | tr -d '\n')" > secrets/payment_credential_decryption_keys
chmod 600 runtime.env secrets/*
unset db_password
```

### ۸.۳. DNS، HTTPS و دسترسی تیم

چهار DNS record به IP همین VPS اشاره می‌کنند. Caddy باید آن‌ها را به loopbackهای زیر بفرستد و TLS را terminate کند:

| hostname نمونه | upstream |
|---|---|
| `dev.example.com` | `http://127.0.0.1:3300` |
| `dev-app.example.com` | `http://127.0.0.1:3301` |
| `dev-dashboard.example.com` | `http://127.0.0.1:3302` |
| `dev-api.example.com` | `http://127.0.0.1:3303` |

فایل `/etc/caddy/sites/mushroom-dev.caddy` را با این چهار virtual host بسازید:

```caddyfile
dev.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3300
}

dev-app.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3301
}

dev-dashboard.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3302
}

dev-api.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3303
}
```

فایل اصلی `/etc/caddy/Caddyfile` باید `import /etc/caddy/sites/*.caddy` داشته باشد. پس از تغییر، با
`caddy fmt` و `caddy validate` بررسی و سپس Caddy را reload کنید؛ صدور و تمدید HTTPS را خود Caddy انجام می‌دهد.

`reverse_proxy` در Caddy به‌صورت پیش‌فرض WebSocket را عبور می‌دهد. این رفتار برای Next development الزامی است:
در Next 16، HTML اولیه تا اتصال موفق `/_next/hmr` hydrate نمی‌شود. deployment برای هر سه دامنه handshake واقعی
مرورگر را با `Origin`، `Upgrade` و `Sec-WebSocket-Extensions` بررسی می‌کند و در صورت نگرفتن `101 Switching
Protocols` موفق اعلام نمی‌شود. `APP_ORIGINS` علاوه بر CORS API، پس از تبدیل URLها به hostname به
`allowedDevOrigins` هر سه Next server داده می‌شود؛ بنابراین دامنه تازه باید ابتدا به همین فهرست اضافه شود.

syncهای عادی build کامل فرانت اجرا نمی‌کنند. برای تغییر هرکدام از `apps/web`، `apps/app` یا `apps/dashboard` فقط
همان Next dev container با source bind-mounted دوباره ساخته می‌شود؛ تغییر dependency یا runtime همچنان هر سه را
برای سازگاری recreate می‌کند.

این دامنه‌ها عمومی و حاوی دادهٔ واقعی نباشند. دسترسی را در Caddy با VPN، allowlist IP یا authentication
سازمانی محدود کنید؛ dev نباید با credential بیمار یا درگاه واقعی استفاده شود.

### ۸.۴. فعال‌سازی GitHub و اولین sync

چهار secret قبلی `VPS_HOST`، `VPS_USER`، `VPS_SSH_PRIVATE_KEY` و `VPS_KNOWN_HOSTS` و variable اختیاری
`VPS_PORT` دوباره استفاده می‌شوند. در `Settings → Secrets and variables → Actions → Variables` متغیر جدید
`VPS_DEV_CD_ENABLED=true` را اضافه کنید. هیچ secret جدیدی برای database در GitHub قرار نمی‌گیرد.

پس از mergeشدن این تغییر در `main`، branch را یک‌بار بسازید:

```bash
git fetch origin
git push origin origin/main:refs/heads/dev
```

از آن پس هر commit که باید فوری روی dev دیده شود روی همین branch push می‌شود. workflow `Sync shared dev VPS` سورس
را با checksum sync و هر چهار URL را health-check می‌کند. سه رابط Next.js واقعاً با `next dev` و HMR دائمی اجرا
می‌شوند؛ بنابراین تغییر فقط در `web`، `app` یا `dashboard` نه build می‌گیرد و نه container را restart می‌کند.
dependency install، API client build، Prisma generate/migrate و API transpile فقط وقتی ورودی همان بخش عوض شده باشد
اجرا می‌شوند. API به‌دلیل سقف حافظهٔ VPS compiler دائمی ندارد: تغییر API یک transpile محدود انجام می‌دهد و فقط
container API را recreate می‌کند. seed فقط در اولین اجراست. merge به `main` همچنان مسیر کامل CI/CD production را
طی می‌کند.

وضعیت جاری روی سرور:

```bash
cd "$HOME/mushroom/dev/workspace"
docker compose --env-file "$HOME/mushroom/dev/runtime.env" \
  -f deploy/vps/compose.dev.yaml --project-name mushroom-dev ps
cat "$HOME/mushroom/dev/state/source.sha"
```

اگر عمداً volume دیتابیس dev را جداگانه حذف کردید، marker
`$HOME/mushroom/dev/state/seeded` را نیز پیش از sync بعدی حذف کنید. اسکریپت معمول deployment هیچ database reset،
down migration یا دست‌کاری state محیط‌های release انجام نمی‌دهد.
