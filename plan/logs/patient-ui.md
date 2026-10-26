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


## PUI-T02 — DONE / PUI-B02 — 2026-10-13

مالک و reviewer: Codex /root. مجوز batch یکپارچهٔ Product Details، Cart و Favorites در independent plan؛ claim مرکزی main dev قبل از source writes کنترل شد. Phase12 و checklist آن تغییر نکرد. commit مستقل پس از gate؛ بدون push/merge و بدون شروع task بعدی.

### تغییرات

- سه route موجود بازطراحی شدند؛ ProductCard و ProductPrice، QuantityControl، CartItem، StoreHeader و StoreState مشترک. API، auth، cart total، cap100 و quantity0/removal حفظ شدند. Favorites از SKU ذخیره‌شدهٔ واقعی استفاده می‌کند؛ catalog/details همچنان SKU اول. محصول فاقد SKU state امن دارد، خرید جعلی ایجاد نمی‌کند.
- رنگ‌های ConceptA، Vazirmatn موجود، grid موبایل/دسکتاپ، قیمت bdi/LTR، کد SKU ایزوله، targets44 و CTA48، disabled/busy/selected و status/alert. خطای mutation جزئیات محصول را پنهان نمی‌کند.
- علت تفاوت navbar قبلی selector اختصاصی patient-store-shell بود. قواعد presentation navbar در همان shared component به تمام Patient modules اعمال شد؛ هیچ navbar دوم ساخته نشد و سایر صفحه‌ها بازطراحی نشدند.
- scope source: سه page، globals.css، app-shell.tsx، product-card.tsx، store-ui.tsx جدید، patient-ui.test.ts. bottom-tab-bar.tsx در این task تغییر نکرد؛ کد مشترک موجود reuse شد. plan/status/log مستقل نیز هماهنگ شد.

### verification و review

- @sabz/app typecheck PASS؛ test PASS: ۱۴ فایل / ۶۵ تست، شامل۶ تست جدید قیمت، quantity limits/busy/removal، link و feedback سبد، recovery و savedSKU callbacks. git diff --check PASS. coordinator review قراردادها و کل diff PASS؛ user-owned AGENTS/.gitignore خارج staging. هیچ source اصلی main dev، backend، schema، API client، lockfile، dependency یا configuration تغییر نکرد.
- API واقعی محلی3003 و Patient dev معمول3001 از worktree UI؛ serverهای قبلی3001/3002/API متوقف و سپس همین دو runtime موجود اجرا شدند؛ بدون migration/seed. Dashboard اجرا نشد. Graphify AST update PASS؛ parsers SQL/HCL موجود نیستند و warning قبلی chat.service.ts باقی است؛ graph ignored و خارج commit.
- Playwright: سه صفحه در390×844 و1440×900 و عکس‌ها بازبینی شدند؛ ظرف720 دسکتاپ، بدون overflow صفحه در موارد بررسی‌شده، Vazirmatn computed و RTL واقعی. detail targets44 و CTA48 اندازه‌گیری شد. Enter روی کنترل افزایش مقدار۱→۲، focus outline solid #087F85؛ قیمت bdi/LTR تست شد.
- navbar خانه و Store: هر دو height72.8، target48، label12px، primary#176b9a؛ safe-area padding در محیط آزمون0. سایر module navigation destinations از component موجود بدون تغییر باقی‌اند؛ کل صفحات پزشکی audit نشده‌اند.
- API واقعی: سبد قبل و بعد qtyهای۱ و۲ برای دو محصول synthetic و جمع۳۰۰٬۰۰۰؛ افزایش۲→۳→۲، حذف تا empty و افزودن از detail تا quantities اولیه PASS. Favorites افزودن/حذف محصول اول، empty با حذف محصول synthetic موجود و سپس restore آن PASS؛ عضویت اولیه همان محصول ef5edbdf است. حذف/افزودن مجدد ممکن است شناسهٔ داخلی row را عوض کند؛ membership/quantity/total بازگردانده شد، ادعای rollback byte-for-byte دیتابیس نداریم.
- loading سبد/favorites با gate درخواست واقعی، error با abort درخواست GET و retry به API واقعی PASS؛ response جعلی جای API عادی استفاده نشد. product GET error و retry نیز PASS. تمام interceptionها برداشته شدند. console خطاهای شبکهٔ عمدی fault simulation دارد؛ خطای runtime در جریان عادی مشاهده نشد. warning reduced motion موجود است.
- Screenshot cart desktop اولیه splash داشت و نامعتبر بود؛ با تصویر نهایی پس از مخفی‌شدن overlay جایگزین شد. selector عمومی role=alert به announcer خود Next نیز می‌خورد؛ بررسی نهایی به main محدود و recovery پاس شد. این دو مسئلهٔ ابزار بررسی بودند، نقص UI اعلام نشدند.

### شواهد و محدودیت‌ها

تصاویر بیرون source: C:/Users/R3dPi/.codex/visualizations/2026/10/12/01a12f3d-98b3-7950-94c1-a2e20c5c510e/pui-t02-{detail,cart,favorites}-{mobile,desktop}.png و pui-t02-{cart,favorites}-empty-mobile.png. فقط محصولات مصنوعی محلی؛ هیچ اطلاعات بیمار، SMS، order submission یا payment initiation بررسی/ایجاد نشد.

پالت contrast قبلی معتبر reuse شد؛ keyboard/focus/targets بررسی محدودند، ادعای WCAG کامل یا axe جامع نداریم. تصویر/stock/gallery جدید اختراع نشده؛ قرارداد محصول فعلی image ندارد. Guest redirect در این batch مرورگر مستقلاً تست نشد، destination و auth logic با diff حفظ شد. Checkout فقط destination موجود؛ خرید کامل و پرداخت تأیید نشده. محیط dev است؛ production build/device matrix اجرا نشده. Figma QA ناتمام مرجع است و pixel-perfect ادعا نمی‌شود.

پیشنهاد batch بعدی: presentation checkout با قراردادها و validation موجود، بدون ثبت سفارش/پرداخت؛ eligibility/claim مستقل قبل از اجرا. این run پس از PUI-T02 متوقف می‌شود.

## انتقال checkout — 2026-10-13

به درخواست مالک، شاخهٔ front در X:/Git/mushroom از feat/patient-app-ui ایجاد و فعال شد؛ دو commit پذیرفته‌شدهٔ PUI-T01/PUI-T02 حفظ شدند. dev روی2bb6f8f بدون تغییر است؛ merge/push انجام نشد. وضعیت هماهنگی قبلی قبل از switch بیرون source backup شد و تاریخچهٔ claimهای بسته حفظ گردید. hash فایل‌های کاربر AGENTS.md و .gitignore پیش/پس از switch یکسان است. checkout قدیمی با تغییرات ذخیره‌نشده نگه داشته شده ولی محل کار فعلی نیست. STATUS و independent plan مسیر/شاخه و authority جدید را نشان می‌دهند؛ task تازه claim نشده است. فقط مستندات انتقال تغییر کردند، تست application دوباره اجرا نشد. سرویس‌ها خاموش باقی ماندند.