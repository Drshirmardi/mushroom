# ساخت image و استقرار Production

این راهنما artifactهای provider-neutral پروژه را می‌سازد و فرایند انتشار آن‌ها را از registry تا staging و
production توضیح می‌دهد. اجرای فرمان‌ها به‌تنهایی مجوز production یا فعال‌سازی سداد نیست؛ gateهای باز Phase 12 و
sign-off مالک همچنان لازم‌اند.

## مدل انتشار

```text
reviewed commit
    → build/test/scan four OCI images once
    → push immutable images to registry
    → deploy exact digests to staging
    → run migration once and verify
    → manual approval
    → promote the same digests to production
```

چهار image مستقل هستند:

- `mushroom-api`
- `mushroom-web`
- `mushroom-app`
- `mushroom-dashboard`

runner نهایی آن‌ها Distroless Node 24 و non-root با UID/GID `65532:65532` است. imageهای Next، URLهای عمومی را
هنگام startup دریافت می‌کنند؛ بنابراین برای تغییر provider یا promotion از staging به production rebuild لازم نیست.

## پیش‌نیازهای محیط مقصد

- میزبان Linux/OCI یا PaaS سازگار با OCI
- PostgreSQL 16+ خارج از containerهای برنامه
- reverse proxy دارای HTTPS و WebSocket upgrade
- دسترسی outbound HTTPS
- registry خصوصی یا عمومی قابل دسترس برای میزبان
- secret manager یا فایل‌های secret با دسترسی محدود
- backup/restore آزمایش‌شده و monitoring متناسب با Phase 12

Realtime فعلی تک‌instance است. تا زمانی که adapter توزیع‌شده Socket.IO/session تصویب و تست نشده، API را بیشتر از
یک replica اجرا نکنید.

## ۱. انتخاب commit و نام imageها

روی checkout تمیز و reviewed:

```bash
git status --short
git rev-parse HEAD

VERSION="$(git rev-parse --short=12 HEAD)"
REGISTRY="ghcr.io/OWNER"

API_IMAGE="${REGISTRY}/mushroom-api:${VERSION}"
WEB_IMAGE="${REGISTRY}/mushroom-web:${VERSION}"
APP_IMAGE="${REGISTRY}/mushroom-app:${VERSION}"
DASHBOARD_IMAGE="${REGISTRY}/mushroom-dashboard:${VERSION}"
```

`OWNER` را با owner واقعی registry جایگزین کنید. از `latest` برای promotion استفاده نکنید.

## ۲. ساخت چهار image

دستورها باید از ریشه repository اجرا شوند:

```bash
docker build --pull \
  -f deploy/docker/Dockerfile.api \
  -t "$API_IMAGE" \
  .

docker build --pull \
  --build-arg APP=web \
  -f deploy/docker/Dockerfile.next \
  -t "$WEB_IMAGE" \
  .

docker build --pull \
  --build-arg APP=app \
  -f deploy/docker/Dockerfile.next \
  -t "$APP_IMAGE" \
  .

docker build --pull \
  --build-arg APP=dashboard \
  -f deploy/docker/Dockerfile.next \
  -t "$DASHBOARD_IMAGE" \
  .
```

ساخت imageها به secret یا دیتابیس واقعی نیاز ندارد. secret را با `--build-arg`، `ENV` یا فایل داخل build context
وارد image نکنید.

## ۳. smoke test artifactهای واقعی

اسکریپت CI repository برای هر image، اجرای non-root، HTTP readiness، runtime config و در مورد API، migration روی
PostgreSQL disposable را بررسی و resourceهای خودش را پاک می‌کند:

```bash
node scripts/ci-container-smoke.mjs "$API_IMAGE" api
node scripts/ci-container-smoke.mjs "$WEB_IMAGE" web
node scripts/ci-container-smoke.mjs "$APP_IMAGE" app
node scripts/ci-container-smoke.mjs "$DASHBOARD_IMAGE" dashboard
```

هر چهار فرمان باید `PASS` شوند. این تست، استقرار واقعی یا قابلیت backup/provider را تأیید نمی‌کند.

## ۴. اسکن imageها

CI با Trivy هر finding سطح Critical یا High را رد می‌کند. نمونه اجرای محلی:

```bash
for IMAGE in "$API_IMAGE" "$WEB_IMAGE" "$APP_IMAGE" "$DASHBOARD_IMAGE"; do
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:0.75.0 image \
    --scanners vuln \
    --severity CRITICAL,HIGH \
    --exit-code 1 \
    "$IMAGE"
done
```

finding را mute یا waive نکنید. image اصلاح‌شده باید دوباره از ابتدا build، smoke و scan شود.

## ۵. push به registry و ثبت digest

برای GHCR ابتدا با حساب و token دارای `write:packages` وارد شوید:

```bash
docker login ghcr.io
```

سپس:

```bash
docker push "$API_IMAGE"
docker push "$WEB_IMAGE"
docker push "$APP_IMAGE"
docker push "$DASHBOARD_IMAGE"
```

پس از push، digestهای immutable را ثبت کنید:

```bash
docker image inspect --format '{{index .RepoDigests 0}}' "$API_IMAGE"
docker image inspect --format '{{index .RepoDigests 0}}' "$WEB_IMAGE"
docker image inspect --format '{{index .RepoDigests 0}}' "$APP_IMAGE"
docker image inspect --format '{{index .RepoDigests 0}}' "$DASHBOARD_IMAGE"
```

فایل release و محیط مقصد باید از `image@sha256:...` استفاده کنند، نه tag قابل جابه‌جایی.

## ۶. ساخت پوشه release روی VPS

نمونه ساختار:

```text
/opt/mushroom/
├── compose.production.yaml
├── release.env
├── release.previous.env
└── secrets/
    ├── database_url
    ├── jwt_access_secret
    ├── refresh_token_pepper
    ├── payment_credential_encryption_key
    └── payment_credential_decryption_keys
```

فایل Compose نمونه را روی سرور با نام واضح کپی کنید:

```bash
cp compose.production.example.yaml /opt/mushroom/compose.production.yaml
cd /opt/mushroom
```

دسترسی پوشه secretها را محدود کنید:

```bash
install -d -m 700 secrets
chmod 600 secrets/* 2>/dev/null || true
```

secretهای واقعی فقط از secret manager یا کانال عملیاتی امن وارد این فایل‌ها می‌شوند. مقدار آن‌ها را در Git، issue،
release note یا log قرار ندهید.

## ۷. تنظیم `release.env`

نمونه بدون secret:

```dotenv
API_IMAGE=ghcr.io/OWNER/mushroom-api@sha256:API_DIGEST
WEB_IMAGE=ghcr.io/OWNER/mushroom-web@sha256:WEB_DIGEST
APP_IMAGE=ghcr.io/OWNER/mushroom-app@sha256:APP_DIGEST
DASHBOARD_IMAGE=ghcr.io/OWNER/mushroom-dashboard@sha256:DASHBOARD_DIGEST

PUBLIC_API_URL=https://api.example.com
PUBLIC_WEB_URL=https://example.com
PUBLIC_APP_URL=https://app.example.com
PUBLIC_DASHBOARD_URL=https://dashboard.example.com
APP_ORIGINS=https://example.com,https://app.example.com,https://dashboard.example.com
TRUSTED_PROXIES=REVERSE_PROXY_IP_OR_CIDR
PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION=v1

API_PORT=127.0.0.1:3003
WEB_PORT=127.0.0.1:3000
APP_PORT=127.0.0.1:3001
DASHBOARD_PORT=127.0.0.1:3002
```

binding به `127.0.0.1` برای reverse proxy نصب‌شده روی همان VPS، دسترسی مستقیم اینترنت به پورت‌های برنامه را
می‌بندد. اگر reverse proxy خودش container است، شبکه داخلی Compose و تنظیم port متناسب با همان topology را تعریف
کنید. فقط `80/443` باید عمومی باشند.

`TRUSTED_PROXIES` باید IP یا CIDR واقعی و محدود reverse proxy باشد؛ مقدار universal مانند `0.0.0.0/0` مجاز نیست.

## ۸. اعتبارسنجی و دریافت imageها

```bash
docker compose \
  --env-file release.env \
  -f compose.production.yaml \
  config

docker compose \
  --env-file release.env \
  -f compose.production.yaml \
  pull
```

شکست `config` یا `pull` انتشار را متوقف می‌کند.

## ۹. اجرای migration یک‌باره

قبل از جایگزینی application artifact، migration reviewed را از همان API image اجرا کنید:

```bash
docker compose \
  --env-file release.env \
  -f compose.production.yaml \
  run --rm api \
  node_modules/prisma/build/index.js migrate deploy
```

Migration نباید به startup عادی API متصل شود. هرگز در staging یا production از `prisma migrate reset`، down SQL،
truncate یا rollback تخریبی داده استفاده نکنید.

اگر migration شکست خورد، سرویس‌های جدید را بالا نیاورید. نسخه فعلی را فعال نگه دارید، علت را بررسی و با migration
forward-fix اصلاح کنید.

## ۱۰. بالا آوردن release

```bash
docker compose \
  --env-file release.env \
  -f compose.production.yaml \
  up -d --remove-orphans

docker compose \
  --env-file release.env \
  -f compose.production.yaml \
  ps
```

probeهای بیرونی:

```bash
curl -fsS https://api.example.com/v1/health/live
curl -fsS https://api.example.com/v1/health/ready
curl -fsS https://example.com/
curl -fsS https://app.example.com/
curl -fsS https://dashboard.example.com/
```

بعد از probeها، ورود، refresh session، مسیر اصلی بیمار، dashboard و اتصال realtime چت را با داده آزمایشی کنترل
کنید. خطا در health یا smoke باید promotion را متوقف کند.

## ۱۱. promotion از staging به production

1. چهار digest را ابتدا در staging اجرا کنید.
2. migration، health، smoke، monitoring و بررسی لاگ staging باید پاس شوند.
3. تأیید دستی مالک release را ثبت کنید.
4. همان چهار digest را بدون rebuild در `release.env` production قرار دهید.
5. secretها و دیتابیس production باید مستقل از staging باشند.
6. مراحل config، pull، migration، up و probe را برای production اجرا کنید.

هیچ فایل `.env`، database dump یا credential از staging به production کپی نمی‌شود.

## ۱۲. به‌روزرسانی release موجود

قبل از تغییر digestها نسخه فعلی را نگه دارید:

```bash
cp release.env release.previous.env
```

digestهای جدید و تأییدشده را در `release.env` قرار دهید، سپس:

```bash
docker compose --env-file release.env -f compose.production.yaml config
docker compose --env-file release.env -f compose.production.yaml pull
docker compose --env-file release.env -f compose.production.yaml run --rm api \
  node_modules/prisma/build/index.js migrate deploy
docker compose --env-file release.env -f compose.production.yaml up -d --remove-orphans
docker compose --env-file release.env -f compose.production.yaml ps
```

در update عادی `docker compose down` اجرا نکنید؛ این کار همه سرویس‌ها را بی‌دلیل متوقف می‌کند. Compose تک‌میزبان
و API تک‌instance ممکن است هنگام recreate وقفه کوتاه داشته باشند؛ این topology ادعای zero-downtime ندارد.

## ۱۳. rollback برنامه

اگر image جدید بعد از migration دچار regression شد، فقط application artifact را به digest قبلی برگردانید:

```bash
cp release.previous.env release.env
docker compose --env-file release.env -f compose.production.yaml pull
docker compose --env-file release.env -f compose.production.yaml up -d --remove-orphans
```

دیتابیس به عقب برگردانده نمی‌شود. migrationها باید با الگوی `expand → migrate → contract` سازگار باشند تا artifact
قبلی با schema گسترش‌یافته اجرا شود. جزئیات در [راهنمای migration و rollback](../deploy/phase-12-migration-rollout.md)
ثبت شده است.

## ۱۴. Liara یا OCI PaaS

در PaaS، چهار image digest به چهار service جدا وصل می‌شوند. برای هر service، port، domain، health endpoint، public
runtime config و secret reference تعریف می‌شود. migration باید یک job یک‌باره از API image باشد. هیچ SDK، API یا
branch مخصوص Liara در application لازم نیست.

برای profile فعلی Liara، [مسیر انتشار Liara](../deploy/phase-12-liara-release.md) و
[تنظیمات profile](../deploy/profiles/liara.md) را ببینید. نبود evidence ارائه‌دهنده برای backup/WAL/restore، secret
rotation یا IP خروجی ثابت را با یک environment variable دور نزنید.

## ۱۵. سداد

ساخت و استقرار image، سداد را فعال نمی‌کند. `SADAD_TRANSPORT_MODE` تا تکمیل تمام موارد زیر `disabled` می‌ماند:

- پذیرندگی و credential خارج از Git
- callback HTTPS ثبت‌شده
- redirect profile تأییدشده
- IP خروجی ثابت ثبت‌شده نزد سداد
- تراکنش پذیرش کنترل‌شده
- monitoring و reconciliation
- تأیید نهایی مالک محصول

## مدارک مرتبط

- [قرارداد artifactهای deployment](../deploy/README.md)
- [Compose نمونه Production](../compose.production.example.yaml)
- [سیاست migration و rollback](../deploy/phase-12-migration-rollout.md)
- [ADR استقرار provider-neutral](../plan/decisions/ADR-0011-provider-neutral-oci-deployment.md)
- [CI و artifact gates](../.github/CI.md)
- [وضعیت Phase 12](../plan/STATUS.md)
