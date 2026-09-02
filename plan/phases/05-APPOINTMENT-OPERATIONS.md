# Phase 05 — Appointment Booking & Dashboard Operations

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `B — کلینیک قابل رزرو`
- پیش‌نیاز: `Phase 03 DONE` و `Phase 04 DONE`
- خروجی اصلی: مسیر register تا رزرو و عملیات روز کلینیک end-to-end واقعی است.

## محدوده UI

### apps/app

- تمام routeهای `/appointments/**`
- confirm رزرو در MVP بدون وابستگی اجباری به wallet/payment online

### apps/dashboard

- `/appointments`
- `/calendar`
- `/queue`
- Dashboard Home V1 عملیاتی

## مدل‌های داده

- `Appointment`
- `AppointmentHold`
- `AppointmentStatusHistory`
- `QueueEntry`
- `OperationalActivity`

## Taskها

- [x] `F05-T01` — state machine، cancellation/reschedule policy و price snapshot
- [x] `F05-T02` — migration، index و exclusion constraint overlap فعال پزشک
- [x] `F05-T03` — create appointment با eligibility authoritative و idempotency
- [x] `F05-T04` — patient list/detail/cancel/reschedule
- [x] `F05-T05` — admin create-on-behalf/list/filter/confirm/cancel/reschedule
- [x] `F05-T06` — check-in، queue، call-next، start، complete و no-show
- [x] `F05-T07` — status history، reason و operational activity
- [x] `F05-T08` — اتصال تمام appointment flow در app و حذف payment/wallet dependency MVP
- [x] `F05-T09` — اتصال appointments/calendar/queue در dashboard
- [ ] `F05-T10` — Dashboard Home V1 با KPI، برنامه امروز و activity واقعی
- [ ] `F05-T11` — OpenAPI/client و حذف mock appointment/operations
- [ ] `F05-T12` — concurrency، idempotency، authorization و state machine tests
- [ ] `F05-T13` — cross-app browser E2E و query/load baseline
- [ ] `F05-T14` — evidence و review Milestone B

## Dashboard Home V1

- نوبت‌های امروز، حضوری و آنلاین
- بیمار جدید بر مبنای تکمیل profile در بازه
- درخواست‌های pending
- برنامه امروز
- check-in، در صف و در حال ویزیت
- میانگین انتظار از `checkedInAt` تا `startedAt`
- ویزیت تکمیل‌شده
- activity پرونده، آزمون و رزرو

widget مالی، سفارش، تکمیل درمان، بیماری/مزاج شایع تا ایجاد منبع داده واقعی پنهان می‌ماند.

## قواعد و معیار خروج

- create و reschedule eligibility را در use case چک می‌کنند.
- تغییر policy پس از انتخاب slot با `BOOKING_INELIGIBLE` رد می‌شود.
- ۱۰۰ درخواست هم‌زمان برای یک slot دقیقاً یک موفقیت دارد.
- retry همان idempotency key نوبت دوم نمی‌سازد.
- state transition و عملیات queue تکراری ناسازگاری ایجاد نمی‌کند.
- اعداد خانه با list/calendar/queue یکسان‌اند.
- مسیر register → profile → assessment conditional → booking → dashboard در browser E2E پاس است.
