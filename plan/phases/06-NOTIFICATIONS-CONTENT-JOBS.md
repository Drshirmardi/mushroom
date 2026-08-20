# Phase 06 — Notifications, Content & Background Jobs

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `B`
- پیش‌نیاز: `Phase 03 DONE`؛ برای notificationهای بالینی `Phase 04 DONE`
- خروجی اصلی: job قابل retry، اعلان واقعی و محتوای مدیریتی

## زیرساخت جدید

- Redis
- BullMQ
- worker runtime/process
- transactional outbox
- retry/backoff/dead-letter policy

## مدل‌های داده

- `OutboxEvent`
- `Notification`
- `NotificationDelivery`
- `NotificationPreference`
- `Article`
- `ArticleCategory`
- `Banner`

## Taskها

- [ ] `F06-T01` — ADR انتخاب Redis/BullMQ و topology محیط‌ها
- [ ] `F06-T02` — افزودن Redis به development environment
- [ ] `F06-T03` — worker bootstrap و queue naming convention
- [ ] `F06-T04` — transactional outbox و publisher امن
- [ ] `F06-T05` — idempotent consumer، retry و dead-letter handling
- [ ] `F06-T06` — notification domain و preferenceها
- [ ] `F06-T07` — in-app notification delivery/read state
- [ ] `F06-T08` — appointment reminder jobs
- [ ] `F06-T09` — medication/prescription notification jobs
- [ ] `F06-T10` — adapter سرویس SMS پس از انتخاب provider
- [ ] `F06-T11` — article/category/banner publication lifecycle
- [ ] `F06-T12` — API/client و اتصال notifications/articles در app
- [ ] `F06-T13` — اتصال notifications/content و automation پایه در dashboard
- [ ] `F06-T14` — metrics queue و alertهای actionable
- [ ] `F06-T15` — restart/retry/idempotency tests
- [ ] `F06-T16` — evidence و review Milestone B

## Eventهای اولیه

```text
appointment.created
appointment.confirmed
appointment.cancelled
appointment.reminder_due
prescription.issued
medication.reminder_due
article.published
notification.requested
```

## قواعد

- side effect بیرونی قبل از commit تراکنش تولیدکننده اجرا نمی‌شود.
- outbox event دارای شناسه یکتا است.
- consumer باید replay را بدون اثر تکراری تحمل کند.
- متن notification snapshot دارد.
- preference کاربر قبل از کانال غیرضروری بررسی می‌شود.
- اعلان سیستمی/امنیتی طبق policy ممکن است قابل opt-out نباشد.

## تست‌های اجباری

- commit و rollback outbox
- worker restart با job باقی‌مانده
- retry و dead-letter
- duplicate event
- notification preference
- زمان‌بندی reminder با timezone تهران
- content publish/unpublish

## معیار خروج

- reminderها بدون وابستگی به request HTTP اجرا می‌شوند.
- restart باعث گم‌شدن job نمی‌شود.
- notification تکراری ایجاد نمی‌شود.
- content و notification mockهای مربوطه حذف شده‌اند.
- queue health و metric قابل مشاهده است.
