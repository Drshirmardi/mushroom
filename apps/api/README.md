# API

بک‌اند پروژه سبز زندگی با NestJS، Fastify، PostgreSQL و Prisma ساخته شده است.

## اجرای محلی

پس از نصب وابستگی‌های workspace:

```bash
docker compose up -d postgres
pnpm --filter @sabz-zendegi/api prisma:migrate:deploy
pnpm --filter @sabz-zendegi/api start:dev
```

API به‌صورت پیش‌فرض روی `http://localhost:3003` گوش می‌دهد. Swagger در `/docs` و سند OpenAPI در `/docs-json` قرار دارد.

## بررسی پایه

```bash
pnpm --filter @sabz-zendegi/api typecheck
pnpm --filter @sabz-zendegi/api build
```
