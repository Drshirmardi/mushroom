# راه‌اندازی Development مشترک روی VPS

این راهنما محیط توسعهٔ سریع و مشترک پروژه را روی VPS آزمایشی فعال می‌کند. push روی branch ثابت `dev` سورس را با
SSH و `rsync` به سرور می‌رساند و watcherهای Nest و Next تغییر را بدون ساخت image تولیدی نمایش می‌دهند. این مسیر از
`staging` و `production-sim` جداست و جای CI، imageهای immutable یا تأیید production را نمی‌گیرد.

برای توسعهٔ محلی و Codespaces از [راهنمای Development](DEVELOPMENT.md) و برای ساخت artifact تولیدی از
[راهنمای Production](PRODUCTION.md) استفاده کنید.

## وضعیت و مرزهای محیط

محیط dev روی همان VPS آزمایشی اجرا می‌شود، اما این منابع را مستقل نگه می‌دارد:

| منبع | dev |
|---|---|
| Compose project | `mushroom-dev` |
| PostgreSQL database/user | `mushroom_dev` |
| مسیر host | `/home/deploy/mushroom/dev` |
| Web | `127.0.0.1:3200` / `https://dev.roxco.ir` |
| App | `127.0.0.1:3201` / `https://dev-app.roxco.ir` |
| Dashboard | `127.0.0.1:3202` / `https://dev-dashboard.roxco.ir` |
| API | `127.0.0.1:3203` / `https://dev-api.roxco.ir` |

فقط دادهٔ ساختگی در این محیط مجاز است. secretهای staging/production، اطلاعات واقعی بیمار و credential واقعی سداد
نباید وارد dev شوند. transport سداد در Compose این محیط صریحاً `disabled` است.

## ۱. پیش‌نیازها و بررسی ظرفیت

روی Ubuntu/Debian، Docker Engine، Docker Compose v2، Caddy، `curl`، `openssl` و `rsync` لازم‌اند. Caddy موجود را
نگه دارید؛ Nginx و Certbot برای این سرور لازم نیستند.

با root یا کاربر sudo:

```bash
apt-get update
apt-get install -y rsync openssl curl

docker version
docker compose version
caddy version
```

سپس ظرفیت host را بررسی کنید:

```bash
free -h
df -h /var/lib/docker /home/deploy
docker stats --no-stream
```

مقادیر پیش‌فرض dev در مجموع تا حدود `3.75 CPU` و `3.8 GiB RAM` محدود شده‌اند. اگر این headroom کنار staging وجود
ندارد، limitهای `DEV_*` را در `runtime.env` کاهش دهید یا dev را روی VPS جدا اجرا کنید.

## ۲. DNS

این چهار رکورد `A` باید به IP عمومی VPS اشاره کنند:

| Name | مقدار فعلی |
|---|---|
| `dev.roxco.ir` | `46.8.228.24` |
| `dev-app.roxco.ir` | `46.8.228.24` |
| `dev-dashboard.roxco.ir` | `46.8.228.24` |
| `dev-api.roxco.ir` | `46.8.228.24` |

اگر DNS پشت proxy دیگری مانند Cloudflare است، برای اولین صدور گواهی آن را موقتاً روی `DNS only` نگه دارید. بررسی:

```bash
dig +short dev.roxco.ir
dig +short dev-app.roxco.ir
dig +short dev-dashboard.roxco.ir
dig +short dev-api.roxco.ir
```

هر چهار فرمان باید IP VPS را برگردانند.

## ۳. پوشه‌ها، runtime و secretهای مستقل

با root پوشه‌ها را بسازید و دسترسی Docker کاربر deployment را بررسی کنید:

```bash
install -d -m 700 -o deploy -g deploy \
  /home/deploy/mushroom/dev \
  /home/deploy/mushroom/dev/secrets \
  /home/deploy/mushroom/dev/workspace \
  /home/deploy/mushroom/dev/cache \
  /home/deploy/mushroom/dev/state

sudo -u deploy docker version
sudo -u deploy docker compose version
```

اگر فرمان Docker برای `deploy` مجاز نبود، کاربر را به گروه Docker اضافه و session او را دوباره باز کنید:

```bash
usermod -aG docker deploy
```

با کاربر `deploy` فایل `/home/deploy/mushroom/dev/runtime.env` را از نمونهٔ
[`deploy/vps/dev-env.example`](../deploy/vps/dev-env.example) بسازید. مقدارهای پروژهٔ فعلی باید چنین باشند:

```dotenv
MUSHROOM_ENVIRONMENT=development
COMPOSE_PROJECT_NAME=mushroom-dev
MUSHROOM_ENV_ROOT=/home/deploy/mushroom/dev
DEV_WORKSPACE_PATH=/home/deploy/mushroom/dev/workspace
DEV_CACHE_PATH=/home/deploy/mushroom/dev/cache
DEV_UID=1000
DEV_GID=1000

POSTGRES_IMAGE=postgres:16-alpine
POSTGRES_DB=mushroom_dev
POSTGRES_USER=mushroom_dev

PUBLIC_API_URL=https://dev-api.roxco.ir
PUBLIC_WEB_URL=https://dev.roxco.ir
PUBLIC_APP_URL=https://dev-app.roxco.ir
PUBLIC_DASHBOARD_URL=https://dev-dashboard.roxco.ir
APP_ORIGINS=https://dev.roxco.ir,https://dev-app.roxco.ir,https://dev-dashboard.roxco.ir
TRUSTED_PROXIES=127.0.0.1/32
PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION=v1
LOG_LEVEL=debug

API_PORT=127.0.0.1:3203
WEB_PORT=127.0.0.1:3200
APP_PORT=127.0.0.1:3201
DASHBOARD_PORT=127.0.0.1:3202

DEV_POSTGRES_CPUS=0.50
DEV_POSTGRES_MEMORY=512m
DEV_API_CPUS=1.00
DEV_API_MEMORY=1g
DEV_WEB_CPUS=0.75
DEV_WEB_MEMORY=768m
DEV_APP_CPUS=0.75
DEV_APP_MEMORY=768m
DEV_DASHBOARD_CPUS=0.75
DEV_DASHBOARD_MEMORY=768m
```

UID و GID را حدس نزنید؛ روی سرور با `id -u` و `id -g` بگیرید و در فایل قرار دهید. سپس secretهای مصنوعی را بسازید:

```bash
sudo -iu deploy
cd "$HOME/mushroom/dev"
umask 077

db_password=$(openssl rand -hex 32)
printf '%s' "$db_password" > secrets/postgres_password
printf 'postgresql://mushroom_dev:%s@postgres:5432/mushroom_dev?schema=public' "$db_password" \
  > secrets/database_url
openssl rand -base64 48 | tr -d '\n=+/' > secrets/jwt_access_secret
openssl rand -base64 48 | tr -d '\n=+/' > secrets/refresh_token_pepper
openssl rand -base64 32 | tr -d '\n' > secrets/payment_credential_encryption_key
printf 'v0:%s' "$(openssl rand -base64 32 | tr -d '\n')" > secrets/payment_credential_decryption_keys
chmod 600 runtime.env secrets/*
unset db_password
```

فقط metadata را بررسی کنید و محتوای secretها را چاپ نکنید:

```bash
find "$HOME/mushroom/dev/secrets" -maxdepth 1 -type f -printf '%f  %m  %s bytes\n'
grep -E '^(MUSHROOM_ENVIRONMENT|COMPOSE_PROJECT_NAME|PUBLIC_|API_PORT|WEB_PORT|APP_PORT|DASHBOARD_PORT)=' \
  "$HOME/mushroom/dev/runtime.env"
```

## ۴. اگر Nginx نصب شده است

روی این VPS Caddy از قبل پورت‌های عمومی و TLS را مدیریت می‌کند. اجرای هم‌زمان Nginx باعث conflict روی پورت‌های
`80/443` می‌شود. اگر Nginx را طبق یک راهنمای قبلی نصب کرده‌اید، آن را غیرفعال کنید؛ حذف package ضروری نیست:

```bash
systemctl disable --now nginx
systemctl reset-failed nginx
systemctl is-active caddy
systemctl is-enabled caddy
```

دو خروجی آخر باید `active` و `enabled` باشند. فایل‌های staging در Caddy را حذف یا بازنویسی نکنید.

## ۵. اتصال دامنه‌ها با Caddy و HTTPS

با root یک فایل جدا برای dev بسازید تا routeهای staging دست‌نخورده بمانند:

```bash
install -d -m 755 /etc/caddy/sites

cat >/etc/caddy/sites/mushroom-dev.caddy <<'EOF'
dev.roxco.ir {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3200
}

dev-app.roxco.ir {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3201
}

dev-dashboard.roxco.ir {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3202
}

dev-api.roxco.ir {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3203
}
EOF

grep -qxF 'import /etc/caddy/sites/*.caddy' /etc/caddy/Caddyfile || \
  printf '\nimport /etc/caddy/sites/*.caddy\n' >> /etc/caddy/Caddyfile

caddy fmt --overwrite /etc/caddy/Caddyfile
caddy fmt --overwrite /etc/caddy/sites/mushroom-dev.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl --no-pager --full status caddy
```

Caddy پس از resolveشدن DNS و دسترسی عمومی پورت‌های `80/443`، HTTPS را خودکار صادر و تمدید می‌کند. برای WebSocket
و hot reload تنظیم header دستی لازم نیست. تا قبل از اجرای containerهای dev، درخواست دامنه‌ها ممکن است `502` بدهد؛
این در این مرحله طبیعی است.

این چهار hostname پس از این مرحله از اینترنت قابل دسترسی‌اند. فقط داده و حساب ساختگی استفاده کنید. اگر دسترسی باید
به اعضای تیم محدود باشد، VPN یا access gateway موجود سازمان را جلوی Caddy قرار دهید؛ credential واقعی بیمار، پرداخت
یا production راه‌حل کنترل دسترسی dev نیست.

لاگ صدور گواهی یا خطای proxy:

```bash
journalctl -u caddy --since '15 minutes ago' --no-pager
```

## ۶. تنظیم GitHub

ابتدا Pull Request مربوط به پیاده‌سازی dev باید در `main` merge شود. سپس در
`Settings → Secrets and variables → Actions → Variables` این repository variable را اضافه کنید:

```text
VPS_DEV_CD_ENABLED=true
```

workflow همان تنظیمات موجود VPS را استفاده می‌کند:

- secretهای `VPS_HOST`، `VPS_USER`، `VPS_SSH_PRIVATE_KEY` و `VPS_KNOWN_HOSTS`
- variable اختیاری `VPS_PORT`؛ مقدار پیش‌فرض `22` است

هیچ secret دیتابیس یا application dev را در GitHub قرار ندهید. این فایل‌ها فقط روی VPS می‌مانند. branch `dev`
کد بررسی‌نشده را با deployment identity اجرا می‌کند؛ بنابراین write access آن را فقط به maintainerهای مورد اعتماد
بدهید و workflowهای pull request از fork را به secretهای repository متصل نکنید.

## ۷. اولین اجرا

بعد از mergeشدن PR و سبزشدن CI روی `main`، branch مشترک را برای بار اول از همان `main` بسازید:

```bash
git fetch origin
git push origin origin/main:refs/heads/dev
```

این push workflow `Sync shared dev VPS` را اجرا می‌کند. اجرای اول image توسعه را می‌سازد، dependencyها را نصب می‌کند،
PostgreSQL مستقل را بالا می‌آورد، migrationهای forward-only و seed یک‌باره را اجرا می‌کند و چهار سرویس را health-check
می‌کند. ساخت image تولیدی یا انتشار GHCR در این مسیر انجام نمی‌شود.

پس از سبزشدن workflow، با کاربر `deploy` بررسی کنید:

```bash
cd "$HOME/mushroom/dev/workspace"

docker compose \
  --project-name mushroom-dev \
  --env-file "$HOME/mushroom/dev/runtime.env" \
  --file deploy/vps/compose.dev.yaml \
  ps

cat "$HOME/mushroom/dev/state/source.sha"
ss -lnt | grep -E '127\.0\.0\.1:320[0-3]'

curl --fail http://127.0.0.1:3203/v1/health/ready
curl --fail --head http://127.0.0.1:3200/
curl --fail --head http://127.0.0.1:3201/
curl --fail --head http://127.0.0.1:3202/

curl --fail https://dev-api.roxco.ir/v1/health/ready
curl --fail --head https://dev.roxco.ir/
curl --fail --head https://dev-app.roxco.ir/
curl --fail --head https://dev-dashboard.roxco.ir/
```

## ۸. روند روزمرهٔ تیم

تغییرات سریع ابتدا روی feature branch ساخته می‌شوند. برای نمایش روی VPS آن branch را با `dev` ادغام و push کنید:

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
git merge YOUR_FEATURE_BRANCH
git push origin dev
```

workflow سورس را sync می‌کند. تغییر عادی فایل توسط watcher دیده می‌شود؛ تغییر dependency، Dockerfile یا Compose باعث
bootstrap/recreate کنترل‌شده می‌شود و migration جدید با `prisma migrate deploy` اجرا می‌شود. merge به `main` همچنان
باید از Pull Request و CI کامل عبور کند و مسیر immutable image/staging را اجرا می‌کند.

## ۹. لاگ، توقف و عیب‌یابی

برای دیدن لاگ‌ها:

```bash
cd "$HOME/mushroom/dev/workspace"
docker compose \
  --project-name mushroom-dev \
  --env-file "$HOME/mushroom/dev/runtime.env" \
  --file deploy/vps/compose.dev.yaml \
  logs --tail=150 api web app dashboard postgres
```

برای توقف موقت applicationها بدون حذف داده:

```bash
docker compose \
  --project-name mushroom-dev \
  --env-file "$HOME/mushroom/dev/runtime.env" \
  --file deploy/vps/compose.dev.yaml \
  stop api web app dashboard
```

push بعدی سرویس‌ها را دوباره بالا می‌آورد. `docker compose down -v`، حذف volume PostgreSQL و پاک‌کردن پوشهٔ
`secrets` بخشی از عملیات عادی نیستند. اسکریپت deployment به staging یا production-sim دست نمی‌زند.

اگر workflow شکست خورد، به‌ترتیب این موارد را بررسی کنید:

1. repository variable برابر دقیق `true` باشد و workflow از branch `dev` اجرا شده باشد.
2. SSH secretها و host key همان مقادیر پذیرفته‌شدهٔ staging باشند.
3. `runtime.env`، UID/GID و شش فایل secret وجود داشته و mode آن‌ها `600` باشد.
4. پورت‌های `3200` تا `3203` با محیط دیگری تداخل نداشته باشند.
5. `docker compose ... ps` و لاگ سرویس failing را بررسی کنید.
6. برای خطای دامنه/TLS، `caddy validate` و `journalctl -u caddy` را بررسی کنید.

جزئیات قرارداد workflow و مرز آن با release در [راهنمای CI/CD VPS](../deploy/vps/README.md) ثبت شده است.
