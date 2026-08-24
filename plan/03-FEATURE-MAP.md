# نگاشت فیچرهای فعلی به roadmap feature-first

وجود route به معنی آماده‌بودن feature نیست. هر route در فاز مالک خود از mock/local state به API واقعی
متصل می‌شود. صفحه اصلی dashboard تدریجی است و فقط widget دارای منبع داده واقعی نمایش داده می‌شود.

## Phase 01 — Identity & Access — DONE

- web: `/login` و `/signup`
- app/dashboard: session bootstrap، route protection و logout
- app: بخش واقعی change password/session management در `/profile/security`
- MFA، biometric و delete account در این فاز اجرا نشده و باید تا زمان task مستقل feature-flag/hidden باشند.

## Phase 02 — Patient Onboarding & Consent

### app
- `/onboarding`
- `/profile`
- `/profile/edit`
- `/profile/medical` برای intake اولیه

### dashboard
- `/patients`
- `/patients/[id]`: overview و medical
- `/dashboard`: بیمار جدید و profile completion

## Phase 03 — Assessment & Eligibility

### app
- `/assessment`
- `/assessment/[type]`
- `/assessment/result`
- gate و CTA در شروع booking

### dashboard
- `/assessments`
- assessment tab در `/patients/[id]`
- `/dashboard`: وضعیت آزمون اصلی و activity

`/mezaj` در Phase 08 به result versioned وصل می‌شود؛ engine و main assessment در Phase 03 واقعی‌اند.

## Phase 04 — Clinic Directory & Availability

### app
- `/doctors/[id]`
- doctor/service data در `/appointments/book` و `/appointments/book/schedule`

### dashboard
- `/settings`: پروفایل پزشک، خدمات، تعرفه، ساعات، تعطیلی و مرخصی
- `/dashboard`: schedule readiness

## Phase 05 — Appointment Operations

### app
- `/appointments`
- `/appointments/[id]`
- `/appointments/book`
- `/appointments/book/schedule`
- `/appointments/book/confirm`
- `/appointments/book/success`

confirm رزرو در MVP به payment online وابسته نیست. waiting-room و consultation content در
Phase 10/06 تکمیل می‌شوند.

### dashboard
- `/appointments`
- `/calendar`
- `/queue`
- `/dashboard`: Home V1 عملیاتی

## Phase 06 — Encounter & Clinical Workspace

### app
- `/appointments/summary`
- `/profile/history`
- `/profile/health-record`
- بخش clinical `/profile/medical`

### dashboard
- patient workspace: overview، medical، history، appointments، assessments، traditional، timeline و notes
- placeholderهای این scope با داده واقعی جایگزین می‌شوند.

## Phase 07 — Prescription & Treatment

### app
- تمام `/treatment/**`

### dashboard
- `/prescriptions`
- تب‌های prescription، treatment، diet و exercise در patient workspace
- widgetهای درمان dashboard فقط پس از داده واقعی

## Phase 08 — Follow-up, Notifications & Content

### app
- `/trackers/pain`
- `/trackers/mood`
- `/mezaj`
- `/notifications`
- `/profile/notifications`
- `/articles`
- `/articles/[title]`

### dashboard
- `/health-tracking`
- `/notifications`
- `/content`
- health tab در patient workspace

## Phase 09 — Commerce & Payments

### app
- تمام `/store/**`
- `/profile/wallet` فقط با تصمیم مستقل

### dashboard
- `/store`
- `/store-builder`
- `/orders`
- `/discounts`
- `/revenue`
- بخش‌های متکی بر خرید واقعی در `/store-crm` و `/store-marketing`
- widgetهای order/revenue در `/dashboard`

## Phase 10 — Chat & Online Consultation

### app
- `/chat`
- `/appointments/waiting-room`

### dashboard
- `/messages`
- messages tab در patient workspace

## Phase 11 — Reporting & Access Expansion

- `/dashboard` با KPI نهایی دارای formula/source
- `/revenue` گزارش‌های تکمیلی
- `/store-crm` و `/store-marketing` فقط با داده واقعی
- audit/support tooling
- role/permission UI فقط در صورت requirement release

## Deferred

تا تصمیم جدید، این routeها UI demo باقی می‌مانند و جزو roadmap فعلی نیستند:

- `/automation`
- `/bot-center`
- `/bot-flows`
- `/bot-assessment` بخش AI
- `/bot-knowledge`
- `/bot-conversations`
- `/bot-campaigns`
- `/bot-analytics`

## صفحات تنظیمات و امنیت

- هر کارت `/settings` در فاز مالک رفتار خود واقعی می‌شود؛ جدول key/value عمومی ممنوع است.
- قابلیت‌های UI امنیت که backend ندارند باید تا task مستقل hidden/disabled و صریحاً برچسب‌گذاری شوند.

## قانون حذف mock و placeholder

mock فقط وقتی حذف می‌شود که endpoint، authorization، loading/error/empty state، seed و integration test
وجود داشته باشد. تب dashboard فاقد backend باید مخفی شود؛ پیام دائمی «در حال بارگذاری» جایگزین feature نیست.
