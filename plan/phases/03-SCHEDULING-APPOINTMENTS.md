# Phase 03 — Scheduling & Appointments

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `A`
- پیش‌نیاز: `Phase 02 DONE`
- خروجی اصلی: اولین vertical slice کامل رزرو و مدیریت نوبت

## مدل‌های داده

- `AvailabilityRule`
- `AvailabilityException`
- `Appointment`
- `AppointmentHold`
- `AppointmentStatusHistory`
- `QueueEntry`

## وضعیت‌های نوبت

```text
PENDING
CONFIRMED
CHECKED_IN
IN_PROGRESS
COMPLETED
CANCELLED
NO_SHOW
EXPIRED
```

## Taskها

- [ ] `F03-T01` — تعریف state machine نوبت و policy لغو/تغییر
- [ ] `F03-T02` — طراحی availability rule و exception
- [ ] `F03-T03` — migration scheduling و indexها
- [ ] `F03-T04` — exclusion constraint PostgreSQL برای جلوگیری از overlap
- [ ] `F03-T05` — availability query و slot generation on demand
- [ ] `F03-T06` — create appointment transaction با idempotency
- [ ] `F03-T07` — patient list/detail/cancel/reschedule
- [ ] `F03-T08` — admin list/filter/confirm
- [ ] `F03-T09` — check-in، queue، start، complete و no-show
- [ ] `F03-T10` — status history و audit
- [ ] `F03-T11` — OpenAPI/client و اتصال تمام صفحات appointment در app
- [ ] `F03-T12` — اتصال appointments/calendar/queue در dashboard
- [ ] `F03-T13` — حذف mock appointment دو frontend
- [ ] `F03-T14` — concurrency، idempotency و state machine tests
- [ ] `F03-T15` — load baseline و query analysis
- [ ] `F03-T16` — end-to-end Milestone A و evidence

## Endpointها

```text
GET  /v1/doctors/:id/availability
POST /v1/appointments
GET  /v1/appointments/me
GET  /v1/appointments/:id
POST /v1/appointments/:id/cancel
POST /v1/appointments/:id/reschedule

GET  /v1/admin/appointments
POST /v1/admin/appointments/:id/confirm
POST /v1/admin/appointments/:id/check-in
POST /v1/admin/appointments/:id/start
POST /v1/admin/appointments/:id/complete
POST /v1/admin/appointments/:id/no-show
```

## قواعد دامنه

- slot منبع حقیقت مستقل نیست؛ از availability و appointment محاسبه می‌شود.
- overlap فعال برای یک پزشک در سطح دیتابیس رد می‌شود.
- تمام تغییر وضعیت‌ها در state machine تعریف می‌شوند.
- request تکراری با یک idempotency key نوبت دوم نمی‌سازد.
- بیمار فقط نوبت خودش را مدیریت می‌کند.
- لغو و reschedule تاریخچه ایجاد می‌کنند.
- زمان‌ها UTC و timezone نمایش جدا هستند.

## تست‌های اجباری

- ۱۰۰ درخواست هم‌زمان برای یک slot و دقیقاً یک موفقیت
- retry همان idempotency key
- overlap با بازه‌های جزئی و کامل
- availability exception و تعطیلی
- transitionهای مجاز و غیرمجاز
- authorization بیمار/پزشک/کارمند
- cancellation deadline
- pagination و filter dashboard

## معیار خروج Milestone A

- بیمار واقعی ثبت‌نام و وارد می‌شود.
- پزشک و availability واقعی می‌بیند.
- نوبت رزرو می‌کند.
- همان نوبت در dashboard دیده و مدیریت می‌شود.
- double booking در تست هم‌زمانی رخ نمی‌دهد.
- mockهای appointment حذف شده‌اند.
