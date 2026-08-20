# Phase 07 — Commerce & Payments

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `C`
- پیش‌نیاز: `Phase 02 DONE` و `Phase 06 DONE`
- blocker خارجی: انتخاب درگاه پرداخت
- خروجی اصلی: فروشگاه، موجودی، سفارش و پرداخت واقعی

## مدل‌های داده

- `Category`
- `Product`
- `ProductImage`
- `InventoryLedger`
- `Cart`
- `CartItem`
- `Address`
- `Order`
- `OrderItem`
- `Discount`
- `PaymentAttempt`
- `PaymentWebhook`
- `Refund`
- `WalletAccount/WalletEntry` فقط در صورت نیاز قطعی

## Taskها

- [ ] `F07-T01` — تعیین currency canonical، gateway و order state machine
- [ ] `F07-T02` — migration catalog، inventory، cart و order
- [ ] `F07-T03` — admin catalog/category/product management
- [ ] `F07-T04` — product list/detail/filter public
- [ ] `F07-T05` — inventory ledger و stock update اتمیک
- [ ] `F07-T06` — cart lifecycle و price validation
- [ ] `F07-T07` — checkout، address و order price snapshot
- [ ] `F07-T08` — discount validation و usage limits
- [ ] `F07-T09` — stock reservation و expiry job
- [ ] `F07-T10` — payment adapter و create payment attempt
- [ ] `F07-T11` — signed/idempotent webhook processing
- [ ] `F07-T12` — order fulfillment state machine
- [ ] `F07-T13` — refund flow و audit
- [ ] `F07-T14` — تصمیم مستقل درباره wallet؛ پیاده‌سازی فقط با requirement تأییدشده
- [ ] `F07-T15` — API/client و اتصال تمام store flow در app
- [ ] `F07-T16` — اتصال store/orders/discount/revenue پایه در dashboard
- [ ] `F07-T17` — حذف mockهای commerce
- [ ] `F07-T18` — concurrency، payment و ledger tests
- [ ] `F07-T19` — evidence و review

## وضعیت‌های سفارش پیشنهادی

```text
DRAFT
PENDING_PAYMENT
PAID
PREPARING
SHIPPED
DELIVERED
CANCELLED
REFUNDED
```

## قواعد

- مبلغ float نیست.
- OrderItem نام، قیمت، تخفیف و tax/fee لازم را snapshot می‌کند.
- callback مرورگر پرداخت را نهایی نمی‌کند؛ webhook یا verify server-to-server authoritative است.
- webhook تکراری اثر تکراری ندارد.
- stock با update اتمیک/ledger منفی نمی‌شود.
- discount در زمان checkout دوباره validate می‌شود.
- تغییر Product سفارش قبلی را تغییر نمی‌دهد.
- wallet در صورت اجرا ledger-based است.

## تست‌های اجباری

- دو checkout هم‌زمان برای آخرین stock
- webhook duplicate و out-of-order
- payment failure/timeout/retry
- order price snapshot
- discount race/limit
- refund partial/full طبق requirement
- authorization سفارش و admin

## معیار خروج

- کاربر از catalog تا payment و tracking مسیر واقعی دارد.
- dashboard همان order را مدیریت می‌کند.
- stock منفی و payment تکراری در تست رخ نمی‌دهد.
- revenue پایه از تراکنش واقعی محاسبه می‌شود.
