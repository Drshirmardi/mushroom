# وضعیت فعلی پروژه در شروع برنامه

تاریخ snapshot: `2026-08-20`

## تعریف محصول

«سبز زندگی» یک پلتفرم کلینیک طب سنتی است که سه رابط اصلی دارد:

- سایت عمومی و احراز هویت در `apps/web`
- اپلیکیشن موبایل‌محور بیمار در `apps/app`
- پنل مدیریتی کلینیک در `apps/dashboard`

محصول در فرانت به قابلیت‌های نوبت‌دهی، درمان، پرونده سلامت، ارزیابی، چت، فروشگاه، پرداخت، محتوا، اعلان، اتوماسیون و bot اشاره می‌کند.

## وضعیت repository

### Monorepo

- pnpm workspaces فعال است.
- Turborepo برای `dev`، `build`، `lint`، `typecheck` و `clean` تعریف شده است.
- سه اپ Next.js در workspace وجود دارند.
- `apps/api` فقط README و placeholder است.
- `packages` فقط README دارد و package اجرایی مشترکی ایجاد نشده است.

### apps/web

- Landing page، login و signup پیاده‌سازی شده‌اند.
- auth فعلی فقط از `Map` داخل حافظه مرورگر استفاده می‌کند.
- با refresh صفحه کاربران ثبت‌شده از بین می‌روند.
- هیچ session، token، API یا دیتابیس واقعی وجود ندارد.
- build production در بررسی اولیه موفق بوده است.

### apps/app

- حدود ۴۳ route برای اپ بیمار وجود دارد.
- حوزه‌ها شامل appointment، doctor، treatment، assessment، profile، store، chat، articles، notification، mezaj و tracker هستند.
- داده‌ها از `src/lib/data` و state از Zustand می‌آید.
- cart، medications، tasks و wishlist فقط client-side هستند.
- هیچ fetch واقعی به API وجود ندارد.
- TypeScript typecheck در بررسی اولیه پاس شده است.
- build در محیط بررسی به‌دلیل نیاز `next/font/google` به شبکه متوقف شد؛ خطای کد گزارش نشد.

### apps/dashboard

- حدود ۲۹ route مدیریتی وجود دارد.
- حوزه‌ها شامل appointment، calendar، queue، patient، prescription، assessment، health tracking، store، order، revenue، messages، notification، content، automation و bot هستند.
- تمام داده‌ها از `src/data` و mock هستند.
- TypeScript typecheck در بررسی اولیه پاس شده است.
- build در محیط بررسی به‌دلیل دانلود فونت Google متوقف شد.

## مشکلات مستندات فعلی

- README اپ بیمار و داشبورد پورت `3000` را ذکر می‌کنند، ولی packageها به‌ترتیب `3001` و `3002` هستند.
- README داشبورد هنوز درباره انتقال آینده به monorepo صحبت می‌کند، در حالی که انتقال انجام شده است.
- `apps/web` README مستقل ندارد.
- دستورهای app-level از npm استفاده می‌کنند، ولی package manager رسمی repository، pnpm است.
- فونت‌ها باید local/self-host شوند تا build به شبکه خارجی وابسته نباشد.

## وضعیت کیفیت

- test suite واقعی مشاهده نشده است.
- CI pipeline مشاهده نشده است.
- migration، seed، database schema و environment template وجود ندارد.
- Dockerfile یا compose اجرایی وجود ندارد.
- API contract یا OpenAPI وجود ندارد.
- observability، health check و error tracking وجود ندارد.

## نتیجه ارزیابی

پروژه از نظر breadth رابط کاربری جلو است، اما از نظر backend هنوز در مرحله صفر است. بنابراین درصد تکمیل UI نباید با درصد تکمیل محصول production اشتباه گرفته شود.

اولین تعریف موفقیت باید این جریان واقعی باشد:

```text
ثبت‌نام بیمار
  → ورود امن
  → مشاهده پزشک و خدمت
  → مشاهده availability
  → رزرو نوبت بدون double booking
  → مشاهده همان نوبت در dashboard
  → مدیریت وضعیت نوبت
```

تا زمانی که این جریان end-to-end تکمیل نشده، شروع هم‌زمان فروشگاه، چت، AI یا زیرساخت پیچیده باعث پراکندگی توسعه خواهد شد.
