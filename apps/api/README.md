# API — بک‌اند NestJS (آینده)

این پوشه placeholder برای بک‌اند اصلی پروژه **سبز زندگی** است که با **NestJS** ساخته خواهد شد.

## دامنه هدف

- **Production:** `api.sabz.local` (در نهایت روی دامنه واقعی: `api.example.com`)
- **لوکال (فعلی):** `localhost:3003`

## معماری برنامه‌ریزی‌شده

- ماژولار مونولیت مبتنی بر دامنه (Bounded Contexts)
- هر ماژول شامل لایه‌های `domain/`, `application/`, `infrastructure/`, `presentation/`
- دیتابیس اصلی: PostgreSQL
- احراز هویت: JWT + Refresh Token Rotation
- REST API با نسخه‌بندی (`/v1/`)

## ساختار آینده

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   └── ...
│   ├── app.module.ts
│   ├── main.ts
│   └── config/
├── Dockerfile
└── package.json
```

## وضعیت

⛔ هنوز پیاده‌سازی نشده — هنگام شروع توسعه بک‌اند، با `nest new` یا ساخت دستی scaffold کنید.
