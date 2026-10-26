# قرارداد پروتکل سداد IPG — نسخه ۱

- وضعیت: `FROZEN_PROTOCOL — LIVE_RUNTIME_CAPABLE; production acceptance pending`
- مالک freeze: `F09-T01`
- مالک implementation: `F09-T08`
- منبع اصلی: راهنمای رسمی سداد ارائه‌شده توسط مالک محصول، با سربرگ نسخه `1.10` و ردیف تاریخچه
  `1.11` به تاریخ `1401/06/07`
- منبع تطبیقی: نمونه رسمی/قدیمی .NET؛ در هر اختلاف، راهنمای رسمی و سپس قرارداد جاری پذیرندگی
  بر نمونه اولویت دارند.

## evidence افزوده‌شده در handoff `F09-B08`

| موضوع | evidence | درجه اعتبار و تصمیم |
|---|---|---|
| Amount | تأیید مالک محصول بر مبنای مستندات سداد | `RIAL`؛ Mushroom همچنان `TOMAN` است. `providerAmount = commerceAmountToman × 10` فقط در adapter سداد با integer arithmetic، کنترل overflow و snapshot immutable مجاز است. |
| PaymentRequest/Verify | راهنمای پروتکل | `POST application/json; charset=utf-8`؛ transport فقط پس از رفع gate فعال می‌شود. |
| LocalDateTime | نمونه رسمی PHP و تصمیم مالک | profile مستند `MM/dd/yyyy h:mm:ss tt` با clock تزریقی و timezone ثابت `Asia/Tehran`؛ وابستگی به locale سیستم ممنوع است. |
| callback | نمونه رسمی PHP و تصمیم مالک، نه merchant acceptance جاری | HTTP POST Form Data؛ فقط `OrderId`, `Token`, `ResCode` با allowlist و محدودیت اندازه پردازش می‌شوند. PAN، نام دارنده کارت و raw payload ذخیره/log نمی‌شوند. |
| redirect | PDF، نمونه PHP و نمونه .NET | profiles code-owned: `/Purchase`، `/VPG/Purchase?Token=...` و `/Purchase/Index?token=...`؛ هیچ‌کدام بدون پذیرندگی جاری runtime-active نیست. |

## وضعیت فعال‌سازی و capability

این قرارداد mapping مستند و مرز fail-closed را freeze می‌کند. مالک محصول در `2026-10-11` اجرای runtime واقعی را
برای مسیر کنترل‌شدهٔ پذیرش تأیید کرد. deployment فقط با `SADAD_TRANSPORT_MODE=live` کامل اجازه تماس شبکه دارد و
ADMIN باید provider را جداگانه enabled/default کند؛ در غیر این صورت `SADAD_GO_LIVE_BLOCKED` حفظ می‌شود.

| Capability | وضعیت freeze‌شده |
|---|---|
| `createPayment`, `parseCallback`, `verifyPayment` | تنها base capabilityهای protocol؛ runtime فقط پس از go-live readiness. |
| `sandbox`, `inquiry`, `webhook`, `refund`, `partialRefund` | `false/unsupported` تا سند رسمی جدید؛ endpoint یا success مصنوعی ممنوع. |

## `SADAD_GO_LIVE_BLOCKED` matrix

| مورد | وضعیت فعلی | شرط رفع gate |
|---|---|---|
| Amount unit و تبدیل TOMAN | `RIAL` با evidence مالک | تبدیل تنها در adapter، با overflow protection و snapshot immutable؛ این evidence به‌تنهایی enablement نیست. |
| نسخه/API و محیط پذیرندگی | `UNCONFIRMED` | نسخهٔ جاری و environment/test plan کتبی. |
| redirect | `UNCONFIRMED` | shape دقیق `/Purchase` در PDF یا `/Purchase/Index?token=...` در نمونه، از پذیرندگی. |
| callback transport | Form Data evidence از نمونه/مالک، نه acceptance | Content-Type/casing merchant runtime از acceptance evidence. |
| تاریخ‌ها | profile PHP/مالک برای `LocalDateTime` | format/timezone `TransactionDate` و پذیرش جاری همچنان باید تأیید شود. |
| network/deployment | `UNCONFIRMED` | static egress IP و HTTPS callback domain ثبت‌شده. |
| credential/test environment | `UNCONFIRMED` | credential خارج از Git و محیط/روش آزمون تأییدشده. |

mode `live` اظهار عملیاتی deployer دربارهٔ آماده‌بودن ردیف‌های environment است و مسیر تراکنش کنترل‌شده را باز
می‌کند؛ production sign-off فقط پس از ثبت evidence همین جدول انجام می‌شود. mode ناقص/disabled یا provider غیرفعال
همچنان attempt واقعی را با `SADAD_GO_LIVE_BLOCKED` رد می‌کند.

## ترتیب رسمی عملیات

```text
Merchant backend -> PaymentRequest -> Token
Patient browser  -> Purchase redirect
Sadad browser    -> merchant ReturnUrl by HTTP POST
Merchant backend -> Verify
Merchant backend -> paid/order/inventory effect only after successful Verify
```

Callback مرورگر webhook امضاشده نیست و نتیجه قطعی پرداخت محسوب نمی‌شود. هیچ کالا، رزرو موجودی،
Payment یا revenue صرفاً با callback موفق نمی‌شود.

## endpointهای خارجی سداد

| مرحله | Method | URL رسمی | نکته قراردادی |
|---|---|---|---|
| ساخت درخواست | `POST` | `https://sadad.shaparak.ir/api/v0/Request/PaymentRequest` | `application/json; charset=utf-8`؛ فقط server-to-server |
| انتقال خریدار | `GET` | `https://sadad.shaparak.ir/Purchase` | PDF فقط این path را نام می‌برد. query/path Token هنوز `UNCONFIRMED` است؛ نمونه .NET از `/Purchase/Index?token=...` استفاده می‌کند و هیچ‌کدام تا پذیرندگی allowlist runtime نیستند. |
| callback | `POST` | `ReturnUrl` متعلق به Mushroom | browser POST؛ endpoint سداد نیست و session/cookie بیمار منبع اعتماد نیست. |
| تأیید نهایی | `POST` | `https://sadad.shaparak.ir/api/v0/Advice/Verify` | `application/json; charset=utf-8`؛ فقط server-to-server |

هیچ URL دیگری از dashboard یا request کاربر پذیرفته نمی‌شود. URLها و redirect shape برای هر محیط در
adapter allowlist می‌شوند. تا تأیید redirect shape و acceptance environment، اتصال واقعی fail-closed است.

## PaymentRequest

### فیلدهای اجباری

| Field | نوع مستند | منبع مقدار | قاعده Mushroom |
|---|---|---|---|
| `MerchantId` | `String` | credential revision | write-only؛ هرگز response/log نمی‌شود. |
| `TerminalId` | `String` | credential revision | write-only؛ هرگز response/log نمی‌شود. |
| `Amount` | `Number` | adapter conversion | `RIAL` است؛ Mushroom `TOMAN` را فقط در adapter با ضرب صحیح `×10`، کنترل overflow و snapshot immutable به `providerAmount` تبدیل می‌کند. این mapping مجوز request واقعی نیست. |
| `OrderId` | `Number(Long)` | provider-order sequence | برای هر تراکنش یکتا و غیرتکراری؛ UUID داخلی Order مستقیماً ارسال نمی‌شود. |
| `LocalDateTime` | `DateTime` | injected server clock | profile فعلی `MM/dd/yyyy h:mm:ss tt` با `Asia/Tehran` و locale مستقل است. تأیید پذیرندگی برای محیط واقعی و `TransactionDate` همچنان gate است. |
| `ReturnUrl` | `String` | code-owned deployment config | HTTPS عمومی و ازپیش‌ثبت‌شده؛ URL ورودی کاربر نیست. |
| `SignData` | `String` | Sadad adapter | طبق الگوریتم زیر تولید می‌شود. |

### الگوریتم SignData درخواست

```text
plaintext = TerminalId + ";" + OrderId + ";" + Amount
key       = Base64Decode(TerminalKey)
SignData  = Base64Encode(TripleDES-ECB-PKCS7(UTF8(plaintext), key))
```

ترتیب فیلدها، جداکننده `;`، encoding و decimal-free integer representation بخشی از fixture سازگاری‌اند.
مقادیر نمونه باید synthetic باشند و credential واقعی وارد fixture یا Git نشود.

### فیلدهای اختیاری خارج از Phase 09

`AdditionalData`, `MultiplexingData`, `UserId`, `ApplicationName`, `PanAuthenticationType`,
`NationalCode`, `CardHolderIdentity`, `SourcePanList` و `NationalCodeEnc` در راهنما آمده‌اند، اما Phase 09
به آن‌ها نیاز ندارد. تا requirement مستقل، onboarding فعال و privacy review اضافه نشود، adapter آن‌ها را
ارسال نمی‌کند.

### پاسخ

| Field | قاعده |
|---|---|
| `ResCode` | provider code به‌صورت string canonical ذخیره می‌شود تا `-1` و تغییر type از بین نرود. |
| `Token` | فقط هنگام موفقیت request؛ secret/correlation حساس و غیرقابل log است. |
| `Description` | برای تشخیص داخلی؛ متن خام provider به client یا log عمومی منتقل نمی‌شود. |

`ResCode=0` همراه Token معتبر، attempt را `REDIRECT_READY` می‌کند. Token طبق راهنما عمر محدود و نامشخص
دارد و باید فوراً استفاده شود؛ TTL فرضی hardcode نمی‌شود. این transition فقط پس از رفع go-live gate و
تماس مجاز با provider رخ می‌دهد.

## redirect و callback

ReturnUrl قطعی Mushroom:

```text
POST /v1/payments/providers/sadad/callback
HTTP POST Form Data; allowlist: OrderId, Token, ResCode
```

نمونه رسمی PHP و تصمیم مالک، Form Data و casing allowlist را برای پیاده‌سازی dormant مشخص می‌کنند؛ این
evidence پذیرندگی جاری merchant نیست. endpoint runtime تا پذیرش همچنان fail-closed است و parser هیچ
فرمِ غیرallowlist یا JSON حدسی را فعال نمی‌کند. راهنما callback را با این فیلدها معرفی می‌کند:

```text
OrderId, HashedCardNo, PrimaryAccNo, SwitchResCode,
ResCode, CardHolderFullName, Token
```

Mushroom فقط `OrderId`, `Token`, `ResCode` و metadata ایمن موردنیاز correlation را پردازش می‌کند.
`PrimaryAccNo`, `HashedCardNo`, `CardHolderFullName` و payload کامل نه ذخیره و نه log می‌شوند. قواعد:

- `ResCode=0`: فقط Verify همان attempt آغاز/زمان‌بندی می‌شود.
- `ResCode=-1`: پرداخت از callback موفق فرض نمی‌شود؛ وضعیت امن نتیجه در app نمایش داده می‌شود.
- callback تکراری پس از نتیجه نهایی no-op است.
- mismatch در `OrderId` یا `Token` پرداخت را موفق نمی‌کند و به بررسی/reconciliation می‌رود.
- پاسخ endpoint یک `303 See Other` به result page ازپیش‌پیکربندی‌شده است؛ provider description یا secret
  وارد URL نمی‌شود.

## Verify

### درخواست

```text
Token    = token stored on the immutable PaymentAttempt
SignData = Base64Encode(TripleDES-ECB-PKCS7(UTF8(Token), Base64Decode(TerminalKey)))
```

### پاسخ

| Field | استفاده مجاز |
|---|---|
| `ResCode` | نتیجه provider؛ `0` و `100` success نهایی‌اند. |
| `Amount` | باید با providerAmount snapshot تطبیق داده شود. |
| `Description` | فقط diagnostic داخلی و redacted. |
| `RetrivalRefNo` | spelling مستند سداد حفظ می‌شود؛ برای receipt/support ذخیره می‌شود. |
| `SystemTraceNo` | برای receipt/support ذخیره می‌شود. |
| `OrderId` | باید با providerOrderId attempt برابر باشد. |
| `TransactionDate` | اختیاری و tolerant است؛ در صورت parse معتبر می‌تواند به UTC تبدیل شود، اما parse/missing/unknown timezone آن هیچ اثر مالی، Verify یا reconciliation را مسدود نمی‌کند. format/timezone production در Phase 12 acceptance می‌شود. |
| `CardHolderFullName` | در Phase 09 ذخیره یا log نمی‌شود. |

### نتیجه‌ها

| ResCode | معنی مستند | رفتار Mushroom |
|---|---|---|
| `0` | تراکنش موفق | پس از تطبیق Token/OrderId/Amount، یک اثر مالی idempotent. |
| `100` | Verify تکراریِ قبلاً موفق | همان نتیجه موفق؛ دقیقاً همان یک اثر مالی. |
| `-1` | پارامتر نادرست یا تراکنش ناموجود | موفق نیست؛ پارامترهای immutable بررسی و سپس failed یا reconciliation. |
| `101` | مهلت تراکنش پایان یافته | موفق نیست؛ retry بی‌پایان ممنوع و reservation طبق policy آزاد می‌شود. |
| بدون پاسخ | نتیجه مبهم | همان attempt و همان config revision با backoff دوباره Verify می‌شود؛ provider عوض نمی‌شود. |

راهنما می‌گوید اگر Verify فراخوانی نشود، مبلغ پس از ۱۵ دقیقه خودکار به دارنده کارت بازمی‌گردد. این رفتار
API refund یا دلیل کافی برای ثبت Refund موفق در Mushroom نیست.

## ResCodeهای PaymentRequest و سیاست خطا

راهنما کدهای زیر را فهرست می‌کند. متن کامل انسانی در PDF مرجع باقی می‌ماند؛ این قرارداد فقط action ایمن
سیستم را freeze می‌کند:

| دسته | کدها | action |
|---|---|---|
| success | `0` | Token لازم است؛ سپس redirect. |
| merchant/config/validation | `3`, `23`, `58`, `61`, `1000`, `1001`, `1003`, `1004`, `1012`, `1017`, `1018`, `1019`, `1020`, `1023`, `1024`, `1025`, `1026`, `1027`, `1028`, `1029`, `1030`, `1031`, `1032`, `1033`, `1036`, `1037`, `1053`, `1055`, `1072`, `1101`, `1103`, `1104`, `1040` | fail-closed؛ تغییر خودکار provider/credential/amount/OrderId ممنوع؛ alert و رفع تنظیمات/ورودی. |
| transient/provider availability | `1005`, `1006`, `1015`, `1056`, `1058`, `1064`, `1065`, `1066`, `1068` | فقط پس از policy تأییدشده با backoff روی همان attempt؛ موفق فرض نمی‌شود. |
| duplicate/ambiguous | `1002`, `1011`, `1061`, `1105` | OrderId جدید یا attempt دوم خودکار ساخته نمی‌شود؛ status امن و reconciliation/بررسی. |

تا تست acceptance، retry خودکار PaymentRequest از روی این دسته‌بندی فعال نمی‌شود؛ تنها retry صریحی که
راهنما الزام کرده، retry متد Verify در صورت عدم دریافت پاسخ است.

## اختلاف‌های راهنما و نمونه .NET

| مورد | راهنمای رسمی | نمونه .NET | تصمیم |
|---|---|---|---|
| redirect | `/Purchase` و استفاده از Token | `/Purchase/Index?token=...` | قبل از integration واقعی از پذیرندگی تأیید؛ adapter allowlist. |
| Verify response | شامل `TransactionDate` و `CardHolderFullName` | model نمونه این دو را ندارد. | schema tolerant ولی ذخیره PII ممنوع. |
| type کدها | بعضی جدول‌ها `Number` | model نمونه `string` | داخل سیستم string canonical. |
| نسخه | سربرگ `1.10`، تاریخچه دارای `1.11` | نمونه version pin ندارد. | نسخه جاری باید کتبی تأیید شود. |
| TLS و secret | الزام محرمانگی/IP/domain | SSL3 و cookie حاوی credential | فقط TLS جاری، secret server-side encrypted، بدون cookie. |

## گیت‌های لازم پیش از enable واقعی سداد — Phase 12

- evidence پذیرندگی محیط واقعی برای `Amount`/formula snapshot (mapping implementation از مالک تأیید شده است)
- تأیید نسخه جاری API و redirect URL/query shape
- تأیید Content-Type واقعی callback و casing فیلدها
- endpoint/credential محیط sandbox یا acceptance، یا برنامه تست کنترل‌شده production
- ثبت static egress IP و HTTPS callback domain
- تأیید format/timezone فیلدهای `LocalDateTime` و `TransactionDate`
- fixture رمزنگاری با credential synthetic یا test credential
- تست کدهای `0`, `100`, `-1`, `101`، timeout، duplicate callback، mismatch و no-log redaction
- مانیتور/alert برای create، Verify retry، reconciliation و clock skew

این گیت‌ها شرط sign-off نهایی‌اند. runtime صریح `live` همراه با revision رمزنگاری‌شده و enable/default مدیر، مسیر
پذیرش کنترل‌شده را فعال می‌کند؛ credential واقعی، PDF، نمونهٔ .NET و callback payload در Git، fixture، response،
log یا audit metadata قرار نمی‌گیرند.
