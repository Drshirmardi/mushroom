# Phase 12 — Production Hardening

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `E — عملیات و انتشار`
- پیش‌نیاز: featureهای target release تکمیل شده باشند
- خروجی اصلی: release قابل استقرار، مشاهده، rollback و بازیابی است.

## Taskها

- [x] `F12-T01` — target release، SLO، traffic profile و environment strategy
- [x] `F12-T02` — deployment provider، container/IaC و staging pipeline
- [x] `F12-T03` — load test auth/onboarding/assessment/booking/encounter و featureهای release — `DONE: frozen mixed/chat profiles and disposable invariants accepted; see phase-12 evidence`
- [x] `F12-T04` — query/index، pool و timeout tuning — `DONE: measured no-change decision; release query plans and bounded-pool/timeout recovery evidence recorded`
- [ ] `F12-T05` — backup policy، RPO/RTO و restore drill PostgreSQL — `BLOCKED: Liara WAL/archive/restore capability evidence required`
- [x] `F12-T06` — object storage retention/restore در صورت استفاده
- [ ] `F12-T07` — secrets management و key rotation drill
- [x] `F12-T08` — dependency/container/security scan و abuse scenarios — `DONE: corrective bounded Prisma transitive overrides passed compatibility, abuse and final production-audit gates (0 critical, 0 high)`
- [ ] `F12-T09` — observability dashboard، frontend error tracking و alert runbook
- [ ] `F12-T10` — low-downtime migration و rollback exercise
- [ ] `F12-T11` — incident response و breach workflow exercise
- [ ] `F12-T12` — browser/device/accessibility release matrix
- [ ] `F12-T13` — production readiness review و sign-off

## Change control — Sadad target-release software completion

مالک محصول در `2026-09-30` extension رسمیِ `F12-T02` را بدون بازگشایی Phase 09 تأیید کرد. این extension
تنها پس از claim عادی Phase 12 اجرا می‌شود و شامل تکمیل gapهای واقعی مسیر سداد است: transport، wiring
request/redirect/callback/Verify به orchestration موجود، timeout/ambiguous response، retry، reconciliation،
idempotency، validation/configuration، مستندسازی placeholderهای `.env.example` و تست‌های موفق/ناموفق.

مرزها و وابستگی‌ها:

- adapter/callback/provider-config/orchestration موجود ابتدا باید inventory شود؛ پیاده‌سازی یا contract پذیرفته‌شدهٔ
  Phase 09 نباید دوباره ساخته شود.
- ownership، acceptance criteria، single-writer resources و verification این extension در baseline SpecKit به
  `F12-T02` و taskهای هم‌بستهٔ `F12-T03`، `F12-T07`، `F12-T09` و `F12-T13` map می‌شوند.
- credentialهای سداد در revisionهای رمزنگاری‌شدهٔ فعلی می‌مانند. کلید encryption خارج از database و Git نگهداری
  می‌شود و rotation آن نباید revisionهای پیشین را ناخوانا کند. `.env.example` فقط نام/توضیح/validation placeholder
  دارد؛ `.env` یا مقدار واقعی gate پذیرندگی را دور نمی‌زند.
- `SADAD_GO_LIVE_BLOCKED` تا evidence پذیرندگی، تأیید کتبی static outbound egress IP لیارا، endpoint/callback،
  credential خارج از Git و sign-off باقی می‌ماند. IP ورودی یا اختصاصی جایگزین static outbound IP نیست.
- provisioning، خرید، credential واقعی، اتصال خارجی، enable/default و deploy در این change control یا baseline
  مجاز نیستند. اگر لیارا static outbound egress مناسب را تأیید نکند، مالک پروژه تصمیم جایگزین را می‌گیرد و provider
  خودکار تغییر نمی‌کند.

## Sadad production acceptance gate

پیش از هر enable/default یا اتصال واقعی سداد، Phase 12 باید evidence غیرمحرمانهٔ موارد زیر را ثبت کند:

- environment و endpoint/redirect profile جاری;
- static egress IP و HTTPS callback domain/path ثبت‌شده;
- merchant/test credentials فقط در secret manager خارج از Git;
- controlled acceptance transaction با test plan;
- مشاهدهٔ واقعی callback Content-Type و field casing;
- validation عملی Amount/redirect/Verify، از جمله `TransactionDate` اختیاری و tolerant;
- monitoring و alert برای create، Verify retry، reconciliation و clock skew;
- production enable/default و merchant/product-owner sign-off.

تا این gate، `SADAD_GO_LIVE_BLOCKED` برای activation/runtime باقی می‌ماند؛ اما completion نرم‌افزاری Phase 09
و taskهای بعدی آن را مسدود نمی‌کند.

## معیار خروج

- SLO/capacity با evidence ثبت شده است.
- restore و rollback موفق ثبت شده‌اند.
- alertها owner و runbook دارند.
- هر datastore یا زیرساخت اضافی با bottleneck واقعی توجیه شده است.
