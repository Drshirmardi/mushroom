# پنل مدیریت کلینیک طب سنتی دکتر شیرمردی

داشبورد مدیریت کلینیک (فارسی/RTL) ساخته‌شده با **Next.js (App Router) + TypeScript + Tailwind CSS v4 + Recharts**.

> این پروژه اکنون یک اپ مستقل در monorepo است.

## اجرا

```bash
pnpm install
pnpm --filter @sabz-zendegi/dashboard dev      # حالت توسعه روی http://localhost:3002
pnpm --filter @sabz-zendegi/dashboard build
pnpm --filter @sabz-zendegi/dashboard start
pnpm --filter @sabz-zendegi/dashboard typecheck
```

## ساختار

```
src/
├── app/                  # مسیرهای App Router (صفحات نازک + metadata)
│   ├── layout.tsx        # html lang="fa" dir="rtl" + فونت Vazirmatn (next/font)
│   ├── page.tsx          # ریدایرکت به /dashboard
│   └── (app)/            # پوسته‌ی مشترک (سایدبار + هدر) برای همه‌ی صفحات
│       └── patients/[id] # فضای کاری بیمار با URL اختصاصی
├── components/
│   ├── layout/           # AppShell, Sidebar, Header, NotifPanel
│   └── shared/           # StatusBadge, TypeBadge, Avatar, KpiCard, SectionCard
├── features/             # هر صفحه یک پوشه (کامپوننت‌های "use client")
├── data/                 # داده‌های mock تایپ‌دار (قابل تعویض با API در آینده)
└── lib/                  # utils (اعداد فارسی/تومان)، nav، page-meta
```

## نقشه‌ی مسیرها

`/dashboard` · `/appointments` · `/calendar` · `/queue` · `/patients` · `/patients/[id]` ·
`/prescriptions` · `/assessments` · `/health-tracking` · `/store` · `/store-builder` · `/store-crm` ·
`/store-marketing` · `/orders` · `/discounts` · `/revenue` · `/messages` · `/notifications` ·
`/automation` · `/content` · `/settings` · `/bot-center` · `/bot-flows` · `/bot-assessment` ·
`/bot-knowledge` · `/bot-conversations` · `/bot-campaigns` · `/bot-analytics`

## نکات فنی

- صفحات `page.tsx` سرور کامپوننت‌اند و فقط metadata تعریف می‌کنند و کامپوننت client را رندر می‌کنند؛ برای اتصال به بک‌اند monorepo کافی است فچ دیتا در همین فایل‌ها اضافه شود.
- همه‌ی داده‌ها فعلاً mock هستند و از `src/data` می‌آیند.
- تم (پالت سبز کلینیک) و متغیرهای CSS در `src/app/globals.css` تعریف شده‌اند (شادوک دارک هم آماده است).
