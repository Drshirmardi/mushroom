# سبز زندگی

مونوریپوی محصول «سبز زندگی» شامل سایت عمومی، اپلیکیشن بیمار، داشبورد عملیاتی و API کلینیک است. پروژه با
`pnpm workspace` و Turborepo مدیریت می‌شود، از PostgreSQL به‌عنوان منبع اصلی داده استفاده می‌کند و چهار
artifact مستقل OCI برای استقرار تولید دارد.

## شروع کار

- [راه‌اندازی Development و GitHub Codespaces](docs/DEVELOPMENT.md)
- [ساخت imageها و استقرار Production](docs/PRODUCTION.md)
- [راهنمای artifactهای استقرار](deploy/README.md)
- [وضعیت اجرایی و roadmap](plan/STATUS.md)

اگر هدف توسعه، بررسی رابط‌ها یا اجرای Codespaces است، از راهنمای Development شروع کنید. اگر هدف ساخت image،
انتشار در registry، استقرار staging/production یا به‌روزرسانی سرور است، راهنمای Production را دنبال کنید.

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
- NestJS 11، Fastify و Socket.IO
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
```

اجرای integration testهای وابسته به PostgreSQL و profileهای ظرفیت، قرارداد و هزینه زمانی جداگانه دارند؛ آن‌ها
را طبق roadmap و راهنمای CI اجرا کنید، نه به‌عنوان بخشی از هر اجرای روزمره.

## مرزهای استقرار

چهار image تولیدی provider-neutral هستند و می‌توانند روی Linux VPS با Docker Compose، Liara یا هر OCI PaaS
سازگار اجرا شوند. URLهای عمومی frontend هنگام شروع container تزریق می‌شوند؛ بنابراین همان digest آزمایش‌شده بدون
rebuild از staging به production منتقل می‌شود.

اتصال واقعی سداد تا تکمیل پذیرندگی merchant، ثبت callback، تأیید IP خروجی ثابت، نگه‌داری credential خارج از Git و
sign-off نهایی با `SADAD_GO_LIVE_BLOCKED` مسدود است. اجرای Development، Codespaces یا ساخت image این gate را
فعال نمی‌کند.

## منبع حقیقت اجرای پروژه

پوشه [`plan/`](plan/README.md) منبع حقیقت taskها، dependencyها، blockerها و evidence است. پیش از تغییر roadmap یا
شروع یک task جدید، [`AGENTS.md`](AGENTS.md)، وضعیت زنده و فایل فاز فعال را بخوانید.
