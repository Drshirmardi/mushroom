# راهبرد تحویل محصول

## فرض‌های مصوب نسخه فعلی

- محصول دو سطح دارد: اپ بیمار و داشبورد مدیریتی.
- داشبورد در نسخهٔ اول توسط یک `ADMIN` اصلی کنترل می‌شود.
- UI مدیریت role، دعوت کارکنان و permission builder فعلاً ساخته نمی‌شود.
- endpointهای داشبورد از ابتدا permission عملیاتی ثابت دارند، ولی همهٔ آن‌ها فعلاً به `ADMIN` نگاشت می‌شوند.
- یک کلینیک فعال داریم؛ مدل‌های دامنه `clinicId` دارند، اما tenant switch و multi-clinic UI ساخته نمی‌شود.
- قابلیت‌های AI/Bot و automation پیشرفته در مسیر فعلی اجرا نمی‌شوند.

## واحد تحویل

هر feature slice باید این زنجیره را کامل کند:

```text
Product contract
  → schema/migration
  → domain/application rules
  → patient/admin API
  → OpenAPI client
  → apps/app integration
  → apps/dashboard integration
  → browser E2E and evidence
  → removal of mocks in the same scope
```

اگر یکی از app، dashboard یا API لازم است ولی متصل نشده، slice کامل نیست.

## مسیر اصلی بیمار

```text
Register/Login
  → Medical onboarding
  → Consent
  → Main assessment when required
  → Booking eligibility
  → Doctor/service/availability
  → Appointment
  → Check-in/encounter
  → Prescription/treatment
  → Follow-up
```

اپ برای بیمار ناقص کاملاً قفل نمی‌شود. پروفایل، onboarding، آزمون، امنیت و توضیح مرحله بعد قابل
دسترسی‌اند؛ create/reschedule appointment فقط با eligibility معتبر مجاز است.

## قرارداد آزمون اصلی

- تکمیل پرونده پزشکی پیش‌نیاز رزرو است.
- آزمون اصلی توسط داشبورد ساخته، version، publish و archive می‌شود.
- الزام آزمون یک policy مستقل است و از داشبورد روشن/خاموش می‌شود.
- فقط نسخهٔ منتشرشده می‌تواند main assessment باشد.
- شرط رزرو submit نسخهٔ معتبر است، نه قبولی بر اساس score.
- scoring قطعی و versioned است و AI در آن نقشی ندارد.
- خاموش‌کردن الزام، submission/result قبلی را حذف نمی‌کند.
- انتشار نسخه جدید به‌طور پیش‌فرض بیمار تکمیل‌کننده نسخه قبلی را block نمی‌کند.
- booking use case policy را server-side دوباره enforce می‌کند؛ route gate اپ فقط UX است.

تصمیم کامل در [`ADR-0002`](decisions/ADR-0002-feature-first-roadmap.md) ثبت شده است.

## Dashboard Home تدریجی

صفحه اصلی داشبورد از ابتدا حفظ می‌شود، اما هر widget فقط وقتی نمایش داده می‌شود که منبع دادهٔ واقعی دارد.
عدد mock یا صفر ساختگی جایگزین دادهٔ غایب نمی‌شود.

### داده‌های مراحل اولیه

- بیمار جدید و پرونده ناقص/کامل
- آزمون اصلی تکمیل‌شده/در انتظار
- نوبت‌های امروز، حضوری و آنلاین
- درخواست‌های در انتظار
- برنامه امروز
- check-in، در صف، در حال ویزیت و میانگین انتظار
- فعالیت اخیر پرونده، آزمون و نوبت

### داده‌های مراحل بعد

- بیماری و مزاج شایع پس از diagnosis/assessment معتبر
- تکمیل درمان پس از TreatmentPlan و adherence
- سفارش و میانگین سفارش پس از commerce
- درآمد پس از payment/refund واقعی
- نرخ بازگشت پس از تعریف cohort و encounter history

### مالک widgetهای فعلی صفحه اصلی

- آمار بیمار جدید و وضعیت onboarding → Phase 02
- وضعیت آزمون و مزاج معتبر → Phase 03 و تکمیل نمایش در Phase 08
- برنامه پزشک و آمادگی schedule → Phase 04
- نوبت امروز، حضوری/آنلاین، درخواست جدید، صف و برنامه روز → Phase 05
- encounter تکمیل‌شده، بیماری شایع و نرخ بازگشت → Phase 06/11
- میانگین درمان و تکمیل برنامه → Phase 07/11
- سفارش جدید، میانگین سفارش، درآمد امروز/ماه، نمودار و سهم درآمد → Phase 09/11
- فید فعالیت → به‌صورت افزایشی از event/history واقعی Phase 02 تا 09

هدف Phase 05 تکمیل Home V1 عملیاتی است، نه ساخت زودهنگام KPIهایی که هنوز source of truth ندارند.

## سیاست تعویق

موارد زیر نباید وارد taskهای هسته شوند مگر با تصمیم جدید مالک محصول:

- AI scoring، chatbot، bot builder، knowledge base و bot campaign
- dynamic role builder و staff invitation lifecycle
- multi-clinic switching و tenant administration
- advanced CRM/segmentation/automation
- Kubernetes، NATS، microservice extraction و CQRS کامل
- wallet، video provider و analytics datastore بدون requirement یا bottleneck اثبات‌شده

Redis/worker، Object Storage و realtime فقط هنگام اولین مصرف‌کنندهٔ واقعی اضافه می‌شوند.

## قرارداد کار موازی با subagent

- schema/migration و OpenAPI در هر task یک owner واحد دارند.
- ابتدا contract freeze می‌شود.
- سپس app و dashboard می‌توانند روی فایل‌های غیرمشترک موازی شوند.
- agent تست/review می‌تواند مستقل verification و authorization matrix را اجرا کند.
- هیچ دو agent هم‌زمان Prisma schema، migration یا generated API client را ویرایش نمی‌کنند.

## Definition of Done هر فاز

- product rule و acceptance criteria بدون ابهام‌اند.
- migration خالی و upgrade از خروجی Phase قبلی پاس می‌شود.
- API بیمار و dashboard authorization و audit لازم را دارند.
- OpenAPI/client stale نیست.
- loading/error/empty/forbidden state واقعی در هر دو frontend وجود دارد.
- mock همان scope حذف شده است.
- unit، PostgreSQL integration، API/e2e و browser E2E متناسب پاس شده‌اند.
- Dashboard Home فقط widgetهای دارای منبع داده واقعی را نمایش می‌دهد.
- evidence در log فاز ثبت شده است.
