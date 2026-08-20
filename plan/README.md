# نقشه اجرایی بک‌اند سبز زندگی

این پوشه مرجع اصلی برنامه‌ریزی و پیگیری توسعه بک‌اند پروژه است. هدف آن این است که هر توسعه‌دهنده یا Agent، بدون اتکا به حافظه گفتگوها، بتواند وضعیت پروژه، تصمیم‌های معماری، مرحله فعال، کار بعدی و معیار پایان هر فاز را بفهمد.

## ترتیب مطالعه برای Agentها

هر Agent قبل از ایجاد تغییر باید این فایل‌ها را به‌ترتیب بخواند:

1. [`STATUS.md`](STATUS.md) — وضعیت زنده، فاز فعال، task جاری و handoff کوتاه.
2. [`00-CURRENT-STATE.md`](00-CURRENT-STATE.md) — وضعیت واقعی repository در شروع برنامه.
3. [`01-ARCHITECTURE-REVIEW.md`](01-ARCHITECTURE-REVIEW.md) — تصمیم‌هایی که پذیرفته، رد یا به آینده موکول شده‌اند.
4. [`02-TARGET-ARCHITECTURE.md`](02-TARGET-ARCHITECTURE.md) — معماری هدف و مرز ماژول‌ها.
5. [`03-FEATURE-MAP.md`](03-FEATURE-MAP.md) — نگاشت فیچرهای فعلی فرانت به فازهای بک‌اند.
6. [`04-ENGINEERING-STANDARDS.md`](04-ENGINEERING-STANDARDS.md) — استانداردهای اجباری داده، API، امنیت و تست.
7. [`05-AGENT-WORKFLOW.md`](05-AGENT-WORKFLOW.md) — نحوه claim، اجرا، تست، تیک‌زدن و handoff.
8. فایل فاز فعال در پوشه [`phases`](phases/).

لاگ‌های تاریخیِ taskها در [`logs/`](logs/README.md) نگه‌داری می‌شوند. Agent نباید همهٔ
لاگ‌ها را در شروع بخواند؛ فقط هنگام ادامه‌دادن یک handoff، بررسی تصمیم/محدودیت مرتبط، یا
وقتی `STATUS.md` به entry مشخصی ارجاع می‌دهد، همان فایل لاگ فاز فعال را بخواند.

تصمیم معماری جدید باید با قالب [`ADR-TEMPLATE.md`](decisions/ADR-TEMPLATE.md) در پوشه `decisions` ثبت شود.

## ترتیب فازها

- [`Phase 00 — Foundation`](phases/00-FOUNDATION.md)
- [`Phase 01 — Identity & Access`](phases/01-IDENTITY-ACCESS.md)
- [`Phase 02 — Clinic, Doctors & Patients`](phases/02-CLINIC-DOCTORS-PATIENTS.md)
- [`Phase 03 — Scheduling & Appointments`](phases/03-SCHEDULING-APPOINTMENTS.md)
- [`Phase 04 — Clinical Records & Treatment`](phases/04-CLINICAL-RECORDS-TREATMENT.md)
- [`Phase 05 — Assessments & Health Tracking`](phases/05-ASSESSMENTS-HEALTH-TRACKING.md)
- [`Phase 06 — Notifications, Content & Jobs`](phases/06-NOTIFICATIONS-CONTENT-JOBS.md)
- [`Phase 07 — Commerce & Payments`](phases/07-COMMERCE-PAYMENTS.md)
- [`Phase 08 — Chat & Online Consultation`](phases/08-CHAT-CONSULTATION.md)
- [`Phase 09 — Reporting, CRM & Automation`](phases/09-REPORTING-CRM-AUTOMATION.md)
- [`Phase 10 — AI & Bots`](phases/10-AI-BOTS.md)
- [`Phase 11 — Scale & Production Hardening`](phases/11-SCALE-HARDENING.md)

## Milestoneها

### Milestone A — اولین نسخه عملیاتی کلینیک

فازهای ۰۰ تا ۰۳. خروجی: ثبت‌نام واقعی، پزشک و بیمار واقعی، رزرو نوبت و مدیریت همان نوبت در داشبورد.

### Milestone B — هسته بالینی

فازهای ۰۴ تا ۰۶. خروجی: ویزیت، پرونده پزشکی، نسخه، درمان، ارزیابی، پایش سلامت، اعلان و محتوای واقعی.

### Milestone C — درآمد و ارتباط

فازهای ۰۷ و ۰۸. خروجی: فروشگاه، موجودی، سفارش، پرداخت، چت و مشاوره آنلاین.

### Milestone D — رشد و هوشمندسازی

فازهای ۰۹ تا ۱۱. خروجی: گزارش، CRM، اتوماسیون، قابلیت‌های AI و سخت‌سازی برای مقیاس و production.

## قانون اصلی تحویل

هر فاز باید یک vertical slice کامل تحویل دهد:

```text
Migration → Domain Rules → Application Use Case → API → Tests → API Client → Frontend Integration → Observability
```

ساخت صرفاً چند جدول، DTO یا endpoint به معنی تکمیل task یا فاز نیست.

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
