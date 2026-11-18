# سبز زندگی

مونوریپوی محصول «سبز زندگی» شامل سایت عمومی، اپلیکیشن بیمار، داشبورد عملیاتی و API کلینیک است. پروژه با
`pnpm workspace` و Turborepo مدیریت می‌شود، از PostgreSQL به‌عنوان منبع اصلی داده استفاده می‌کند و چهار
artifact مستقل OCI برای استقرار تولید دارد.

## شروع کار

- [راه‌اندازی Development و GitHub Codespaces](docs/DEVELOPMENT.md)
- [راهنمای کامل متغیرهای محیطی و secretها](docs/ENVIRONMENT.md)
- [ساخت imageها و استقرار Production](docs/PRODUCTION.md)
- [راه‌اندازی CI/CD روی VPS آزمایشی](deploy/vps/README.md)
- [راهنمای artifactهای استقرار](deploy/README.md)
- [وضعیت اجرایی و roadmap](plan/STATUS.md)

اگر هدف توسعه، بررسی رابط‌ها یا اجرای Codespaces است، از راهنمای Development شروع کنید. اگر هدف ساخت image یا
استقرار دستی است، راهنمای Production را دنبال کنید. برای انتشار خودکار پس از merge و تمرین staging/production-sim
روی VPS، راهنمای CI/CD روی VPS را دنبال کنید.

## برنامه‌ها

| Workspace | نقش | پورت پیش‌فرض |
|---|---|---:|
| `apps/web` | سایت عمومی و ورود/ثبت‌نام | `3000` |
| `apps/app` | اپلیکیشن بیمار، رزرو، درمان، فروشگاه و چت | `3001` |
| `apps/dashboard` | داشبورد کارکنان و مدیریت کلینیک | `3002` |
| `apps/api` | API مبتنی بر NestJS/Fastify و Socket.IO | `3003` |
| `packages/api-client` | client تولیدشده و type-safe برای API | — |

PostgreSQL توسعه روی پورت `5432` اجرا می‌شود. در production، دیتابیس باید خارج از containerهای برنامه و با
سیاست backup/restore مستقل ارائه شود.

## فناوری‌های اصلی

- Node.js 24 و pnpm 10.10
- Next.js 16، React 19 و TypeScript
- NestJS 11، Fastify و ejabberd برای چت
- PostgreSQL 16+، Prisma 7 و migrationهای immutable
- Docker/OCI با runnerهای Distroless و non-root
- GitHub Actions برای CI، تست، audit و بررسی artifactها

## دستورات رایج

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm images:build
```

برای اجرای محلی، Docker باید روشن باشد. `pnpm dev` سرویس ejabberd و PostgreSQL مخصوص آرشیو آن را
خودکار آماده می‌کند و سپس برنامه‌ها را اجرا می‌کند. کلیدهای محلی در `.local/chat/` نگه‌داری می‌شوند؛
با `Ctrl+C` کانتینرهای چت متوقف می‌شوند و داده‌ها حفظ می‌شوند. تنظیم و آماده‌سازی دیتابیس اصلی مطابق
[راهنمای توسعه](docs/DEVELOPMENT.md) است.

`pnpm images:build` هر چهار image تولیدی را با tag همان commit می‌سازد. smoke test و اسکن امنیتی با
`pnpm images:verify` و انتشار کنترل‌شده در registry با `pnpm images:push` انجام می‌شود؛ جزئیات در
[راهنمای Production](docs/PRODUCTION.md) آمده است.

اجرای integration testهای وابسته به PostgreSQL و profileهای ظرفیت، قرارداد و هزینه زمانی جداگانه دارند؛ آن‌ها
را طبق roadmap و راهنمای CI اجرا کنید، نه به‌عنوان بخشی از هر اجرای روزمره.

## مرزهای استقرار

مقصد استقرار پروژه VPS شخصی با Docker Compose است. چهار image تولیدی پس از بررسی روی staging همان VPS تمرین،
با همان digest و بدون rebuild برای promotion به محیط بعدی استفاده می‌شوند.

اتصال سداد روی VPS محیط dev آزمایش و پذیرفته شده است. این پذیرش، بررسی تنظیمات و تراکنش محیط staging یا production
را جایگزین نمی‌کند؛ نتیجه و callback هر محیط باید جداگانه ثبت شود و credentialها نباید وارد Git شوند.

## منبع حقیقت اجرای پروژه

پوشه [`plan/`](plan/README.md) منبع حقیقت taskها، dependencyها، blockerها و evidence است. پیش از تغییر roadmap یا
شروع یک task جدید، [`AGENTS.md`](AGENTS.md)، وضعیت زنده و فایل فاز فعال را بخوانید.
