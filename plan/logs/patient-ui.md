# PUI-T01 — مبانی Patient UI و کاتالوگ Store

تاریخ: ۲۰۲۶-۱۰-۱۳؛ Batch: PUI-B01؛ Coordinator/reviewer: Codex /root.
Branch: feat/patient-app-ui؛ Worktree: X:/Git/mushroom-patient-ui.
Base: dev/origin/dev 2bb6f8f5a41e04621e2175298164cb7036e79fb0.
Status: DONE — implementation, targeted verification and coordinator review accepted; task-level commit follows this evidence. Commit identity is available through git log --grep='feat(PUI-T01)'.

## هماهنگی و مرز

برنامه مستقل plan/patient-ui.md با تأیید مالک ثبت شد؛ Phase12 تغییر نکرد. claim مرکزی در X:/Git/mushroom/plan/STATUS.md ثبت و pointer روشن در STATUS شاخه UI اضافه شد. claim قبل از تغییر source و تحت قفل کوتاه فایل ثبت شد؛ تمام عامل‌های محلی باید مرجع مرکزی را بخوانند. release فقط پس از commit پذیرفته‌شده انجام می‌شود. قفل اولیه جایگزین registry نیست؛ registry از طریق STATUS هر دو محیط قابل کشف است.

تغییرهای قبلی AGENTS.md و .gitignore حفظ و از commit task خارج شدند. در worktree اصلی فقط STATUS هماهنگی و خروجی‌های خودکار ابزار مرورگر تغییر کردند؛ هیچ source اصلی تغییر نکرد. نه push و نه merge انجام شد. برنامه از فاز hardening مستقل است و تأیید production یا سفر خرید کامل محسوب نمی‌شود.

## فایل‌های task

- apps/app/src/app/globals.css
- apps/app/src/app/layout.tsx
- apps/app/src/app/(public)/store/page.tsx
- apps/app/src/components/layout/app-shell.tsx
- apps/app/src/components/layout/bottom-tab-bar.tsx
- apps/app/src/components/store/product-card.tsx
- apps/app/src/components/ui/button.tsx
- apps/app/src/components/ui/input.tsx
- apps/app/src/lib/patient-ui.test.ts
- apps/app/public/fonts/Vazirmatn-Variable.woff2
- apps/app/public/fonts/OFL.txt
- apps/app/public/fonts/README.md
- plan/patient-ui.md، plan/STATUS.md، plan/logs/patient-ui.md

## نتیجه پیاده‌سازی

توکن‌های Patient با primary176B9A، hover12577E، pressed104767، focus087F85، ink173C53، canvasF6FAFC، سطح سفید و media گرمF4F0EB اضافه شدند. Semantic/component aliases، فاصله‌ها، گوشه کنترل۱۲/کارت۱۶، سایه ظریف، disabled/error و focus معرفی شدند. rollout رنگ و shell فقط /store است؛ رنگ سایر routeها جایگزین نشده است.

Vazirmatn استاندارد variable نسخه33.003 self-host، preload و font-display:swap با مجوز OFL1.1 اضافه شد؛ متغیر قبلاً تعریف‌نشده اکنون مؤثر است. این بارگذاری سراسری بر metrics متن سایر صفحات نیز اثر دارد و نیاز به matrix مستقل بعدی دارد. فایل فونت دست‌کاری نشده؛ provenance/hash در fonts/README.md.

Button سه variant primary/secondary/ghost با busy و disabled native؛ Input با نام/جهت native، focus و aria-invalid؛ ProductCard واقعی با لینک عنوان و ناحیه media، علاقه‌مندی نام‌دار/aria-pressed، قیمت bdi و callback همان firstSKU ساخته شد. Search label، دسته selected با check و aria-pressed، loading ثابت، empty/reset، error/retry و ناوبری landmark/aria-current اضافه شدند. reduced-motion دکمه‌ها و indicator ناوبری رعایت شد. main و h1 کاتالوگ هر کدام یکی است.

قرارداد API، query، state management، cap100، cart/wishlist/session و مقصدهای موجود تغییر نکردند. هیچ sorting، taxonomy جدید، guest cart یا ادعای درمانی اضافه نشده. API محصول asset تصویر ندارد؛ همان نمایش نام دسته با سطح گرم استفاده شده و عکس خیالی افزوده نشده است.

## verification

- pnpm install --offline --frozen-lockfile --ignore-scripts --filter @sabz/app...: PASS؛ cache موجود، بدون بسته جدید/تغییر lockfile.
- pnpm --filter @sabz-zendegi/api-client build: PASS؛ artifact محلی موجود، generated source و contract بدون تغییر.
- pnpm --filter @sabz/app typecheck: PASS.
- pnpm --filter @sabz/app test: PASS؛ ۱۴ فایل، ۵۹ تست، شامل ۷ تست جدید primitive/card/callback بدون API mutation.
- git diff --check: PASS.
- Graphify: query اولیه در مقصد فاقد graph بود؛ AST update محلی اجرا شد، بدون LLM. SQL/HCL parsers ناقص و هشدار استخراج موجود در chat.service.ts گزارش شد؛ این‌ها نقص تست UI نیستند و ابزار جدید نصب نشد. graphify-out ignoreشده، خارج از commit.
- Playwright روی API واقعی localhost3003: HTTP200 و ۶ محصول آزمایشی؛ تمام عنوان‌ها و لینک IDها با پاسخ API تطبیق دارند.
- موبایل390×844: RTL و فونت واقعی، ۶ کارت، قیمت ایزوله، overflow افقی صفحه ندارد. icon targets44×44، action48؛ دسته‌ها حداقل44. اسکرول افقی دسته عمدی است.
- دسکتاپ1440×900: ظرف720 و بدون overflow صفحه.
- جست‌وجوی «محصول نمونه»: یک نتیجه؛ query بی‌نتیجه: empty؛ reset به۶ نتیجه.
- دسته محصولات نمونه: یک نتیجه و aria-pressed=true؛ همه به۶ محصول بازگشت.
- navigation عنوان و media با keyboard Enter به route واقعی product detail: PASS؛ محصول بازطراحی نشده است.
- loading با تأخیر درخواست واقعی، error با abort فقط درخواست عمومی، retry و بازگشت به API واقعی: PASS؛ داده جعلی جای API برنامه قرار نگرفت.
- Tab از Search به دسته و focus-visible قابل مشاهده: PASS؛ reduced motion transition0s: PASS.
- کنتراست اندازه‌گیری‌شده از computed styles: primary5.82، secondary5.08، muted5.77، ink/canvas11.06؛ حدود بنیاد focus و control به ترتیب4.56 و3.16 از پالت تأییدشده. این تأیید کلی WCAG نیست.
- console خطای درخواست عمداً abortشده در آزمون recovery داشت؛ warning مربوط به فعال‌بودن reduced motion بود. preview تازه فقط favicon.ico404 دارد، نقص asset قبلی خارج از scope.
- coordinator combined-diff review: PASS؛ paths محدود، API/auth/business callbacks حفظ‌شده، source backend و Dashboard/Assessment/Profile تغییر نکرده، داده و schema دست‌کاری نشده.

## محیط اجرا و شواهد تصویری

API و frontend قبلی ابتدا خاموش بودند. پس از تأیید مالک، API از dist موجود و frontend اصلی اجرا شدند؛ بدون migration/seed، SMS، سفارش یا پرداخت. تست mutation واقعی cart/wishlist اجرا نشد؛ callback forwarding، busy/disabled با تست synthetic و business functions با diff بررسی شدند.

پورت3011 با CORS موجود ناسازگار بود. verification موقت روی3001 انجام و frontend اصلی سپس به3001 برگردانده شد. preview مستقل نهایی http://localhost:3002/store با همان API3003، HTTP200، شش محصول و فونت بارگذاری‌شده تأیید شد؛ پورت3002 پیش از استفاده آزاد و در CORS مجاز بود. Dashboard اجرا/تغییر نشده، ولی استفاده آینده از پورت معمول Dashboard نیاز به تعیین پورت یا approval CORS برای3011 دارد. هیچ config تغییر نکرد.

تصاویر بیرون سورس در C:/Users/R3dPi/.codex/visualizations/2026/10/12/01a12f3d-98b3-7950-94c1-a2e20c5c510e/:
- pui-before-mobile.png، pui-before-desktop.png
- pui-after-mobile.png، pui-after-desktop.png
- pui-empty-mobile.png، pui-mobile-api-unavailable.png

capture اولیه after-mobile زیر splash نامعتبر بود؛ پس از مخفی‌شدن overlay دوباره ثبت و تصویر جایگزین شد. تصاویر نهایی catalog پس از font-ready و حذف splash‌اند. داده مصنوعی همان۶ محصول واقعی محلی است؛ هیچ screenshot داده بیمار گرفته نشد. Figma فقط گزارش/تصویر مرجع بود و MCP رسمی یا ساخت تازه Figma استفاده نشد.

## محدودیت و گام بعد

این batch فقط foundations و کاتالوگ است. عدم رگرسیون خواندن کاتالوگ، filter و navigation بررسی شد؛ mutation واقعی سبد/علاقه‌مندی، ورود مهمان، checkout، پرداخت و کل سفر خرید تأیید نشده‌اند. Screenreader/device matrix و axe جامع اجرا نشده‌اند. Splash قدیمی خارج scope هنوز motion خودش را دارد؛ reduced motion کل اپ ادعا نمی‌شود. typography عمومی و viewportهای دیگر review مستقل لازم دارند. سازگاری pixel-perfect با Figma ادعا نشده؛ QA پیشین Figma متوقف بوده است.

Next proposed scope: Product detail و Cart، ابتدا criteria/fixture و dependencies در همین برنامه تعریف و سپس پس از review مالک claim شوند. هیچ task دوم در این run شروع نمی‌شود. commit فقط PUI-T01؛ release claim مرکزی پس از commit؛ dev sync فقط merge عادی پس از بررسی و تست، بدون push/merge خودکار.
