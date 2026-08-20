# API

بک‌اند پروژه سبز زندگی با NestJS و Fastify ساخته می‌شود. این scaffold فقط bootstrap
اپلیکیشن را فراهم می‌کند؛ config، دیتابیس، routeها، استانداردهای خطا و ماژول‌های business
در taskهای بعدی Phase 00 اضافه می‌شوند.

## اجرای محلی

پس از نصب وابستگی‌های workspace:

```bash
pnpm --filter @sabz-zendegi/api start:dev
```

API به‌صورت پیش‌فرض روی `http://localhost:3003` گوش می‌دهد. متغیر `PORT` موقتاً برای
تغییر پورت پشتیبانی می‌شود؛ validation متغیرهای محیطی در `F00-T03` اضافه خواهد شد.

## بررسی پایه

```bash
pnpm --filter @sabz-zendegi/api typecheck
pnpm --filter @sabz-zendegi/api build
```
