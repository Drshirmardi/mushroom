# نقشه اجرایی محصول سبز زندگی

این پوشه مرجع اصلی برنامه‌ریزی و پیگیری توسعهٔ محصول است. از Phase 02 به بعد، واحد تحویل یک
قابلیت کامل میان `apps/app`، `apps/dashboard` و `apps/api` است؛ فاز backend-only یا frontend-only
کامل محسوب نمی‌شود.

## ترتیب مطالعه برای Agentها

هر Agent قبل از ایجاد تغییر باید این فایل‌ها را به‌ترتیب بخواند:

1. [`STATUS.md`](STATUS.md) — وضعیت زنده، فاز فعال، task جاری و handoff کوتاه.
2. [`00-CURRENT-STATE.md`](00-CURRENT-STATE.md) — وضعیت واقعی repository در شروع برنامه.
3. [`01-ARCHITECTURE-REVIEW.md`](01-ARCHITECTURE-REVIEW.md) — تصمیم‌هایی که پذیرفته، رد یا به آینده موکول شده‌اند.
4. [`02-TARGET-ARCHITECTURE.md`](02-TARGET-ARCHITECTURE.md) — معماری هدف و مرز ماژول‌ها.
5. [`03-FEATURE-MAP.md`](03-FEATURE-MAP.md) — نگاشت فیچرهای فعلی فرانت به فازهای بک‌اند.
6. [`06-PRODUCT-DELIVERY-STRATEGY.md`](06-PRODUCT-DELIVERY-STRATEGY.md) — قرارداد محصول، ترتیب قابلیت‌ها و سیاست تعویق.
7. [`04-ENGINEERING-STANDARDS.md`](04-ENGINEERING-STANDARDS.md) — استانداردهای اجباری داده، API، امنیت و تست.
8. [`05-AGENT-WORKFLOW.md`](05-AGENT-WORKFLOW.md) — نحوه claim، اجرا، تست، تیک‌زدن و handoff.
9. فایل فاز فعال در پوشه [`phases`](phases/).

لاگ‌های تاریخیِ taskها در [`logs/`](logs/README.md) نگه‌داری می‌شوند. Agent نباید همهٔ
لاگ‌ها را در شروع بخواند؛ فقط هنگام ادامه‌دادن یک handoff، بررسی تصمیم/محدودیت مرتبط، یا
وقتی `STATUS.md` به entry مشخصی ارجاع می‌دهد، همان فایل لاگ فاز فعال را بخواند.

تصمیم معماری جدید باید با قالب [`ADR-TEMPLATE.md`](decisions/ADR-TEMPLATE.md) در پوشه `decisions` ثبت شود.

## ترتیب فازها

- [`Phase 00 — Foundation`](phases/00-FOUNDATION.md)
- [`Phase 01 — Identity & Access`](phases/01-IDENTITY-ACCESS.md)
- [`Phase 02 — Patient Onboarding & Consent`](phases/02-PATIENT-ONBOARDING.md)
- [`Phase 03 — Assessment Engine & Booking Eligibility`](phases/03-ASSESSMENT-ELIGIBILITY.md)
- [`Phase 04 — Clinic, Doctors, Services & Availability`](phases/04-CLINIC-DIRECTORY-AVAILABILITY.md)
- [`Phase 05 — Appointment Booking & Dashboard Operations`](phases/05-APPOINTMENT-OPERATIONS.md)
- [`Phase 06 — Encounter & Clinical Workspace`](phases/06-ENCOUNTER-CLINICAL-WORKSPACE.md)
- [`Phase 07 — Prescription & Treatment`](phases/07-PRESCRIPTION-TREATMENT.md)
- [`Phase 08 — Follow-up, Health Tracking, Notifications & Content`](phases/08-FOLLOWUP-CONTENT.md)
- [`Phase 09 — Commerce, Inventory & Payments`](phases/09-COMMERCE-PAYMENTS.md)
- [`Phase 10 — Chat & Online Consultation`](phases/10-CHAT-CONSULTATION.md)
- [`Phase 11 — Dashboard Reporting & Access Expansion`](phases/11-REPORTING-ACCESS.md)
- [`Phase 12 — Production Hardening`](phases/12-PRODUCTION-HARDENING.md)

قابلیت‌های AI/Bot و automation پیشرفته در [`deferred/AI-BOTS-AUTOMATION.md`](deferred/AI-BOTS-AUTOMATION.md)
نگه‌داری می‌شوند و جزو مسیر اجرای فعلی نیستند.

## Milestoneها

### Milestone A — بیمار آمادهٔ رزرو

فازهای ۰۰ تا ۰۳. خروجی: ثبت‌نام، پرونده پزشکی اولیه، رضایت، آزمون اصلی versioned و eligibility قابل تنظیم.

### Milestone B — کلینیک قابل رزرو

فازهای ۰۴ و ۰۵. خروجی: پزشک، خدمت، تعرفه، ساعات کاری، رزرو، تقویم، صف و Dashboard Home عملیاتی.

### Milestone C — هسته درمان

فازهای ۰۶ تا ۰۸. خروجی: ویزیت، پرونده بالینی، نسخه، درمان، پیگیری، اعلان و محتوا.

### Milestone D — تجارت و ارتباط

فازهای ۰۹ و ۱۰. خروجی: فروشگاه، انبار، سفارش، پرداخت و مشاوره آنلاین.

### Milestone E — عملیات و انتشار

فازهای ۱۱ و ۱۲. خروجی: گزارش واقعی، گسترش کنترل دسترسی و production readiness.

## قانون اصلی تحویل

هر فاز باید یک vertical slice کامل تحویل دهد:

```text
Product Rule → Migration → Domain Rules → API → OpenAPI Client → App → Dashboard → Tests → Observability
```

ساخت صرفاً چند جدول، DTO، endpoint یا صفحه به معنی تکمیل task یا فاز نیست. mock همان scope فقط
پس از اتصال هر سه سطح و پاس‌شدن browser E2E حذف می‌شود.

## قرارداد وضعیت‌ها

- `NOT_STARTED`: هنوز هیچ task اجرایی شروع نشده است.
- `IN_PROGRESS`: حداقل یک task توسط Agent مشخص claim شده است.
- `BLOCKED`: مانع مستند و قابل اقدام وجود دارد.
- `READY_FOR_REVIEW`: پیاده‌سازی تمام شده ولی review یا verification نهایی باقی است.
- `DONE`: تمام معیارهای خروج با شواهد ثبت‌شده پاس شده‌اند.

## منبع حقیقت

- وضعیت اجرای پروژه و handoff: [`STATUS.md`](STATUS.md)
- تصمیم معماری: [`02-TARGET-ARCHITECTURE.md`](02-TARGET-ARCHITECTURE.md)
- وظایف و معیار خروج: فایل همان فاز
- شواهد تکمیل taskها: [`logs/`](logs/README.md)
- وضعیت واقعی کد: repository و تست‌ها

اگر مستند با کد تناقض داشت، Agent نباید حدس بزند. تناقض زنده را در `STATUS.md` و نتیجهٔ
حل‌شده را در لاگ همان فاز ثبت کند، سپس کد و مستند را همراه همان تغییر اصلاح کند.
