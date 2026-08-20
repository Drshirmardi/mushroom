# Phase 00 — Backend Foundation

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `A`
- پیش‌نیاز: ندارد
- خروجی اصلی: API قابل اجرا، دیتابیس migration-based، استانداردهای سراسری و CI

## هدف

ایجاد پایه‌ای که تمام فازهای بعدی روی آن توسعه پیدا کنند. این فاز نباید business feature بسازد.

## Taskها

- [x] `F00-T01` — scaffold کردن NestJS در `apps/api` با Fastify adapter
- [ ] `F00-T02` — تنظیم package scripts، workspace، Turbo tasks و TypeScript config
- [ ] `F00-T03` — ایجاد config module و validation متغیرهای محیطی
- [ ] `F00-T04` — ایجاد Docker Compose توسعه برای PostgreSQL
- [ ] `F00-T05` — نصب و راه‌اندازی Prisma، schema پایه و migration اولیه
- [ ] `F00-T06` — تنظیم global prefix `/v1`، validation، serialization و exception filter
- [ ] `F00-T07` — ایجاد error contract پایدار با `code` و `requestId`
- [ ] `F00-T08` — structured logging، correlation ID و redaction داده حساس
- [ ] `F00-T09` — ایجاد health و readiness endpointها
- [ ] `F00-T10` — Swagger/OpenAPI و security schemeهای اولیه
- [ ] `F00-T11` — test harness شامل unit و integration با PostgreSQL واقعی
- [ ] `F00-T12` — migration smoke test و seed framework
- [ ] `F00-T13` — CI برای install، lint، typecheck، test، build و migration check
- [ ] `F00-T14` — اصلاح دستورهای ریشه و README اجرای development
- [ ] `F00-T15` — local/self-host کردن فونت‌های app و dashboard یا ثبت task جداگانه برای حذف وابستگی build به شبکه
- [ ] `F00-T16` — ثبت evidence و آماده‌سازی review فاز

## متغیرهای محیطی پایه

حداقل موارد:

```text
NODE_ENV
PORT
DATABASE_URL
APP_ORIGINS
LOG_LEVEL
JWT_ACCESS_SECRET یا placeholder تا Phase 01
```

یک `.env.example` بدون secret واقعی ایجاد شود.

## Endpointهای این فاز

```text
GET /v1/health/live
GET /v1/health/ready
GET /docs
GET /docs-json
```

## تست‌های اجباری

- app bootstrap test
- validation failure test
- standard error response test
- correlation ID propagation test
- readiness هنگام قطع دیتابیس باید fail شود
- migration روی PostgreSQL خالی اجرا شود
- seed development حداقل یک بار اجرا شود
- تمام workspaceها typecheck شوند

## معیار خروج

- `pnpm dev` یا دستور مستندشده API را اجرا می‌کند.
- PostgreSQL با compose بالا می‌آید.
- migration history داخل Git قرار دارد.
- API در `localhost:3003` اجرا می‌شود.
- Swagger بدون خطا تولید می‌شود.
- CI در repository قابل اجرا است.
- build اپ‌ها به دانلود runtime/build-time فونت خارجی وابسته نیست یا blocker آن صریح ثبت شده است.
- هیچ package یا ماژول business خالی برای آینده ساخته نشده است.

## خارج از scope

- User و authentication
- Redis
- Queue/Worker
- Object Storage
- Kubernetes
- deployment production
