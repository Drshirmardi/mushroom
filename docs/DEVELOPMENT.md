# راه‌اندازی Development و GitHub Codespaces

این راهنما پروژه را با hot reload اجرا می‌کند: PostgreSQL در Docker Compose و چهار برنامه از طریق `pnpm dev`.
این محیط برای توسعه، بازبینی رابط‌ها و داده آزمایشی است. از secret، credential سداد یا داده واقعی بیمار در آن
استفاده نکنید.

## پیش‌نیازها

- Git
- Node.js 24
- pnpm 10.10.0 از طریق Corepack
- Docker با Compose v2

نسخه‌ها را کنترل کنید:

```bash
node --version
corepack --version
docker --version
docker compose version
```

اگر Node 24 با `nvm` نصب می‌شود:

```bash
nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@10.10.0 --activate
```

## راه‌اندازی محلی

همه فرمان‌ها را از ریشه repository اجرا کنید.

### ۱. نصب dependencyها

```bash
pnpm install --frozen-lockfile
```

### ۲. اجرای PostgreSQL توسعه

```bash
docker compose up -d postgres
docker compose ps
```

PostgreSQL باید بعد از چند ثانیه `healthy` شود. در صورت خطا:

```bash
docker compose logs postgres
```

### ۳. ایجاد تنظیمات محلی API

فایل نمونه را کپی کنید:

```bash
cp apps/api/.env.example apps/api/.env
```

در PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

در `apps/api/.env` حداقل این مقدارها را با secretهای تصادفی مخصوص همان محیط جایگزین کنید:

- `JWT_ACCESS_SECRET`: حداقل ۳۲ بایت تصادفی با encoding سازگار با base64url
- `REFRESH_TOKEN_PEPPER`: مقدار تصادفی مستقل از JWT secret
- `DEV_DASHBOARD_ADMIN_PASSWORD`: رمز فقط برای حساب توسعه
- `PAYMENT_CREDENTIAL_ENCRYPTION_KEY`: در صورت تست تنظیمات پرداخت، base64 استاندارد دقیقاً ۳۲ بایت

برای تولید مقادیر Development با Node:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

مقدارهای پیش‌فرض دیتابیس توسعه با `compose.yaml` هماهنگ‌اند:

```dotenv
DATABASE_URL=postgresql://sabz_zendegi:local-development-password@localhost:5432/sabz_zendegi?schema=public
APP_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
SADAD_TRANSPORT_MODE=disabled
```

فایل `.env` در Git نادیده گرفته می‌شود. هیچ secret واقعی را commit نکنید.

### ۴. آماده‌سازی client و دیتابیس

```bash
pnpm --filter @sabz-zendegi/api-client build
pnpm --filter @sabz-zendegi/api prisma:generate
pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
pnpm --filter @sabz-zendegi/api prisma:seed
```

`seed` داده غیرحساس توسعه، نقش‌ها، کلینیک، پزشک‌ها، برنامه کاری، محصول نمونه و حساب ادمین Development را ایجاد
یا همگام می‌کند. `DEV_DASHBOARD_ADMIN_PHONE` و `DEV_DASHBOARD_ADMIN_PASSWORD` فقط وقتی
`NODE_ENV=development` باشد پذیرفته می‌شوند.

### ۵. اجرای برنامه‌ها

```bash
pnpm dev
```

آدرس‌های محلی:

| برنامه | آدرس |
|---|---|
| Web | <http://localhost:3000> |
| App | <http://localhost:3001> |
| Dashboard | <http://localhost:3002> |
| API | <http://localhost:3003> |
| Swagger | <http://localhost:3003/docs> |

### بازبینی از شبکهٔ محلی

برای باز کردن برنامه از تلفن یا دستگاه دیگری در همان شبکه، URLها باید همگی
یک host داشته باشند. برنامه‌ها در حالت `pnpm dev` روی همهٔ رابط‌های شبکه گوش
می‌دهند و URL API و برنامه‌های دیگر را از IP فعلی مرورگر می‌سازند؛ بنابراین
نیازی به build نیست. تنها تنظیم لازم، allowlist دقیق API است. IP دستگاه توسعه
را با originهای localhost در `apps/api/.env` قرار دهید و API را دوباره اجرا کنید:

```dotenv
APP_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://192.168.1.20:3000,http://192.168.1.20:3001,http://192.168.1.20:3002
```

Next نیز assetها و WebSocket توسعه را فقط برای hostnameهای مجاز ارائه می‌کند. همان IP شبکه را پیش از
اجرای workspace در اختیار هر سه Next dev server قرار دهید؛ مقدارها hostname هستند و scheme یا port ندارند:

```bash
export NEXT_ALLOWED_DEV_ORIGINS=192.168.1.20
pnpm dev
```

سپس Web، App و Dashboard را با همان IP و پورت‌های ۳۰۰۰ تا ۳۰۰۲ باز کنید.
`localhost` و IP را در یک نشست مخلوط نکنید؛ cookie توسعه host-only است و هر
origin باید صریحاً در allowlist باشد. برای دامنهٔ توسعه نیز همین سه origin دقیق
را وارد کنید؛ wildcard مجاز نیست.

سلامت API را در terminal دوم بررسی کنید:

```bash
curl -fsS http://localhost:3003/v1/health/live
curl -fsS http://localhost:3003/v1/health/ready
```

## راه‌اندازی در GitHub Codespaces

Codespace را از branch موردنظر repository بسازید. برای اجرای هم‌زمان چهار برنامه و PostgreSQL، ماشین ۴ هسته‌ای
یا بزرگ‌تر تجربه بهتری دارد.

### ۱. آماده‌سازی runtime

داخل terminal Codespace:

```bash
nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@10.10.0 --activate
pnpm install --frozen-lockfile
docker compose up -d postgres
```

### ۲. ایجاد `.env` مخصوص Codespace

ابتدا URLهای forwardشده را بسازید:

```bash
CODESPACE_DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
WEB_URL="https://${CODESPACE_NAME}-3000.${CODESPACE_DOMAIN}"
APP_URL="https://${CODESPACE_NAME}-3001.${CODESPACE_DOMAIN}"
DASHBOARD_URL="https://${CODESPACE_NAME}-3002.${CODESPACE_DOMAIN}"
API_URL="https://${CODESPACE_NAME}-3003.${CODESPACE_DOMAIN}"

JWT_ACCESS_SECRET="$(node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))')"
REFRESH_TOKEN_PEPPER="$(node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))')"
PAYMENT_KEY="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64"))')"

read -rsp "Development dashboard password: " ADMIN_PASSWORD
echo

cat > apps/api/.env <<EOF
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://sabz_zendegi:local-development-password@localhost:5432/sabz_zendegi?schema=public
SHADOW_DATABASE_URL=
DEV_DASHBOARD_ADMIN_PHONE=+989100000001
DEV_DASHBOARD_ADMIN_PASSWORD=${ADMIN_PASSWORD}
APP_ORIGINS=${WEB_URL},${APP_URL},${DASHBOARD_URL}
TRUSTED_PROXIES=
LOG_LEVEL=info
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_ACCESS_ISSUER=sabz-zendegi-api
JWT_ACCESS_AUDIENCE=sabz-zendegi-frontends
REFRESH_TOKEN_PEPPER=${REFRESH_TOKEN_PEPPER}
SADAD_TRANSPORT_MODE=disabled
SADAD_REQUEST_TIMEOUT_MS=5000
SADAD_RETURN_URL=
SADAD_REDIRECT_PROFILE=
PAYMENT_CREDENTIAL_ENCRYPTION_KEY=${PAYMENT_KEY}
PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION=v1
PAYMENT_CREDENTIAL_DECRYPTION_KEYS=
EOF
```

### ۳. تنظیم runtime URLهای frontend

در Codespaces، `localhost` مرورگر کاربر به API داخل Codespace اشاره نمی‌کند. فایل runtime config سه frontend را
برای همان Codespace تولید کنید:

```bash
export WEB_URL APP_URL DASHBOARD_URL API_URL

node --input-type=module <<'NODE'
import { writeFile } from 'node:fs/promises';

const config = {
  apiUrl: process.env.API_URL,
  webUrl: process.env.WEB_URL,
  appUrl: process.env.APP_URL,
  dashboardUrl: process.env.DASHBOARD_URL,
};
const output =
  `window.__MUSHROOM_RUNTIME_CONFIG__ = Object.freeze(${JSON.stringify(config)});\n`;

for (const path of [
  'apps/web/public/runtime-config.js',
  'apps/app/public/runtime-config.js',
  'apps/dashboard/public/runtime-config.js',
]) {
  await writeFile(path, output);
}
NODE
```

این سه فایل tracked هستند و تغییر Codespaces آن‌ها نباید commit شود. برای برگرداندنشان:

```bash
git restore \
  apps/web/public/runtime-config.js \
  apps/app/public/runtime-config.js \
  apps/dashboard/public/runtime-config.js
```

### ۴. migration، seed و اجرا

```bash
pnpm --filter @sabz-zendegi/api-client build
pnpm --filter @sabz-zendegi/api prisma:generate
pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
pnpm --filter @sabz-zendegi/api prisma:seed
pnpm dev
```

پورت‌های `3000` تا `3003` را در پنل **Ports** نگه دارید. visibility پیش‌فرض `Private` برای بازبینی شخصی مناسب
است. برای دموی موقت به شخص دیگر باید هر چهار پورت frontend/API با هم public شوند؛ پورت PostgreSQL `5432` را public
نکنید و بعد از دمو visibility را دوباره private کنید.

اگر frontend به‌جای پاسخ API صفحه ورود GitHub را دریافت کرد، URL زیر را یک‌بار در همان مرورگر باز کنید تا دسترسی
پورت خصوصی Codespaces برقرار شود:

```text
https://CODESPACE-NAME-3003.app.github.dev/v1/health/ready
```

## توقف، شروع مجدد و پاک‌سازی

اجرای برنامه‌ها را با `Ctrl+C` متوقف کنید. PostgreSQL را بدون حذف داده متوقف کنید:

```bash
docker compose stop postgres
```

پس از restart شدن محیط:

```bash
docker compose up -d postgres
pnpm --filter @sabz-zendegi/api-client build
pnpm dev
```

برای حذف کامل دیتابیس Development و ساخت مجدد آن:

```bash
docker compose down -v
docker compose up -d postgres
pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
pnpm --filter @sabz-zendegi/api prisma:seed
```

`docker compose down -v` مخرب است و فقط برای دیتابیس disposable توسعه مجاز است؛ آن را روی staging یا production
اجرا نکنید.

## به‌روزرسانی محیط توسعه

بعد از دریافت تغییرهای repository:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @sabz-zendegi/api-client build
pnpm --filter @sabz-zendegi/api prisma:generate
pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
pnpm --filter @sabz-zendegi/api prisma:seed
pnpm dev
```

در Codespaces، اگر نام محیط یا URL پورت‌ها تغییر کرده باشد، مرحله runtime config را دوباره اجرا کنید.

## عیب‌یابی سریع

- خطای resolve شدن `@sabz-zendegi/api-client`: فرمان build آن package را دوباره اجرا کنید.
- API به دیتابیس وصل نمی‌شود: `docker compose ps` و `docker compose logs postgres` را بررسی کنید.
- API هنگام startup تنظیمات را رد می‌کند: placeholderهای JWT و refresh pepper را با مقدار تصادفی معتبر جایگزین کنید.
- درخواست مرورگر CORS می‌گیرد: `APP_ORIGINS` باید دقیقاً originهای بازشده در مرورگر را، بدون path، شامل شود.
- صفحه با HTML دیده می‌شود ولی تعاملی نیست: `NEXT_ALLOWED_DEV_ORIGINS` باید hostname شبکه/tunnel را داشته باشد و
  proxy باید WebSocket مسیر `/_next/hmr` را با headerهای `Upgrade` و `Connection` عبور دهد.
- Codespace از خواب برگشته است: PostgreSQL و `pnpm dev` را دوباره شروع کنید؛ processها هنگام توقف Codespace باقی
  نمی‌مانند.

## بررسی قبل از تحویل تغییر

حداقل بررسی متناسب با فایل‌های تغییرکرده را اجرا کنید:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

تست کامل workspace به PostgreSQL معتبر نیاز دارد. برای قرارداد CI و تست‌های طولانی ظرفیت، [راهنمای CI](../.github/CI.md)
و [وضعیت roadmap](../plan/STATUS.md) را ببینید.
