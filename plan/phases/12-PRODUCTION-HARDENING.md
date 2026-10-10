# Phase 12 — Production Hardening

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `E — عملیات و انتشار`
- پیش‌نیاز: featureهای target release تکمیل شده باشند
- خروجی اصلی: release قابل استقرار، مشاهده، rollback و بازیابی است.

## Taskها

- [x] `F12-T01` — target release، SLO، traffic profile و environment strategy
- [x] `F12-T02` — deployment provider، container/IaC و staging pipeline — `DONE: provider-neutral Distroless artifacts plus private-GHCR publication, immutable manifest, automatic non-production staging, owner-dispatched production-sim promotion and application-only rollback are implemented and locally verified; live VPS baseline/two-update/rollback evidence remains an explicit F12-T13 sign-off gate`
- [x] `F12-T03` — load test auth/onboarding/assessment/booking/encounter و featureهای release — `DONE: frozen mixed/chat profiles and disposable invariants accepted; see phase-12 evidence`
- [x] `F12-T04` — query/index، pool و timeout tuning — `DONE: measured no-change decision; release query plans and bounded-pool/timeout recovery evidence recorded`
- [ ] `F12-T05` — backup policy، RPO/RTO و restore drill PostgreSQL — `BLOCKED: Liara WAL/archive/restore capability evidence required`
- [x] `F12-T06` — object storage retention/restore در صورت استفاده
- [ ] `F12-T07` — secrets management و key rotation drill — `BLOCKED: written Liara managed-secret-store capability and authorized environment drill evidence required`
- [x] `F12-T08` — dependency/container/security scan و abuse scenarios — `DONE: corrective bounded Prisma transitive overrides passed compatibility, abuse and final production-audit gates (0 critical, 0 high)`
- [ ] `F12-T09` — observability dashboard، frontend error tracking و alert runbook
- [x] `F12-T10` — low-downtime migration و rollback exercise — `DONE: disposable 32-migration replay, Phase 09→10 forward upgrade and previous/current/previous application rollback rehearsal accepted; see phase-12 evidence`
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

## Change control — provider-neutral deployment artifact

مالک محصول در `2026-10-02` extension اصلاحی مستقلی را زیر `F12-T02` تأیید کرد. خروجی release باید artifactهای
OCI provider-neutral برای API، web، app و dashboard باشد: non-root، قابل اجرای یکسان روی Liara، Linux VPS با Docker
Compose و OCI PaaS. Liara فقط profile عملیاتی نخست است و هیچ SDK/API یا branch runtime provider-specific وارد
application نمی‌شود.

- envelope پشتیبانی‌شده: Linux/OCI، PostgreSQL `16+`، HTTPS reverse proxy با WebSocket upgrade، outbound HTTPS و
  secret استاندارد environment یا file-mounted؛ compose توسعه دست‌نخورده می‌ماند و مثال production به PostgreSQL
  خارجی متصل است. runner نهایی هر چهار artifact، digest رسمی تأییدشدهٔ Distroless Node 24 Debian 13 non-root است و
  با UID/GID عددی `65532:65532` اجرا می‌شود؛ Node 24 slim فقط stage build است.
- URLهای عمومی Next هنگام شروع container و فقط در runtime config عمومی نوشته می‌شوند؛ هیچ secret در آن نیست و یک
  image digest بدون rebuild از staging به production/provider دیگر promotion می‌شود. API و هر Next server `PORT` و
  `HOSTNAME` runtime را می‌پذیرند.
- migration یک فرمان یک‌باره از API artifact است و به startup عادی وصل نمی‌شود. realtime صریحاً تک‌instance است؛
  multi-instance تا adapter توزیع‌شدهٔ Socket.IO/session با approval و verification مستقل BLOCKED می‌ماند.
- profile لیارا فقط port، health، domain، secret injection و gate static outbound egress را مستند می‌کند؛ این
  change-control provisioning، deployment واقعی، secret واقعی یا اتصال Sadad را مجاز نمی‌کند.
- ADR-0011، release envelope، SpecKit task map و evidence corrective باید پیش از پذیرش هم‌گام شوند. image build،
  smoke/health/migration و container scan روی artifact واقعی gate پذیرش این extension هستند؛ نتیجهٔ dependency scan
  پذیرفته‌شدهٔ F12-T08 بدون دلیل تکرار نمی‌شود.

## Change control — browser session continuity and public commerce catalog

مالک محصول در `2026-10-08` دو corrective مستقل release را تأیید کرد؛ Phase 01، Phase 09 و Phase 11 بازگشایی
نمی‌شوند و هر corrective باید commit و evidence مستقل داشته باشد.

- [x] `F01-R05` — access token حافظه‌ای app/dashboard پیش از درخواست محافظت‌شده از refresh single-flight معتبر
  می‌شود؛ عمر ده‌دقیقه‌ای access token و deadline مطلق ۲۴ساعته/۳۰روزه session تغییر نمی‌کند. `401` authentication
  است و فقط `403` به‌عنوان permission denial نمایش داده می‌شود.
- [x] `F09-T04-R1` — فهرست، جست‌وجو و جزئیات محصول فعال برای کلینیک فعال release عمومی است؛ cart، wishlist،
  address، checkout، order و payment همچنان authentication، ownership و authorization فعلی را حفظ می‌کنند.

## Change control — dashboard operational truthfulness

مالک محصول در `2026-10-10` اصلاح داشبورد عملیاتی را تأیید کرد. این corrective زیر ماتریس مرورگر/دستگاه
`F12-T12` اجرا می‌شود و backend، schema، نقش‌ها یا قابلیت‌های deferred را گسترش نمی‌دهد.

- [x] `F12-T12-R3` — شمارنده‌ها و affordanceهای ساختگی از داشبورد حذف شدند؛ routeهای mock/deferred در منوی
  عملیاتی دیده نمی‌شوند و در مراجعه مستقیم داده آزمایشی نمایش نمی‌دهند؛ Audit قابل کشف است؛ CRM و گفتگو از
  scopeهای واقعی API استفاده می‌کنند؛ خطا از empty state جداست و پوسته در viewport باریک منوی قابل کنترل دارد.
- [x] `F12-T12-R4` — تنظیمات داشبورد قرارداد انتشار directory را به جریان قابل مشاهدهٔ تخصص → پزشک → خدمت →
  تعرفه → ساعت کاری تبدیل می‌کند؛ پیش‌نویس‌های موجود مسیر تکمیل دارند، mutationها خطای پایدار و نتیجه refresh را
  نمایش می‌دهند و فرم‌های تعرفه، ساعت، تعطیلی و مرخصی state مستقل دارند.
- [x] `F12-T12-R5` — queryهای لیستی تنظیمات داشبورد با سقف pagination پذیرفته‌شدهٔ API (`pageSize=50`) هم‌راستا
  هستند و تست رگرسیون URL تمام منابع directory و scheduling را کنترل می‌کند.
- [x] `F12-T12-R6` — صفحهٔ تنظیمات ابتدا نمای کلی و کارت‌های دسته‌بندی read-first نشان می‌دهد؛ فرم‌های تغییر فقط
  در editor متمرکز، keyboard-accessible و واکنش‌گرا برای دسکتاپ و موبایل باز می‌شوند.

این change control migration، role expansion، multi-clinic switching، guest cart یا تغییر payment را مجاز نمی‌کند.

## معیار خروج

- SLO/capacity با evidence ثبت شده است.
- restore و rollback موفق ثبت شده‌اند.
- alertها owner و runbook دارند.
- هر datastore یا زیرساخت اضافی با bottleneck واقعی توجیه شده است.
