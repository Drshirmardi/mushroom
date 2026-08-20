# نگاشت فیچرهای فرانت به فازهای بک‌اند

این سند تضمین می‌کند هیچ صفحه فعلی فرانت در برنامه بک‌اند گم نشود. وجود route به معنی آماده‌بودن feature نیست؛ هر route باید در فاز مربوطه از mock به API واقعی منتقل شود.

## Phase 01 — Identity & Access

### apps/web

- `/login`
- `/signup`

### سراسری

- session bootstrap برای app و dashboard
- route protection
- logout و logout-all
- صفحه security و session management در app

## Phase 02 — Clinic, Doctors & Patients

### apps/app

- `/doctors/[id]`
- `/profile`
- `/profile/edit`
- بخش پایه `/profile/medical`

### apps/dashboard

- `/patients`
- `/patients/[id]` برای summary پایه
- doctor/service management که UI آن در ادامه تکمیل می‌شود

## Phase 03 — Scheduling & Appointments

### apps/app

- `/appointments`
- `/appointments/[id]`
- `/appointments/book`
- `/appointments/book/schedule`
- `/appointments/book/confirm`
- `/appointments/book/success`
- `/appointments/waiting-room` فقط بخش status نوبت
- `/appointments/summary` فقط summary نوبت

### apps/dashboard

- `/appointments`
- `/calendar`
- `/queue`
- KPIهای نوبت در `/dashboard`

## Phase 04 — Clinical Records & Treatment

### apps/app

- `/treatment`
- `/treatment/meds/[id]`
- `/treatment/sessions`
- `/treatment/exercises`
- `/treatment/progress`
- `/profile/medical`
- `/profile/history`
- `/profile/health-record`
- محتوای بالینی `/appointments/summary`

### apps/dashboard

- `/prescriptions`
- بخش clinical در `/patients/[id]`
- medical timeline
- traditional medicine tab
- treatment plan views

## Phase 05 — Assessments & Health Tracking

### apps/app

- `/assessment`
- `/assessment/[type]`
- `/assessment/result`
- `/mezaj`
- `/trackers/pain`
- `/trackers/mood`

### apps/dashboard

- `/assessments`
- `/health-tracking`
- health charts در patient workspace
- `/bot-assessment` فقط بخش rule-based پس از تکمیل engine پایه

## Phase 06 — Notifications, Content & Jobs

### apps/app

- `/notifications`
- `/profile/notifications`
- `/articles`
- `/articles/[title]`
- medication و appointment reminders

### apps/dashboard

- `/notifications`
- `/content`
- بخش اولیه `/automation`

## Phase 07 — Commerce & Payments

### apps/app

- `/store`
- `/store/products/[id]`
- `/store/cart`
- `/store/checkout`
- `/store/payment`
- `/store/order-success`
- `/store/order-tracking`
- `/store/orders`
- `/store/wishlist`
- `/profile/wallet` فقط در صورت تأیید نیاز wallet واقعی

### apps/dashboard

- `/store`
- `/store-builder`
- `/store-crm` بخش داده خرید
- `/store-marketing` بخش داده فروش
- `/orders`
- `/discounts`
- `/revenue`

## Phase 08 — Chat & Consultation

### apps/app

- `/chat`
- realtime بخش `/appointments/waiting-room`
- attachment در پرونده و چت

### apps/dashboard

- `/messages`
- conversation داخل patient workspace

## Phase 09 — Reporting, CRM & Automation

### apps/dashboard

- `/dashboard` با KPI واقعی
- `/revenue` گزارش‌های تجمیعی
- `/store-crm`
- `/store-marketing`
- `/automation`
- campaign و segmentation پایه

## Phase 10 — AI & Bots

### apps/dashboard

- `/bot-center`
- `/bot-flows`
- `/bot-knowledge`
- `/bot-conversations`
- `/bot-campaigns`
- `/bot-analytics`
- بخش AI در `/bot-assessment`

## صفحات تنظیمات

`/settings` و تنظیمات پروفایل به‌صورت تدریجی در هر فاز تکمیل می‌شوند. هر setting باید در همان فازی پیاده شود که مالک رفتار آن است؛ ساخت یک جدول عمومی key/value برای تمام تنظیمات بدون schema مشخص ممنوع است.

## قانون حذف mock

mock هر feature فقط زمانی حذف می‌شود که:

- endpoint production-shaped وجود داشته باشد.
- loading/error/empty state متصل شده باشد.
- authorization تست شده باشد.
- داده seed مناسب development وجود داشته باشد.
- تست integration API پاس شده باشد.

حذف یک‌باره تمام mockها در شروع پروژه ممنوع است؛ migration باید feature-by-feature باشد.
