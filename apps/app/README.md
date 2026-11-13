# سبز زندگی (Sabz Zendegi)

اپلیکیشن همراه بالینی طب سنتی — رزرو نوبت، پیگیری درمان، ارزیابی سلامت، چت با پزشک و فروشگاه محصولات سلامت. موبایل‌محور (shell تا ۷۲۰px)، تمام‌فارسی و راست‌به‌چپ.

## اجرا

```bash
pnpm install
pnpm --filter @sabz-zendegi/app dev      # حالت توسعه روی http://localhost:3001
pnpm --filter @sabz-zendegi/app build
pnpm --filter @sabz-zendegi/app start
```

## تکنولوژی‌ها

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4** (از طریق `@tailwindcss/postcss`) + تم shadcn در `src/app/globals.css`
- **Zustand** برای state سراسری
- **motion** (framer-motion) برای انیمیشن‌ها
- **swiper** برای اسلایدرها و **recharts** برای نمودارها

## ساختار پروژه

```
src/
├── app/                    # فقط route ها و layout ها (App Router)
│   ├── layout.tsx          # ریشه: html/body، fa + rtl، فونت Vazirmatn، metadata
│   ├── globals.css         # تم (CSS variables)، Tailwind، استایل‌های سراسری
│   ├── onboarding/         # ویزارد اولیه (تمام‌صفحه، بدون shell)
│   └── (app)/              # گروه route های اصلی داخل AppShell
│       ├── layout.tsx      # AppShell: هدر + محتوا + تب‌بار + Splash + Sheet
│       ├── template.tsx    # ترنزیشن بین صفحه‌ها
│       ├── page.tsx        # خانه
│       ├── store/…         # فروشگاه، محصول، سبد، پرداخت، سفارش‌ها
│       ├── appointments/…  # ویزیت‌ها، رزرو نوبت (۳ مرحله)، پزشک‌ها
│       ├── treatment/…     # درمان، داروها، جلسات، تمرین، پیشرفت
│       ├── assessment/…    # ارزیابی‌ها و نتیجه
│       ├── profile/…       # پروفایل، کیف پول، پرونده سلامت، تنظیمات
│       └── chat/ ،mezaj/ ،notifications/ ،articles/ ،trackers/ …
├── components/
│   ├── ui/                 # shadcn/ui (فعلاً فقط card — با CLI اضافه کنید)
│   ├── shared/             # کامپوننت‌های مشترک (PageHeader، BottomSheet، …)
│   ├── layout/             # AppShell و BottomTabBar
│   └── home/               # اسلایدرها و کامپوننت‌های صفحه خانه
├── lib/
│   ├── types.ts            # تایپ‌های سراسری
│   ├── format.ts           # toP (عدد فارسی) و formatPrice
│   ├── navigation.ts       # رجیستری صفحه‌ها + useScreenNavigation
│   └── data/               # دیتای mock هر دامنه (محصولات، پزشک‌ها، …)
└── stores/                 # استورهای Zustand (cart، tasks، meds، wishlist، ui)
```

## قوانین معماری

1. **`app/` فقط routing است** — منطق و UI داخل `components/<feature>/` یا خود page (اگر کوچک باشد).
2. **ناوبری**: به‌جای URL هاردکد، از `useScreenNavigation()` (در `lib/navigation.ts`) با نام منطقی صفحه استفاده کنید؛ نگاشت نام → route فقط در `SCREEN_ROUTES` انجام می‌شود. لینک‌های ساده می‌توانند `<Link>` باشند.
3. **State سراسری**: فقط از طریق استورهای Zustand در `stores/` — بدون prop-drilling.
4. **دیتای mock**: هر دامنه یک فایل در `lib/data/` با تایپ مربوطه در `lib/types.ts`.
5. **اعداد و قیمت**: همیشه با `toP()` / `formatPrice()` از `lib/format.ts`.
6. **کامپوننت shadcn جدید**: `npx shadcn@latest add <component>` — داخل `src/components/ui` قرار می‌گیرد.
7. **استایل**: کلاس‌های Tailwind inline + متغیرهای تم در `globals.css` (پالت DigiPay روشن با آبی برند `#1159FC`).

## نکته درباره Figma Make

این پروژه ابتدا با Figma Make تولید و سپس به Next.js مهاجرت شده است. سنک مجدد از Figma Make ساختار جدید را بازنویسی می‌کند — از این پس توسعه به‌صورت دستی در همین ریپو انجام می‌شود.
