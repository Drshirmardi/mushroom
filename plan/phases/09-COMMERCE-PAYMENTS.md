# Phase 09 — Commerce, Inventory & Payments

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `D — تجارت و ارتباط`
- پیش‌نیاز: `Phase 02 DONE` و job infrastructure لازم از `Phase 08`
- blocker: انتخاب درگاه پرداخت، مالیات/فاکتور، ارسال و refund policy
- خروجی اصلی: catalog تا payment و fulfillment در app/dashboard واقعی است.

## محدوده UI

- app: تمام `/store/**`؛ wallet فقط با requirement مستقل
- dashboard: `/store`، `/store-builder`، `/orders`، `/discounts`، `/revenue`
- `/store-crm` و `/store-marketing` فقط بخش‌های متکی بر داده واقعی همین فاز

## Taskها

- [ ] `F09-T01` — قرارداد catalog/SKU/price/tax/shipping/order/payment/refund
- [ ] `F09-T02` — migration catalog/inventory/cart/address/order/payment
- [ ] `F09-T03` — dashboard catalog/category/product/inventory management
- [ ] `F09-T04` — app browse/search/detail/wishlist/cart
- [ ] `F09-T05` — checkout، shipping و order snapshot
- [ ] `F09-T06` — stock ledger/reservation/expiry و concurrency
- [ ] `F09-T07` — discount usage limits
- [ ] `F09-T08` — payment adapter و signed/idempotent webhook
- [ ] `F09-T09` — fulfillment، tracking، cancellation، return/refund و reconciliation
- [ ] `F09-T10` — اتصال app/dashboard و Dashboard Home commerce widgets
- [ ] `F09-T11` — revenue از payment/refund واقعی
- [ ] `F09-T12` — OpenAPI/client، tests، حذف mock و evidence

## معیار خروج

- stock منفی، payment duplicate و price mutation تاریخی رخ نمی‌دهد.
- callback مرورگر authoritative نیست.
- dashboard همان order را تا تحویل/refund مدیریت می‌کند.
- widgetهای سفارش و درآمد فقط از تراکنش واقعی می‌آیند.
