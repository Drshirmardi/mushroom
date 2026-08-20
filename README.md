# سبز زندگی — Monorepo

مونوریپوی پروژه **سبز زندگی** (کلینیک طب سنتی دکتر شیرمردی) با **pnpm workspaces + Turborepo**.

## ساختار

```
mushroom/
├── apps/
│   ├── web/          # وب‌سایت اصلی (لندینگ + ورود/ثبت‌نام) → sabz.local:3000
│   ├── app/          # اپلیکیشن کاربر (نوبت‌دهی، درمان، فروشگاه) → app.sabz.local:3001
│   ├── dashboard/    # داشبورد مدیریتی → dashboard.sabz.local:3002
│   └── api/          # بک‌اند NestJS/Fastify + PostgreSQL → api.sabz.local:3003
├── packages/         # کتابخانه‌های اشتراکی (آینده — فعلاً خالی)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── package.json
```

## دامنه‌ها

| اپ | دامنه نهایی (پروडاکشن) | لوکال |
|---|---|---|
| web | `sabz.example.com` | `localhost:3000` |
| app | `app.sabz.example.com` | `localhost:3001` |
| dashboard | `dashboard.sabz.example.com` | `localhost:3002` |
| api | `api.sabz.example.com` | `localhost:3003` |

## پیش‌نیازها

- Node.js 24+
- pnpm 10+ (`corepack enable` یا `npm i -g pnpm`)

## دستورات

```bash
# نصب وابستگی‌ها (همه workspaceها)
pnpm install

# اجرای همه اپ‌ها همزمان (توربو)
pnpm dev

# اجرای یک اپ خاص
pnpm --filter @sabz/web dev
pnpm --filter @sabz/app dev
pnpm --filter @sabz/dashboard dev

# بیلد همه
pnpm build

# بیلد یک اپ خاص
pnpm --filter @sabz/web build

# پاکسازی کش‌ها
pnpm clean
```

## اصول معماری

1. **استقلال اپ‌ها:** هر اپ کاملاً مستقل build و deploy می‌شود؛ تغییر یا بیلد یک اپ روی بقیه اثر نمی‌گذارد (هیچ dependency مستقیمی بین اپ‌ها وجود ندارد).
2. **کد اشتراکی فقط از طریق `packages/`:** هر چیزی که بین دو اپ تکرار شد، به‌صورت پکیج با نام `@sabz/*` در `packages/` منتقل می‌شود — نه با import نسبی بین اپ‌ها.
3. **فرانت‌یندها Next.js 16 (App Router) + TypeScript + Tailwind v4** هستند.
4. **بک‌اند (آینده) NestJS** با معماری ماژولار مبتنی بر دامنه در `apps/api` قرار می‌گیرد و فقط از طریق HTTP/REST با فرانت‌اندها صحبت می‌کند.

## تکنولوژی‌ها

| لایه | ابزار |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| فرانت‌اند | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| بک‌اند (آینده) | NestJS, PostgreSQL |
| UI | کامپوننت‌های سفارشی + shadcn/ui (در web) |
