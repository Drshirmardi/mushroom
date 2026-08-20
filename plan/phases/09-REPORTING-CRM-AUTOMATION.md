# Phase 09 — Reporting, CRM & Automation

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `D`
- پیش‌نیاز: داده واقعی از Phase 03، 06 و 07
- خروجی اصلی: KPI واقعی، segmentation و automation محدود و قابل audit

## Taskها

- [ ] `F09-T01` — تعریف دقیق KPIها، formula، timezone و data owner
- [ ] `F09-T02` — queryهای dashboard با index و pagination
- [ ] `F09-T03` — aggregate table/materialized view فقط برای queryهای اثبات‌شده
- [ ] `F09-T04` — revenue و appointment reports
- [ ] `F09-T05` — patient/customer activity و segmentation
- [ ] `F09-T06` — CRM list و segment filters
- [ ] `F09-T07` — تعریف trigger/action catalog محدود
- [ ] `F09-T08` — automation rule lifecycle و validation
- [ ] `F09-T09` — اجرای rule از outbox event با idempotency
- [ ] `F09-T10` — campaign audience snapshot و delivery jobs
- [ ] `F09-T11` — audit automation/campaign
- [ ] `F09-T12` — اتصال dashboard، CRM، marketing و automation UI
- [ ] `F09-T13` — consistency و performance tests
- [ ] `F09-T14` — evidence و review

## Automationهای مجاز اولیه

```text
appointment.created → confirmation notification
appointment.reminder_due → reminder
appointment.cancelled → cancellation notification
prescription.issued → patient notification
order.paid → fulfillment job
inventory.low → admin notification
```

## قواعد

- KPI بدون تعریف formula و time range ساخته نمی‌شود.
- reporting مستقیم به Prisma objectهای domain وابسته نمی‌شود.
- segment campaign هنگام ارسال snapshot می‌شود.
- automation loop باید شناسایی و متوقف شود.
- action تکراری idempotent است.
- rule builder اجازه اجرای query/code دلخواه نمی‌دهد.
- PostgreSQL گزینه اول analytics است.

## معیار بازبینی datastore تحلیلی

ClickHouse/Data Warehouse فقط وقتی بررسی می‌شود که:

- query و index بهینه شده باشد.
- aggregate/materialized view کافی نباشد.
- بار گزارش روی تراکنش‌ها اثر measurable داشته باشد.
- حجم و retention واقعی ثبت شده باشد.

## معیار خروج

- dashboard KPI از داده واقعی و تعریف مستند استفاده می‌کند.
- CRM segment قابل تکرار و audit است.
- automationهای پایه بدون duplicate اجرا می‌شوند.
- هیچ ابزار تحلیلی اضافی بدون bottleneck وارد نشده است.
