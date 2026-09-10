# قرارداد commerce و payment provider — نسخه ۱

- وضعیت: `FROZEN_FOR_IMPLEMENTATION — F09-T01`
- مالک freeze: `F09-T01`
- تصمیم معماری: [`ADR-0009`](../decisions/ADR-0009-multi-provider-payment-architecture.md)
- قرارداد دقیق سداد: [`sadad-ipg-v1`](sadad-ipg-v1.md)
- منبع پروتکل سداد: راهنمای رسمی و نمونه .NET ارائه‌شده توسط مالک محصول؛ فایل محرمانه وارد Git نمی‌شود.

## تصمیم‌های قطعی

- architecture از ابتدا multi-provider است و Sadad تنها provider واقعی Phase 09 است.
- واحد product-facing و commerce، `TOMAN` صحیح است؛ float ممنوع است.
- این واحد فقط قرارداد store/commerce است؛ تعرفه خدمات پزشکی و appointmentهای موجود با `IRR` خارج از
  migration Phase 09 می‌مانند و هیچ تبدیل تاریخی ضمنی روی آن‌ها انجام نمی‌شود.
- هر adapter مقدار و واحد provider را صریح برمی‌گرداند و attempt هر دو مقدار را snapshot می‌کند.
- یک provider فعال/configured به‌عنوان default انتخاب می‌شود.
- attempt پس از ایجاد provider یا config revision عوض نمی‌کند.
- automatic failover و انتخاب provider توسط بیمار در Phase 09 وجود ندارد.
- callback، redirect و داده مرورگر نتیجه قطعی پرداخت نیستند.
- فقط Verify معتبر server-to-server می‌تواند اثر مالی و order/inventory را اعمال کند.
- provider endpointها code-owned و allowlisted هستند؛ dashboard URL آزاد دریافت نمی‌کند.
- credentialها write-only، versioned، encrypted-at-rest و audit‌شده‌اند.

## policy تجاری freeze‌شده

- قیمت فروشگاه نهایی و `tax-inclusive` است. تمام moneyهای commerce integer `TOMAN` هستند؛
  `taxAmountToman` در snapshot صریح است و در نسخهٔ اول مقدار پیش‌فرض آن `0` است.
- Phase 09 فاکتور رسمی مالیاتی تولید نمی‌کند؛ فقط رسید امن سفارش و پرداخت را ارائه می‌دهد.
- روش‌های ارسال نسخهٔ اول فقط `PICKUP` با هزینهٔ صفر و `COURIER` با هزینهٔ ثابت TOMAN هستند. ADMIN
  هزینهٔ courier را تعیین می‌کند. روش، هزینه، address و اطلاعات تجاری ارسال در زمان checkout immutable
  snapshot می‌شوند.
- tracking دستی است: ADMIN فقط carrier name، tracking code و tracking URL معتبر را ثبت می‌کند؛ اتصال
  مستقیم شرکت حمل‌ونقل خارج از scope است. URL باید HTTPS باشد و هرگز provider endpoint نیست.
- پیش از Payment موفق، لغو Order reservation را آزاد می‌کند و Refund نمی‌سازد. بیمار در Phase 09 مسیر
  self-service refund ندارد. پس از Payment، ADMIN درخواست cancellation/return/refund را audited ثبت و
  case-by-case approve یا reject می‌کند.
- سداد refund خودکار یا API-based ندارد. Refund فقط پس از انتقال دستی بانکی و ثبت reference/evidence
  غیرحساس به `COMPLETED` می‌رسد؛ قابلیت provider برای refund و partialRefund همچنان `false` است. مبلغ
  manual refund صریح و حداکثر مبلغ Payment captureشده است؛ هرگز با callback یا فرض موفقیت کامل نمی‌شود.
- credential خام هرگز در response، log، audit یا Git نمی‌آید. revision جاری و revisionهای لازم برای
  attemptهای non-terminal یا reconciliation encrypted و قابل استفاده می‌مانند. پس از terminal شدن همهٔ
  attemptهای وابسته و گذشت ۹۰ روز، secret همان revision crypto-shred می‌شود؛ metadata غیرحساس، audit و
  referenceهای مالی مطابق retention تاریخچهٔ مالی می‌مانند.

## gate سداد: `SADAD_GO_LIVE_BLOCKED`

`SADAD_GO_LIVE_BLOCKED` blocker شروع یا persistence عمومی commerce نیست؛ فقط enable/default شدن Sadad،
ارسال request واقعی، آزمون پذیرندگی و closure نهایی Phase 09 را متوقف می‌کند. تا دریافت تأیید کتبی
پذیرندگی، `providerUnit=UNCONFIRMED` است و هیچ تبدیل—including `TOMAN × 10`—وجود ندارد. موارد لازم برای
برداشتن gate عبارت‌اند از amount unit/formula، نسخه و environment، redirect path/query، Content-Type و
casing callback، فرمت/timezone تاریخ‌ها، static egress IP، callback domain و credential/test environment.

نبود سند رسمی برای `sandbox`، `inquiry`، `webhook`، `refund` و `partialRefund` capability آن‌ها را
`false` نگه می‌دارد؛ endpoint یا موفقیت ساختگی مجاز نیست.

## catalog، order و refund lifecycle

| Aggregate | وضعیت‌ها و transitionهای مجاز |
|---|---|
| Catalog product/SKU | `DRAFT → ACTIVE → ARCHIVED`؛ محصول/SKU archived به checkout جدید نمی‌رود، اما snapshotهای تاریخی را تغییر نمی‌دهد. |
| Order پیش از پرداخت | `PENDING_PAYMENT → CANCELLED` (patient-owner یا ADMIN) و reservation آزاد می‌شود؛ `PENDING_PAYMENT → PAID` فقط از Verify موفق. |
| Order پس از پرداخت | `PAID → FULFILLMENT_PENDING → READY_FOR_PICKUP → DELIVERED` یا `PAID → FULFILLMENT_PENDING → SHIPPED → DELIVERED`. transitionهای fulfillment فقط ADMIN هستند. |
| Cancellation/return | Order پرداخت‌شده فقط با درخواست audited ADMIN به `CANCELLATION_REQUESTED` یا `RETURN_REQUESTED` می‌رود؛ ADMIN آن را به `REFUND_PENDING` یا `CANCELLATION_REJECTED`/`RETURN_REJECTED` می‌برد. |
| Refund | `REQUESTED → APPROVED → MANUAL_EXECUTION_PENDING → COMPLETED` یا `REQUESTED → REJECTED`; `COMPLETED` فقط با evidence/reference غیرحساس انتقال دستی بانکی. |
| PaymentAttempt | `CREATED → REQUESTING → REDIRECT_READY → CALLBACK_RECEIVED → VERIFY_PENDING → VERIFIED|FAILED|EXPIRED|REQUIRES_RECONCILIATION` و `REQUIRES_RECONCILIATION → VERIFIED|FAILED`. callback هرگز مستقیم `VERIFIED` نمی‌شود. |

Order، PaymentAttempt، Payment و Refund aggregateهای جدا هستند. یک Payment موفق فقط پس از Verify، در همان
transaction داخلی، reservation را consume و Order را `PAID` می‌کند. Refund دستی Payment را mutate نمی‌کند.

## Provider port

قرارداد پایه:

```text
code
capabilities
createPayment(input) -> token, redirect, provider amount/unit, raw provider code
parseCallback(input) -> correlation fields, provider result code, safe metadata
verifyPayment(input) -> final outcome, amount, order, reference, trace, transaction date
```

قابلیت‌های اختیاری فقط وقتی expose می‌شوند که adapter و مستند provider آن را پشتیبانی کنند:

```text
inquirePayment
handleWebhook
refund
partialRefund
```

capability declaration و implementation با contract test یکسان بررسی می‌شوند. نبود capability باید
خطای پایدار `PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED` بدهد و هرگز موفقیت ساختگی ثبت نکند.

### capability matrix سداد

| Capability | وضعیت Phase 09 | قاعده |
|---|---|---|
| `createPayment`, `parseCallback`, `verifyPayment` | `SUPPORTED_WHEN_GO_LIVE_READY` | adapter در `F09-T08` پیاده‌سازی می‌شود، اما تا حذف `SADAD_GO_LIVE_BLOCKED` هیچ config سداد enabled/default نیست و call واقعی رخ نمی‌دهد. |
| `sandbox`, `inquiry`, `webhook`, `refund`, `partialRefund` | `UNSUPPORTED` | method/endpoint موفقیت‌نما وجود ندارد و فراخوانی با `PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED` رد می‌شود. |

## Provider configuration

`PaymentProviderConfig` مالک provider code، clinic، enabled/default state و revision فعال است.
`PaymentProviderConfigRevision` immutable است و mode، public/non-secret metadata و credential version
را ثابت می‌کند. تغییر هر تنظیم مؤثر revision جدید می‌سازد.

یک config سداد با unit `UNCONFIRMED` ممکن است فقط disabled/configured-for-review باشد. عملیات atomically
کردن `enabled=true` یا `isDefault=true` باید پیش از تغییر state gateهای unit/formula، protocol/environment،
redirect، callback transport/date format، egress IP/domain و credential معتبر را بررسی کند و در غیر این
صورت با `SADAD_GO_LIVE_BLOCKED` رد شود. disabled کردن config فقط attempt جدید را متوقف می‌کند و Verify یا
reconciliation attemptهای تاریخی را قطع نمی‌کند.

Dashboard فقط این اطلاعات را می‌بیند:

- provider code و نام نمایشی
- enabled/default/configured
- modeهای پشتیبانی‌شده
- زمان آخرین تغییر و actor مجاز
- masked identifiers در صورت تصویب contract

raw credential، encryption metadata، provider payload و endpoint آزاد هرگز در response نمایش داده
نمی‌شوند.

## Payment attempt و money

هر attempt حداقل این snapshot را حفظ می‌کند:

```text
id, clinicId, patientId, orderId
providerCode, providerConfigRevisionId
commerceAmountToman
providerAmount, providerUnit
providerToken, providerTransactionId, providerReferenceId, providerTraceNo
status, idempotencyKey
expiresAt, callbackReceivedAt, verificationStartedAt, verifiedAt
lastProviderCode, failureCode, reconciliationReason
createdAt, updatedAt
```

`commerceAmountToman` همیشه integer و غیرnullable است. `providerUnit` صریح است و برای سداد پیش از go-live
`UNCONFIRMED` می‌ماند؛ در این حالت `providerAmount` فقط nullable است زیرا هیچ conversion یا request مجاز
نیست. پس از ایجاد attempt واقعی، providerAmount باید integer decimal-free و providerUnit غیر-UNCONFIRMED
باشد. raw payload فقط در صورت نیاز قطعی، redacted، محدود و با retention صریح ذخیره می‌شود.

## authorization و endpoint matrix

| Actor | Surface/endpoint خانواده | مجوز و قاعده |
|---|---|---|
| PATIENT | `GET /v1/commerce/products`, `GET /v1/commerce/products/{productId}`, `GET/PUT /v1/patients/me/{cart,wishlist}` | فقط catalog فعال و resourceهای خود بیمار. |
| PATIENT | `POST /v1/patients/me/orders`, `GET /v1/patients/me/orders/{orderId}` | checkout idempotent؛ فقط Order خود بیمار و snapshot immutable. |
| PATIENT | `POST /v1/patients/me/orders/{orderId}/payment-attempts`, `GET /v1/patients/me/payment-attempts/{attemptId}` | owner-scoped؛ redirect/status امن، بدون secret یا raw provider detail. |
| ADMIN | `/v1/admin/commerce/{categories,products,skus,inventory,shipping-rates}` | مدیریت catalog/inventory/shipping با authorization و audit؛ mutationهای مالی و inventory audit می‌شوند. |
| ADMIN | `/v1/admin/commerce/orders/{orderId}/{fulfillment,tracking,cancellation,returns,refunds}` | فقط lifecycleهای جدول بالا، audited؛ refund self-service ندارد. |
| ADMIN | `/v1/admin/commerce/payment-providers/**` | config/revision write-only و audited؛ enable/default Sadad با gate کنترل می‌شود. |
| Public Sadad callback | `POST /v1/payments/providers/sadad/callback` | cookie/session بیمار خوانده نمی‌شود؛ body محدود، rate-limited و redacted است؛ فقط transport تأییدشدهٔ پذیرندگی پذیرفته می‌شود و پاسخ `303` فقط code-owned است. |

تمام create/mutationهای حساس از جمله checkout، payment attempt، config revision، cancellation/return/refund
request و انجام refund دارای `Idempotency-Key` و audit actor/request هستند. APIهای admin هرگز جای ownership
Order بیمار را نمی‌گیرند؛ patient فقط resourceهای خود را می‌بیند.

## stable error matrix

| Code | وضعیت امن |
|---|---|
| `COMMERCE_MONEY_UNIT_INVALID` | amount غیرinteger، currency نادرست یا provider conversion مبهم رد می‌شود. |
| `SHIPPING_METHOD_UNAVAILABLE` / `FULFILLMENT_TRACKING_URL_INVALID` | روش یا URL خارج از policy رد می‌شود. |
| `ORDER_STATE_CONFLICT` / `ORDER_NOT_CANCELLABLE` | transition lifecycle نامجاز هیچ اثر مالی/موجودی ندارد. |
| `REFUND_SELF_SERVICE_UNSUPPORTED` / `REFUND_MANUAL_EVIDENCE_REQUIRED` | بیمار refund نمی‌سازد و ADMIN بدون evidence غیرحساس آن را complete نمی‌کند. |
| `PAYMENT_PROVIDER_NOT_CONFIGURED` / `PAYMENT_PROVIDER_DISABLED` | attempt جدید provider معتبر/default ندارد. |
| `SADAD_GO_LIVE_BLOCKED` | Sadad `UNCONFIRMED` یا deployment/acceptance prerequisite ناقص است؛ call واقعی رخ نمی‌دهد. |
| `PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED` | capability بدون سند رسمی یا implementation رد می‌شود. |
| `PAYMENT_ATTEMPT_NOT_FOUND`, `PAYMENT_ATTEMPT_EXPIRED`, `PAYMENT_CALLBACK_REJECTED` | callback/patient status امن و بدون provider detail. |
| `PAYMENT_VERIFICATION_PENDING`, `PAYMENT_VERIFICATION_FAILED`, `PAYMENT_VERIFICATION_MISMATCH`, `PAYMENT_RECONCILIATION_REQUIRED` | فقط Verify تعیین‌کننده است؛ mismatch/timeout payment موفق نمی‌سازد. |

## Sadad protocol baseline

رفتار تأییدشده از راهنمای ارائه‌شده؛ field matrix، ResCode policy، اختلاف راهنما/نمونه و go-live gate در
[`sadad-ipg-v1`](sadad-ipg-v1.md) منبع حقیقت provider هستند:

1. `POST https://sadad.shaparak.ir/api/v0/Request/PaymentRequest`
2. فیلدهای اجباری: `MerchantId`, `TerminalId`, `Amount`, `OrderId`, `LocalDateTime`, `ReturnUrl`,
   `SignData`
3. `SignData = Base64(TripleDES-ECB-PKCS7(TerminalId;OrderId;Amount, Base64DecodedTerminalKey))`
4. پاسخ موفق request دارای `ResCode=0` و `Token` است.
5. redirect به `https://sadad.shaparak.ir/Purchase` با token انجام می‌شود.
6. callback با HTTP POST و حداقل `OrderId`, `Token`, `ResCode` دریافت می‌شود.
7. callback `ResCode=0` فقط Verify را آغاز می‌کند.
8. Verify به `POST https://sadad.shaparak.ir/api/v0/Advice/Verify` با `Token` و SignData رمز‌شده token
   ارسال می‌شود.
9. Verify `ResCode=0` موفق است؛ `ResCode=100` درخواست تکراریِ قبلاً موفق و نتیجه نهایی موفق است.
10. Verify `-1` نامعتبر/ناموجود و `101` منقضی است.
11. در عدم دریافت پاسخ Verify، retry همان attempt لازم است؛ provider عوض نمی‌شود.
12. بدون Verify موفق کالا تحویل، reservation مصرف و revenue شناسایی نمی‌شود.

`OrderId` ارسالی به سداد یک شناسه عددی long، یکتا و غیرتکراری برای هر تراکنش است و باید جدا از UUID
داخلی Order روی attempt نگه‌داری شود. PDF فقط HTTP POST بودن callback را قطعی می‌کند؛ parser و
Content-Type/casing دقیق باید مطابق گیت پذیرندگی [`sadad-ipg-v1`](sadad-ipg-v1.md) freeze شوند.
`PrimaryAccNo`, `HashedCardNo` و `CardHolderFullName` در Phase 09 ذخیره یا log نمی‌شوند.

سند عدم Verify تا ۱۵ دقیقه را سبب بازگشت خودکار مبلغ می‌داند. این رفتار refund تجاری نیست. attempt،
reservation expiry و reconciliation باید این بازه را لحاظ کنند، ولی مقدار دقیق timer داخلی باید با clock
skew و آزمون محیط پذیرندگی در `F09-T08` تثبیت شود.

## Idempotency و transaction

- create checkout و payment attempt دارای `Idempotency-Key` و unique business key هستند.
- provider callback می‌تواند صفر یا چند بار برسد؛ پردازش repeat-safe است.
- Verify می‌تواند تکرار شود و `0/100` حداکثر یک business effect ایجاد می‌کنند.
- amount/order/token برگشتی باید با attempt تطبیق داده شوند؛ mismatch پرداخت را موفق نمی‌کند.
- تبدیل `reservation → consumed`، ایجاد Payment موفق و transition Order در یک transaction داخلی اعمال
  می‌شوند.
- side effect بیرونی پس از commit و از مسیر outbox/retry انجام می‌شود.
- timeout مبهم به `REQUIRES_RECONCILIATION` می‌رود و automatic failover ندارد.

## Security و privacy

- IP خروجی و callback domain باید مطابق onboarding پذیرندگی سداد از پیش ثبت شوند.
- callback عمومی است، اما rate-limited، validate‌شده و مستقل از cookie/session بیمار است.
- Merchant/Terminal/Key و raw callback/Verify payload در log، audit metadata یا error response قرار
  نمی‌گیرند.
- `CardHolderFullName` و داده کارت برگشتی فقط در صورت requirement مستقل پردازش می‌شوند؛ در Phase 09
  ذخیره یا log نمی‌شوند. شماره masked/referenceهای لازم نیز با retention محدود نگه‌داری می‌شوند.
- امکانات `MultiplexingData`, `SourcePanList`, card saving و national-code binding خارج از scope هستند.
- endpoint و الگوریتم provider فقط از adapter می‌آیند؛ config dashboard نمی‌تواند host دلخواه تعیین کند.

## freeze و acceptance

این قرارداد برای `F09-T02` تا `F09-T12` frozen است: lifecycle، authorization، stable errors، endpoint
families، TOMAN/order snapshots، provider capability و credential-retention صریح‌اند. `sadad-ipg-v1` نیز
mapping مستند و go-live gate را freeze می‌کند. تنها داده‌های بیرونی ناشناخته در `SADAD_GO_LIVE_BLOCKED`
ثبت شده‌اند و نمی‌توانند به conversion، enable/default یا درخواست واقعی تبدیل شوند.
