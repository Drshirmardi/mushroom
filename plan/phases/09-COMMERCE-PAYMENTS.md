# Phase 09 — Commerce, Inventory & Payments

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `D — تجارت و ارتباط`
- پیش‌نیاز: `Phase 02 DONE` و job/outbox infrastructure لازم از `Phase 08`
- تصمیم معماری: [`ADR-0009 — معماری چنددرگاهی با شروع از سداد`](../decisions/ADR-0009-multi-provider-payment-architecture.md)
- قرارداد draft: [`commerce-payment-provider-v1`](../contracts/commerce-payment-provider-v1.md)
- قرارداد provider: [`sadad-ipg-v1`](../contracts/sadad-ipg-v1.md)
- خروجی اصلی: catalog تا payment و fulfillment در app/dashboard واقعی است.

## وضعیت تصمیم‌ها

### تصمیم‌های پذیرفته‌شده

- معماری payment از ابتدا multi-provider است؛ domain commerce به provider مشخص وابسته نیست.
- سداد اولین و تنها provider واقعی این فاز است؛ fake provider فقط contract test را پوشش می‌دهد.
- dashboard یک provider فعال/configured را default می‌کند؛ automatic failover، priority routing و
  انتخاب provider توسط بیمار خارج از Phase 09 هستند.
- هر PaymentAttempt به provider و config revision تغییرناپذیر زمان ایجاد bind می‌شود.
- واحد داخلی و نمایشی commerce تومان صحیح است؛ provider conversion فقط داخل adapter انجام می‌شود.
- این تصمیم فقط برای store/commerce Phase 09 است و currency موجود تعرفه خدمات/appointment (`IRR`) را
  migrate یا reinterpret نمی‌کند؛ اشتراک UI money نیز نباید semantics دو domain را مخلوط کند.
- callback مرورگر authoritative نیست و Payment فقط پس از Verify server-to-server موفق می‌شود.
- credentialها write-only، versioned، encrypted-at-rest، redacted و audit‌شده‌اند.

### policyهای freeze‌شدهٔ `F09-T01`

- قیمت فروشگاه final و tax-inclusive است؛ `taxAmountToman=0` در نسخهٔ اول روی Order snapshot صریح است و
  فاکتور رسمی مالیاتی خارج از scope است. رسید امن سفارش/پرداخت جایگزین آن نیست.
- ارسال فقط `PICKUP` (همیشه صفر تومان) یا `COURIER` است. نرخ courier یک config clinic-scoped در PostgreSQL
  است که ADMIN از API/dashboard با authorization و audit مدیریت می‌کند؛ seed/config اولیه فقط `25,000 TOMAN`
  است و در code/UI hardcode نمی‌شود. نبود نرخ فعال courier آن روش را fail-closed غیرفعال می‌کند. روش، هزینه،
  address و اطلاعات تجاری ارسال immutable snapshot می‌شوند و تغییر نرخ فقط checkout جدید را اثر می‌دهد.
  tracking دستی ADMIN با carrier، code و URL HTTPS معتبر است؛ integration شرکت حمل‌ونقل خارج از scope است.
- پیش از پرداخت موفق، لغو reservation را آزاد می‌کند و Refund نمی‌سازد. پس از پرداخت، فقط ADMIN می‌تواند
  cancellation/return/refund case-by-case و audited را ثبت/approve/reject کند. refund پس از انتقال دستی
  بانکی و evidence/reference غیرحساس `COMPLETED` می‌شود؛ بیمار self-service refund ندارد.
- credential revisionهای لازم برای attempt non-terminal/reconciliation encrypted قابل استفاده می‌مانند؛
  پس از terminal شدن همهٔ attemptهای وابسته و ۹۰ روز، secret crypto-shred می‌شود. metadata/audit/reference
  مالی غیرحساس طبق retention تاریخچه باقی می‌ماند.

### gate خارجی `SADAD_GO_LIVE_BLOCKED`

این موارد blocker شروع یا completion نرم‌افزاری Phase 09 نیستند، اما enable/default، request واقعی و
runtime callback سداد را fail-closed نگه می‌دارند: Amount unit/formula، نسخه و environment، اختلاف `/Purchase` با
`/Purchase/Index?token=...`، Content-Type/casing callback، format/timezone تاریخ‌ها، static egress IP،
callback domain و credential/test environment. تا تأیید کتبی، `providerUnit=UNCONFIRMED` است و تبدیل
`TOMAN × 10` در adapter dormant فقط با integer arithmetic، کنترل overflow و snapshot immutable قابل آزمون است؛
request واقعی مطلقاً ممنوع است. پذیرندگی و production sign-off به Phase 12 منتقل شده‌اند.

## Sadad baseline

- flow رسمی: `PaymentRequest → Token → Redirect → HTTP POST callback → Verify`
- request: `POST https://sadad.shaparak.ir/api/v0/Request/PaymentRequest`
- redirect: `https://sadad.shaparak.ir/Purchase`
- verify: `POST https://sadad.shaparak.ir/api/v0/Advice/Verify`
- SignData request: `TerminalId;OrderId;Amount` با `TripleDES(ECB,PKCS7)` و خروجی Base64
- callback موفق فقط trigger Verify است و به‌تنهایی تحویل/پرداخت/درآمد ایجاد نمی‌کند.
- Verify `ResCode=0` و repeat-success `ResCode=100` موفق نهایی‌اند و یک اثر تجاری دارند.
- در عدم پاسخ Verify، همان attempt retry می‌شود؛ provider دیگری انتخاب نمی‌شود.
- سند عدم Verify تا ۱۵ دقیقه را باعث بازگشت خودکار مبلغ می‌داند؛ این refund تجاری نیست.
- `MultiplexingData`، card saving، `SourcePanList` و national-code/card binding خارج از scope هستند.
- نمونه .NET فقط protocol reference است؛ cookie secret، arbitrary PurchasePage، random OrderId، SSL3 و
  نمایش exception آن نباید بازتولید شوند.

## Endpoint map قطعی برای implementation

### ارتباط server-to-server با سداد

| کاربرد | Method | Endpoint |
|---|---|---|
| ایجاد درخواست و Token | `POST` | `https://sadad.shaparak.ir/api/v0/Request/PaymentRequest` |
| صفحه پرداخت | `GET` | `https://sadad.shaparak.ir/Purchase`؛ query/path دقیق Token گیت پذیرندگی است. |
| Verify نهایی | `POST` | `https://sadad.shaparak.ir/api/v0/Advice/Verify` |

### API داخلی Mushroom

| Actor | Method | Endpoint | مالک |
|---|---|---|---|
| ADMIN | `GET` | `/v1/admin/commerce/payment-providers` | `F09-T08` |
| ADMIN | `POST` | `/v1/admin/commerce/payment-providers/{providerCode}/config-revisions` | `F09-T08` |
| ADMIN | `PATCH` | `/v1/admin/commerce/payment-providers/{providerCode}` | `F09-T08` |
| ADMIN | `GET/PATCH` | `/v1/admin/commerce/shipping-rates/courier` | `F09-T05` |
| PATIENT | `GET/POST/PATCH/DELETE` | `/v1/patients/me/commerce/addresses/**` | `F09-T05` |
| PATIENT | `GET` | `/v1/patients/me/commerce/shipping-options` | `F09-T05` |
| PATIENT | `POST/GET` | `/v1/patients/me/orders/**` | `F09-T05` |
| PATIENT | `POST` | `/v1/patients/me/orders/{orderId}/payment-attempts` | `F09-T08` |
| PATIENT | `GET` | `/v1/patients/me/payment-attempts/{attemptId}` | `F09-T08` |
| SADAD browser POST | `POST` | `/v1/payments/providers/sadad/callback` | `F09-T08` |

نمونه رسمی PHP و تصمیم مالک، HTTP POST Form Data و allowlist `OrderId`/`Token`/`ResCode` را برای parser
dormant مشخص کرده‌اند؛ پذیرندگی جاری merchant برای runtime هنوز لازم است. callback به cookie/session بیمار وابسته
نیست و پس از correlation/Verify یا ثبت pending امن، با `303` به result page code-owned برمی‌گردد. endpointهای
refund/reconciliation در `F09-T09` و فقط پس از freeze policy اضافه می‌شوند؛ اکنون endpoint ساختگی ندارند.

جزئیات fieldها، `OrderId` عددی یکتا، SignData، callback، responseها، ResCodeها و اختلاف PDF/نمونه در
[`sadad-ipg-v1`](../contracts/sadad-ipg-v1.md) منبع implementation هستند.

## گیت شروع و گیت enable سداد

- Phase 09 پس از freeze policyهای `F09-T01` قابل claim است؛ `SADAD_GO_LIVE_BLOCKED` طراحی عمومی commerce یا
  persistence را متوقف نمی‌کند.
- پیاده‌سازی generic provider و adapter سداد در `F09-T08` مجاز است، اما enable/default و درخواست واقعی
  سداد تا پذیرش environment/version، redirect، callback runtime/date، IP/domain و credential/test plan
  fail-closed می‌ماند.
- `Amount = TOMAN × 10` فقط mapping تأییدشدهٔ adapter سداد است: integer-only، overflow-safe و snapshot؛
  این mapping به‌تنهایی Sadad را enable/default یا network-active نمی‌کند.
- نبود سند refund/inquiry/webhook یعنی capability آن‌ها `false` است، نه اینکه با endpoint حدسی ساخته شوند.

## محدوده UI

- app: تمام `/store/**`؛ wallet فقط با requirement مستقل
- dashboard: `/store`، `/store-builder`، `/orders`، `/discounts`، `/revenue` و بخش payment provider در
  `/settings`
- `/store-crm` و `/store-marketing` فقط بخش‌های متکی بر داده واقعی همین فاز
- secret خام، provider payload و endpoint قابل‌ویرایش در هیچ UI نمایش داده نمی‌شود.

## Taskها و dependency

- [x] `F09-T01` — freeze قرارداد catalog/SKU/price/tax/shipping/order/payment/refund و payment-provider
  - Depends on: owner decisions — `DONE`
  - خروجی: قرارداد `FROZEN`، state/error/endpoint matrix، ADR traceability و policyهای قطعی
  - پذیرش: هیچ money unit، provider capability یا lifecycle مبهم باقی نماند؛ unknownهای خارجی فقط به‌صورت
    صریح `SADAD_GO_LIVE_BLOCKED` هستند و provider تأییدنشده enabled/default نمی‌شود.
- [x] `F09-T02` — migration catalog/inventory/cart/address/order/payment و provider config revision
  - Depends on: `F09-T01 DONE`
  - خروجی: schema/migration/seed برای commerce، config/credential revision، attempt/payment/refund
  - پذیرش: fresh replay، constraintهای money/idempotency/uniqueness و عدم ذخیره secret خام پاس شوند.
- [x] `F09-T03` — dashboard catalog/category/product/SKU/inventory management
  - Depends on: `F09-T02 DONE`
  - خروجی: admin API + dashboard با authorization/audit و stateهای loading/error/empty
  - پذیرش: catalog و موجودی seedشده از dashboard واقعی مدیریت شوند.
- [x] `F09-T04` — app browse/search/detail/wishlist/cart
  - Depends on: `F09-T03 DONE`
  - خروجی: patient API + app store surfaces بدون source-of-truth محلی
  - پذیرش: جستجو، جزئیات، wishlist و cart persisted و resource-scoped باشند.
- [x] `F09-T05` — checkout، shipping و immutable order snapshot
  - Depends on: `F09-T04 DONE`
  - خروجی: idempotent checkout، address/shipping selection و snapshot اقلام/قیمت/tax/discount/shipping
  - پذیرش: تغییر catalog بعدی هیچ order تاریخی را تغییر ندهد.
- [x] `F09-T06` — stock ledger/reservation/expiry و concurrency
  - Depends on: `F09-T05 DONE`
  - خروجی: checkout reservation اتمیک، ledger append-only و idempotent، consume/release داخلی، expiry worker
    bounded با `SKIP LOCKED` و clock تزریقی، و inventory adjustment ادمین از مسیر ledger
  - پذیرش: `onHandQuantity` فیزیکی و `reservedQuantity` رزروشده است؛ sellable برابر تفاضل آن‌هاست. رقابت
    هم‌زمان stock منفی/oversell ایجاد نمی‌کند، shortfall کل checkout/cart/reservation/ledger را rollback می‌کند،
    retry اثر دوباره ندارد، expiry فقط یک‌بار آزاد می‌کند و تا attempt مبهم یا reconciliation هیچ stockی آزاد/Orderی
    cancel نمی‌شود. default TTL قابل‌پیکربندی و ۲۰ دقیقه است؛ Verify موفق آینده تنها در transaction داخلی
    reservation را consume خواهد کرد.
- [x] `F09-T07` — discount eligibility و usage limits
  - Depends on: `F09-T05 DONE`, `F09-T06 DONE`
  - خروجی: discount rules/limits/reservation با محاسبه server-side
  - پذیرش: concurrent/repeated use از limit عبور نکند و order snapshot تخفیف را حفظ کند.
- [x] `F09-T08` — payment provider registry/config API و Sadad adapter dormant — `DONE`
  - Depends on: `F09-T01 DONE`, `F09-T02 DONE`, `F09-T06 DONE`, `F09-T07 DONE`
  - خروجی: port/registry، config revision + dashboard settings، create/callback/Verify dormant سداد و retry
  - پذیرش: routeهای بالا و field mapping رسمی، OrderId عددی یکتا، `0/100` با دقیقاً یک پرداخت موفق،
    callback transport code-owned و غیرauthoritative، rotation امن، redaction و no-failover اثبات شوند؛ production
    enablement/acceptance خارج از معیار DONE این task و متعلق به Phase 12 است.
- [ ] `F09-T09` — fulfillment، tracking، cancellation، return/refund و reconciliation
  - Depends on: `F09-T08 DONE`
  - خروجی: lifecycle مجاز order و مسیر manual/provider refund بر اساس قرارداد freeze‌شده
  - پذیرش: موفقیت refund ساختگی ثبت نشود و dashboard همان order را تا نتیجه نهایی مدیریت کند.
- [ ] `F09-T10` — اتصال app/dashboard و Dashboard Home commerce widgets
  - Depends on: `F09-T03` through `F09-T09 DONE`
  - خروجی: checkout/redirect/result/receipt/order tracking بیمار و operations/widgetهای dashboard
  - پذیرش: مسیر cross-surface از catalog تا delivery/refund فقط داده واقعی نشان دهد.
- [ ] `F09-T11` — revenue از payment/refund واقعی
  - Depends on: `F09-T09 DONE`, `F09-T10 DONE`
  - خروجی: revenue read model با formula/source/timezone/currency روشن
  - پذیرش: callback، catalog price یا order پرداخت‌نشده درآمد محسوب نشود.
- [ ] `F09-T12` — OpenAPI/client freshness، tests، حذف mock و evidence
  - Depends on: `F09-T01` through `F09-T11 DONE`
  - خروجی: final generated client، full contract/concurrency/security/browser gates و phase evidence
  - پذیرش: همه exit criteria پاس، mockهای scope حذف و Phase 09 آماده review مستقل باشد.

Endpoint-owning taskها OpenAPI/client همان slice را با single-writer به‌روز می‌کنند؛ `F09-T12` مالک final
freshness و evidence است و generated output هرگز دستی ویرایش نمی‌شود.

## Batch map پیشنهادی

به‌دلیل schema، transaction، generated client و commerce module مشترک، ترتیب پیش‌فرض serialized است:

```text
F09-B01: F09-T01
F09-B02: F09-T02
F09-B03: F09-T03
F09-B04: F09-T04
F09-B05: F09-T05
F09-B06: F09-T06
F09-B07: F09-T07
F09-B08: F09-T08
F09-B09: F09-T09
F09-B10: F09-T10
F09-B11: F09-T11
F09-B12: F09-T12
```

Coordinator فقط پس از freeze contract و تعیین owned paths می‌تواند parallelism امن جدید اعلام کند.

## معیار خروج

- stock منفی، oversell، payment duplicate و price mutation تاریخی رخ نمی‌دهد.
- callback مرورگر authoritative نیست؛ Verify تکراری/timeout-safe است و اثر مالی حداکثر یک بار اعمال می‌شود.
- تغییر default/credential، attempt تاریخی را تغییر نمی‌دهد و secret خام قابل read/log نیست.
- dashboard همان order را تا تحویل، لغو، return و refund/reconciliation مدیریت می‌کند.
- رسید بیمار شماره سفارش، مبلغ، وضعیت، شماره مرجع و شماره پیگیری مجاز را نشان می‌دهد.
- widgetهای سفارش و درآمد فقط از Payment/Refund واقعی می‌آیند.
- migration از Phase 08 و دیتابیس خالی، authorization matrix، concurrency، provider contract، OpenAPI
  freshness و browser E2E پاس شده‌اند.
