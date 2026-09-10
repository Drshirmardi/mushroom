# ADR-0009 — معماری چنددرگاهی پرداخت با شروع از سداد

- وضعیت: `ACCEPTED`
- تاریخ: `2026-09-10`
- تصمیم‌گیرندگان: `مالک محصول، Codex /root`
- فاز/task مرتبط: `Phase 09 / F09-T01, F09-T02, F09-T08, F09-T10, F09-T12`
- جایگزین ADR قبلی: `ندارد`

## Context

Phase 09 باید پرداخت واقعی فروشگاه را تحویل دهد، در حالی که محصول باید بتواند چند درگاه را بدون
وابسته‌کردن order، inventory یا revenue به SDK و قرارداد یک PSP پشتیبانی کند. درگاه نخست سداد است و
تنظیمات درگاه باید توسط ADMIN در dashboard مدیریت شود. نمونه رسمی .NET و راهنمای خرید سداد که مالک
محصول ارائه کرده، جریان `PaymentRequest → Token → Redirect → HTTP POST callback → Verify` را نشان
می‌دهند. همان راهنما IP و دامنه ازپیش‌ثبت‌شده، محرمانگی اطلاعات پذیرندگی، Verify پیش از تحویل کالا و
retry در صورت عدم دریافت پاسخ Verify را الزام می‌کند.

نمونه .NET فقط مرجع تطبیق پروتکل است و الگوی production نیست: اطلاعات پذیرندگی را در cookie نگه
می‌دارد، base URL را از ورودی می‌گیرد، OrderId تصادفی می‌سازد، جزئیات exception را نمایش می‌دهد و
idempotency یا persistence قابل اتکا ندارد. این رفتارها نباید وارد TypeScript/NestJS شوند.

## Decision

1. `commerce` مالک order/payment است و فقط با یک port خنثی نسبت به provider کار می‌کند. ساختار
   backend شامل payment orchestration service، provider registry، provider port و adapterهای اختصاصی
   است.
2. سداد تنها provider واقعی Phase 09 است. provider واقعی دوم ساخته نمی‌شود؛ یک fake provider فقط در
   contract test استقلال معماری را ثابت می‌کند.
3. هر `PaymentAttempt` هنگام ایجاد به یک `PaymentProviderConfigRevision` تغییرناپذیر متصل می‌شود.
   تغییر درگاه پیش‌فرض یا credential فقط revision جدید می‌سازد و attemptهای تاریخی را تغییر نمی‌دهد.
4. Phase 09 تنها یک provider فعال و پیکربندی‌شده را به‌عنوان default انتخاب می‌کند. تغییر provider وسط
   attempt، انتخاب provider توسط بیمار، priority routing و automatic failover خارج از scope هستند.
5. واحد محصول و commerce، تومان صحیح است. تبدیل به واحد موردنیاز provider فقط داخل adapter انجام و
   هر دو مقدار commerce و provider روی attempt snapshot می‌شوند. واحد مبلغ سداد تا تأیید کتبی
   پذیرندگی hardcode نمی‌شود و درگاه تا آن زمان production-ready محسوب نمی‌شود.
6. callback مرورگر authoritative نیست. فقط Verify موفق server-to-server می‌تواند Payment را موفق کند،
   reservation موجودی را capture کند و order/revenue effects ایجاد کند.
7. provider port قابلیت‌های پایه `createPayment`، `parseCallback` و `verifyPayment` را دارد. قابلیت‌های
   `inquiry`، `webhook`، `refund` و `partialRefund` جداگانه اعلام و فقط با سند provider فعال می‌شوند.
   برای سداد Phase 09 فقط create/callback/verify قطعی است.
8. تنظیمات provider از dashboard مدیریت می‌شود، اما endpointهای provider از allowlist داخل adapter
   می‌آیند و URL آزاد از dashboard پذیرفته نمی‌شود. Merchant/Terminal/Key در response یا log برگردانده
   نمی‌شوند.
9. credentialها به‌صورت versioned و write-only، با authenticated encryption در دیتابیس نگه‌داری
   می‌شوند؛ کلید اصلی رمزنگاری خارج از دیتابیس قرار می‌گیرد. تغییر config/credential دارای audit است.
10. `PaymentAttempt`، `Payment` و `Refund` lifecycle مستقل از Order lifecycle دارند. اثر مالی موفق در
    transaction و با unique/idempotency constraints حداکثر یک بار اعمال می‌شود.
11. قیمت store final و tax-inclusive است؛ `taxAmountToman=0` در نسخهٔ اول Order snapshot می‌شود و فاکتور
    رسمی مالیاتی خارج از scope است. `PICKUP` رایگان و `COURIER` با fee ثابت TOMAN ADMIN-managed، address و
    shipping snapshot immutable هستند؛ tracking دستی ADMIN است.
12. پیش از payment موفق، cancel فقط reservation را آزاد می‌کند. پس از payment، cancellation/return/refund
    فقط case-by-case و audited توسط ADMIN است؛ refund تا انتقال دستی بانکی و evidence/reference غیرحساس
    completed نمی‌شود و patient self-service refund ندارد.
13. عدم تأیید amount unit، protocol/environment، redirect، callback transport/date، egress IP/domain و
    credential سداد، `SADAD_GO_LIVE_BLOCKED` است: implementation عمومی Phase 09 را متوقف نمی‌کند، اما
    Sadad با `providerUnit=UNCONFIRMED` هرگز enabled/default یا متصل واقعی نمی‌شود.
14. credential revision لازم برای attemptهای non-terminal/reconciliation encrypted باقی می‌ماند و پس از
    terminal شدن تمام attemptهای وابسته و ۹۰ روز crypto-shred می‌شود؛ metadata/audit/reference مالی
    غیرحساس مطابق retention تاریخچه باقی می‌ماند.

## Alternatives Considered

- **اتصال مستقیم order service به سداد**: رد شد؛ افزودن provider بعدی منطق سفارش و تست‌ها را آلوده
  می‌کند.
- **پیاده‌سازی هم‌زمان چند درگاه واقعی**: رد شد؛ نیاز فعلی فقط سداد است و هزینه و ریسک بدون مصرف‌کننده
  واقعی ایجاد می‌کند.
- **نگه‌داری فقط `providerCode` روی attempt**: رد شد؛ rotation تنظیمات، قابلیت بازسازی و Verify تاریخی
  را می‌شکند.
- **automatic failover**: رد شد؛ timeout مبهم می‌تواند به دو attempt و پرداخت ناخواسته منجر شود.
- **اعتماد به callback**: رد شد؛ با راهنمای سداد و استاندارد مالی پروژه ناسازگار است.
- **ورود آزاد endpoint از dashboard**: رد شد؛ سطح SSRF و پیکربندی اشتباه production ایجاد می‌کند.

## Consequences

### پیامدهای مثبت

- افزودن provider بعدی بدون تغییر قواعد order/inventory/revenue ممکن است.
- rotation تنظیمات سابقه و Verify attemptهای قبلی را مخدوش نمی‌کند.
- callback تکراری، Verify تکراری و retry شبکه اثر مالی تکراری ایجاد نمی‌کنند.
- secret و endpoint provider از UI و log جدا می‌مانند.

### هزینه‌ها و trade-offها

- persistence و تست config revision، credential encryption و provider registry لازم است.
- order و payment state machine باید جدا ولی هماهنگ نگه داشته شوند.
- production سداد به static egress IP، callback domain ثبت‌شده و credential واقعی وابسته است.

### ریسک‌ها

- راهنمای ارائه‌شده سربرگ `1.10` دارد ولی تاریخچه آن ردیف `1.11` نیز نشان می‌دهد؛ نسخه، unit، redirect،
  callback/date transport و environment تا پذیرندگی `SADAD_GO_LIVE_BLOCKED` هستند.
- sandbox، refund، inquiry، webhook و partial-refund در سند ارائه‌شده تصریح نشده‌اند و capability آن‌ها
  `false` است؛ refund تجاری Phase 09 فقط manual/audited است.
- credential retention در `F09-T01` freeze شد: secret فقط برای attemptهای non-terminal/reconciliation و
  سپس تا ۹۰ روز بعد از terminal شدن آخرین attempt وابسته نگه‌داری و پس از آن crypto-shred می‌شود.

## Implementation Impact

- backend: `apps/api/src/modules/commerce/**`، Prisma schema/migration و integration tests
- dashboard: تنظیمات payment provider، وضعیت configured/default و audit-safe credential rotation
- app: initiation، redirect، result/status polling و order receipt؛ بدون دریافت secret
- قرارداد: `plan/contracts/commerce-payment-provider-v1.md`، `plan/contracts/sadad-ipg-v1.md` و generated
  OpenAPI client
- deployment: static egress IP، allowlisted callback domain، encryption master key و redaction
- observability: metricهای create/verify/retry/reconciliation بر اساس provider و بدون payload حساس

## Validation

- contract test یکسان برای Sadad adapter و fake provider
- fixture قطعی برای TripleDES/ECB/PKCS7 و Base64 با ورودی `TerminalId;OrderId;Amount`
- PostgreSQL integration برای idempotency callback/Verify و rotation config حین attempt
- تست `ResCode=0` و Verify تکراری `ResCode=100` به‌عنوان موفقیت نهایی
- تست route/field matrix رسمی، `OrderId` عددی یکتا، form callback، redaction و اختلاف redirect guide/sample
- تست timeout، retry و عدم failover به provider دیگر
- تست عدم بازگشت/log شدن credential و رد URL خارج allowlist
- browser E2E از checkout تا receipt فقط پس از Verify موفق

## Revisit Trigger

- درخواست اتصال provider واقعی دوم
- نیاز محصول به انتخاب درگاه توسط بیمار یا routing اولویت‌دار
- ارائه API رسمی refund/inquiry/webhook توسط سداد
- نیاز multi-clinic عملیاتی یا secret manager مرکزی در Phase 12
