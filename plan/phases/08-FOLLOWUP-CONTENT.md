# Phase 08 — Follow-up, Health Tracking, Notifications & Content

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `C — هسته درمان`
- پیش‌نیاز: `Phase 05 DONE`؛ reminder درمان به `Phase 07`
- خروجی اصلی: پیگیری سلامت، اعلان داخل اپ و محتوای آموزشی واقعی هستند.

## محدوده UI

- app: `/trackers/pain`، `/trackers/mood`، `/mezaj`، `/notifications`،
  `/profile/notifications` و `/articles/**`
- dashboard: `/health-tracking`، `/notifications`، `/content` و تب سلامت بیمار

## مدل و زیرساخت

- `HealthObservation` و `MezajResult`
- `Notification`، `NotificationDelivery` و `NotificationPreference`
- `Article`، `ArticleCategory` و `Banner`
- `OutboxEvent`؛ Redis/BullMQ فقط هنگام reminder/job واقعی

## Taskها

- [x] `F08-T01` — metric/unit/range و query contract health observations
- [x] `F08-T02` — write/query tracker و dashboard health views
- [ ] `F08-T03` — mezaj result از assessment versioned
- [ ] `F08-T04` — notification/preference و in-app read state
- [ ] `F08-T05` — content publication lifecycle و media policy
- [ ] `F08-T06` — ADR و bootstrap outbox/worker فقط برای reminder واقعی
- [ ] `F08-T07` — appointment و treatment reminders idempotent
- [ ] `F08-T08` — اتصال app tracker/notification/article
- [ ] `F08-T09` — اتصال dashboard health/notification/content
- [ ] `F08-T10` — restart/retry/idempotency، timezone و browser E2E
- [ ] `F08-T11` — حذف mock scope و review Milestone C

## معیار خروج

- app و dashboard observation مشترک را می‌بینند.
- notification تکراری ایجاد نمی‌شود و preference رعایت می‌شود.
- reminder مستقل از request HTTP و قابل retry است.
- content فقط در وضعیت published برای بیمار دیده می‌شود.
