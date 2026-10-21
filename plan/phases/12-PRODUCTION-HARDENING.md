# Phase 12 — Production Hardening

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `E — عملیات و انتشار`
- پیش‌نیاز: featureهای target release تکمیل شده باشند
- خروجی اصلی: release قابل استقرار، مشاهده، rollback و بازیابی است.

## Taskها

- [x] `F12-T02-I04` — Docker default network null IPAM recovery (2026-10-22), INSTALLATION-04, sole Codex /root. Depends on I01/I02/I03 DONE. Normalize null/missing Config/IPAM; retain existing network collision/retry behavior; redact unexpected CLI errors.38 cases:36 PASS/2 existing tool skips; actual Docker baseline/fix allocation/retry verified without network mutation. Evidence: phase-12 log F12-T02-I04; review PASS. Owner VPS resume remains external.

- [x] `F12-T02-I03` — Nominal VPS memory preflight correction (2026-10-22), INSTALLATION-03, sole Codex /root. Depends on I01/I02 DONE. Bounded10% MemTotal allowance for nominal4/2GiB hosts;3.8GiB dev accepted,2GiB dev refused,10GiB free-disk check retained.36 cases:34 PASS/2 existing tool skips on Ubuntu24.04 WSL, review PASS; fresh archive/checksum. Evidence: phase-12 log F12-T02-I03. Actual VPS deployment/performance remains external.

- [x] `F12-T02-I02` — Owner-reported installer terminal encoding recovery (2026-10-21), INSTALLATION-02, sole Codex /root. Depends on F12-T02-I01 DONE. Invalid terminal bytes retry visible/hidden prompts without accepting replacement characters; UTF-8 launchers and redacted actionable failures, updated standalone archive.34 tests PASS on disposable Ubuntu24.04, review PASS. Evidence: phase-12 log F12-T02-I02. Actual owner VPS retry remains external.

- [x] `F12-T02-I01` — Owner-authorized standalone server installer/manager and real-production CD (2026-10-21). INSTALLATION-01, sole Codex /root; depends on accepted F12-T02 artifact/manifest and migration contracts. Ubuntu 24.04 bootstrap, isolated environment/secrets, DNS/TLS, private-repo GitHub handoff, external production PostgreSQL, environment coverage and focused failure/retry checks. DONE, local software review PASS; evidence in phase-12 log F12-T02-I01. No live deployment or whole-product production acceptance.

Owner checkpoint (2026-10-21): pending initial-entry/Home/dashboard implementation and its shared API/schema contracts committed together on explicit request. Historical uncommitted notes below are superseded by this checkpoint. F12-FE01 remains REWORK/unchecked; recorded focused verification does not imply full production acceptance or live entry-policy activation.

Required initial patient entry (2026-10-21), same F12-FE01 /root/ADR0038: basic-only Persian registration, configured free published quiz, result acknowledgement then Home, gated private APIs/root navigation and dashboard entry-policy selection. Separate from medical consent/intake; started source and completion pinned, existing accounts grandfathered.79 fresh migrations/6 isolated API scenarios/17 units and App/API types PASS; whole dashboard types retain existing unrelated failures. Mobile/desktop synthetic visual flow reviewed; no real policy activation/patient mutation, uncommitted for review. Full task REWORK/unchecked. Evidence Phase12 log.

Home setup/status/actions (2026-10-21), same F12-FE01 /root:3 authoritative initial steps with aligned form/review and Home return; completed-profile/latest real result hero replaces setup, server-selected pending categories below. Additive Journey contract/legacy action preserved, no migration or real medical/payment mutation.12 focused units, App types and scoped live/simulated responsive browser checks pass; full task REWORK/unchecked, broader DB/clinical/provider/build acceptance deferred. Prior changes checkpointed b93b3be/3103f37/109f243; this implementation uncommitted for review. Evidence Phase12 log.

Store product workflow (2026-10-20), same owner-authorized F12-FE01 / CLIENT-INTEGRATION / sole /root: image-led grid/list and a single persistent product workspace (base fields, image, editorial content, SKU/pricing/inventory) implemented; archived products restore to DRAFT through the existing guarded PATCH. **IMPLEMENTED_UNVERIFIED**, owner review and all deferred execution gates pending; no DONE/final task commit. [Handoff](../logs/phase-12.md#store-product-workflow--implemented-unverified).

Dashboard archive stage 1 (2026-10-20), explicit extension of the same F12-FE01 / CLIENT-INTEGRATION sole /root scope: shell, local Vazirmatn, shared visual tokens, full existing navigation and real-reporting Home implemented; **IMPLEMENTED_UNVERIFIED — awaiting owner visual review**. All tests/typecheck/lint/build/automated browser gates deferred by owner; source/contract review only. Broader task remains REWORK/unchecked. No backend/dependency changes, graph rebuild, new batch or final task commit. [Stage handoff](../logs/phase-12.md#dashboard-archive-stage-1--implemented-unverified).

Integrated Home corrective (2026-10-20) supersedes the earlier Home visual checkpoint following explicit owner rejection: unified ice/glass design, separate complete transparent brain illustration, local IRANYekanX, no independent activity UI and redesigned access hub. Full-page mobile/desktop review, scoped browser gates, types/build and176 tests (temporary external alias) PASS; ready for owner visual review. [Current evidence](../logs/phase-12.md#f12-fe01--integrated-home-corrective-visual-review). F12-FE01 remains unchecked/REWORK for broader acceptance.

Home blue-brain glass checkpoint (2026-10-20): reviewed Home-only presentation, original unmodified image, compact mobile and expanded desktop; types/build and scoped browser checks PASS. Default Vitest has an existing billing alias-resolution failure; all176 pass with temporary external alias configuration. [Evidence](../logs/phase-12.md#f12-fe01--home-blue-brain-glass-checkpoint). F12-FE01 remains REWORK/unchecked for full acceptance.

Owner-requested scoped commit handoff: [commit/file map](../logs/client-integration-commits-2026-10-19.md); types/build/165 tests PASS, full acceptance remains unchecked.

Store audit first fixes01–05: types/170 tests/build and6 desktop/mobile E2E PASS (2026-10-20); [evidence and remaining06–20](../store-design-audit-2026-10-20.md). Full acceptance remains REWORK/unchecked.

Ordered Mezaj store extension (2026-10-20), same F12-FE01 /root: [commerce-mezaj-v1](../commerce-mezaj-v1.md),4×4 ordered pairs, exact published source-band links, audited self-only recommendation endpoint, dashboard matrix/editor and app personal rail. Isolated PostgreSQL28/28/no drift, API+consumer types/client freshness and6 browser cases PASS. Local additive migration applied; no real assignments invented. Broader task remains unchecked; final build/regression evidence in Phase12 log.

- [ ] `F12-FE01` — Owner-authorized patient-client API integration and Home/destination UI (2026-10-19), CLIENT-INTEGRATION, sole Codex /root. Home, notification sheet/category safety, TOPUP clarification, linked service/detail design and owner-requested white store/card refinement and local price-font preview and overflow-aware product-rail arrows and minimal session loading/error presentation with duplicate timed splash removed implemented; latest app types/165 tests/build and scoped live/synthetic mobile/desktop checks PASS. [Destination design evidence](../service-screens-verification.md), [connection limits](../home-client-verification.md), [integration scope](../client-integration.md). Full task REWORK/unchecked: real two-account/provider/clinical/legal acceptance remains separate. No final task commit or API/schema/provider activation/phase change.

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
- مالک محصول در `2026-10-11` خروج runtime سداد از حالت dormant را برای محیط VPS فعلی صریحاً تأیید کرد. انتخاب
  `SADAD_TRANSPORT_MODE=live` اعلام عملیاتی deployer است که callback عمومی، egress، redirect profile و secret
  encryption همان محیط آماده‌اند؛ این انتخاب به‌تنهایی provider کلینیک را فعال نمی‌کند.
- enable/default فقط با اقدام ADMIN در تنظیمات داشبورد انجام می‌شود. غیرفعال‌سازی ADMIN ایجاد attempt جدید را
  متوقف می‌کند، اما callback و Verify تلاش‌های از قبل ایجادشده را متوقف نمی‌کند. نبود runtime کامل یا provider
  فعال/default همچنان با `SADAD_GO_LIVE_BLOCKED` fail-closed می‌شود.

## Sadad production acceptance gate

برای sign-off نهایی production سداد، Phase 12 باید evidence غیرمحرمانهٔ موارد زیر را ثبت کند:

- environment و endpoint/redirect profile جاری;
- static egress IP و HTTPS callback domain/path ثبت‌شده;
- merchant/test credentials فقط در secret manager خارج از Git;
- controlled acceptance transaction با test plan;
- مشاهدهٔ واقعی callback Content-Type و field casing;
- validation عملی Amount/redirect/Verify، از جمله `TransactionDate` اختیاری و tolerant;
- monitoring و alert برای create، Verify retry، reconciliation و clock skew;
- production enable/default و merchant/product-owner sign-off.

این فهرست همچنان شرط پذیرش نهایی و ادعای production-ready بودن است. نرم‌افزار می‌تواند با mode صریح `live` و
فعال‌سازی ADMIN تراکنش کنترل‌شدهٔ پذیرش را اجرا کند؛ نتیجه redirect یا callback به‌تنهایی sign-off محسوب نمی‌شود.

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

- [x] `F12-T12-R13` — Existing main review/verification PASS, committed as 7b7bd43 on 2026-10-19. Historical evidence: 76 focused tests, API/test/app/dashboard types, generated contracts and targeted dashboard lint PASS; store-banner-review-v1, Phase12 log. Checklist/ownership synchronized with the observed commit during F12-FE01; no new banner verification claimed.

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
- [x] `F12-T12-R7` — تمام رکوردهای تنظیمات directory و scheduling از همان editor قابلیت ویرایش،
  فعال/غیرفعال‌سازی و حذف تأییدشده دارند؛ حذف رکورد وابسته پیام قابل اقدام می‌دهد و قرارداد سداد هر سه مقدار
  `merchantId`، `terminalId` و `terminalKey` را به‌صورت اجباری، write-only و رمزنگاری‌شده می‌پذیرد.
- [x] `F12-T12-R8` — تنظیمات پرداخت فهرست آداپتورهای واقعی رجیستری، وضعیت کلی پرداخت آنلاین، editor مستقل هر
  آداپتور، callback مشتق‌شده از API عمومی همان محیط، credential rotation و کنترل enabled/default را نمایش می‌دهد؛
  emergency disable همیشه مجاز است و activation سداد تا `goLiveReady` شدن fail-closed می‌ماند.
- [x] `F12-T12-R9` — runtime واقعی سداد با mode معتبر `disabled/live`، PaymentRequest و redirect واقعی، callback
  عمومی rate-limited، Verify مرجع، reconciliation timeout و کنترل مستقل enabled/default در داشبورد متصل شده است؛
  credential در revision رمزنگاری‌شده می‌ماند و راهنمای فعال‌سازی VPS ثبت شده است.
- [x] `F12-T12-R10` — خروجی کامپایل‌شدهٔ API در shared dev با اثرانگشت سورس خودش bind می‌شود؛ artifact بدون marker
  یا ناسازگار پیش از recreate شدن API به‌صورت تمیز rebuild می‌شود و اجرای مجدد همان SHA نیز stale dist را ترمیم می‌کند.
- [x] `F12-T12-R11` — تمام stageهای انتخاب‌شدهٔ bootstrap شامل client، Prisma، migration، compile و runtime config
  صریحاً از Compose عبور می‌کنند؛ تست قرارداد وجود هر flag را در environment کانتینر کنترل می‌کند.
- [x] `F12-T12-R12` — تغییر قرارداد versioned دیپلوی، state قبلی bootstrap را invalid می‌کند و generated clientها،
  Prisma، migrationهای idempotent، API artifact و runtime config را پیش از readiness دوباره reconcile می‌کند.

این change control migration، role expansion، multi-clinic switching یا guest cart را مجاز نمی‌کند.

## Change control — passwordless OTP and modular SMS delivery

مالک محصول در `2026-10-11` extension رسمی `F01-R06` را برای تکمیل احراز هویت passwordless و مدیریت provider پیامک
تأیید کرده است. قرارداد کامل، مرزها، معیارهای پذیرش و ترتیب وابستگی‌ها در
[`../contracts/otp-sms-auth-v1.md`](../contracts/otp-sms-auth-v1.md) freeze شده‌اند.

- [x] `F01-R06-A` — ADR، schema/migration، crypto/runtime، registry/adapter FarazSMS و API مدیریتی SMS/OTP.
- [x] `F01-R06-B` — engine OTP، endpointهای public auth، reuse session/account و OpenAPI/generated client.
- [x] `F01-R06-C` — UX OTP-first در web، مدیریت responsive در dashboard و evidence مرورگر/deployment.
- [x] `F01-R06-B-R1` — حفظ کدهای پایدار خطای API و تکمیل قرارداد OpenAPI/client و regression test فیلتر.

این change control قرارداد session در ADR-0001 را جایگزین نمی‌کند: verify موفق OTP همان access token، refresh cookie،
Origin/CORS، RBAC و rotation موجود را reuse می‌کند. تا زمانی که runtime `SMS_TRANSPORT_MODE=live` و credential واقعی
خارج از Git با اقدام ADMIN پیکربندی نشده، ارسال واقعی fail-closed باقی می‌ماند.

## Scoped development extension — Store product media (2026-10-14)

Product-owner authorization: [ADR-0015](../decisions/ADR-0015-store-product-media-development.md); contract [store-product-media-v1](../contracts/store-product-media-v1.md). Initial-release F12-T06 N/A and all existing production gates remain independent.

- [x] `F12-T06-R1` — Phase 04A backend product media foundation. Dependencies: F12-T06 DONE plus explicit storage re-entry (accepted). One primary image, private R2 adapter, safe multipart/processing, metadata migration, optimistic/idempotent upload/replace/remove, controlled public/admin reads, durable cleanup, additive OpenAPI/client and focused isolated PostgreSQL/mock-R2 tests. No real R2, deployment or UI. Completion is backend-only and does not declare Store media production-ready. Review PASS; evidence and Batch 01B handoff in [phase-12 log](../logs/phase-12.md#f12-t06-r1--store-product-media-backend-foundation).

- [x] `F12-T06-R2` — Phase 04B / Batch 01B dashboard product image uploader, explicitly approved 2026-10-14. Depends on F12-T06-R1 DONE (44d472e) and frozen media contract. Uppy Headless/XHR, existing Store editor/session/UI conventions, Persian RTL, authenticated previews, real progress, immutable mutation preconditions/idempotency and deliberate conflict handling; focused dashboard and deterministic mock-API browser verification. No backend/schema/customer UI/live R2/deployment changes. Review PASS; evidence and Phase04C handoff in [phase-12 log](../logs/phase-12.md#f12-t06-r2--dashboard-product-image-uploader).

Future eligible handoff after R2 acceptance: Batch 01C customer image UI; not started by R2. Initial-release envelope and production readiness remain independent.

- [x] `F12-T06-S1` — explicitly approved local real R2 acceptance before Phase04C. R1/R2 dependencies and ADR-0015 addendum satisfied; existing Dashboard/API/Prisma/adapter exercised against dev-sabz with disposable data. Upload/preview/public eligibility/replace/remove, ETag/idempotency replay, interrupted-response recovery, invalid-file/ownership checks and normal outbox cleanup PASS; three objects removed, six cleanup events DELIVERED. API13 + dashboard24 focused tests PASS. Scratch database/configuration/fixtures removed; original data and bucket settings preserved. Windows only; Linux, exclusive IAM-policy inspection and production requirements remain separate. Evidence: logs/phase-12.md F12-T06-S1. Phase04C not started.

## Product Details V1 — approved governance and planned batches (2026-10-14)

Authority: explicit owner architecture/governance approval; [ADR-0016](../decisions/ADR-0016-store-product-details-v1.md)
and [version 1.0 contract](../contracts/store-product-details-v1.md). This is a scoped Phase 12 extension,
not a reopened Phase 09 or new phase-management system. G01 authorized documentation only; the
separate B1A implementation instruction and evidence below govern its later acceptance. Initial-release boundaries and independent production
blockers remain unchanged. The split below is owner-approved staged delivery; B1A/B1B alone do not
declare a completed cross-application feature.

### Checklist and dependency order

- [x] `F12-PD-G01` — ADR/contract/task governance finalization; documentation-only review PASS;
  implementation NOT_STARTED. Evidence: [G01](../logs/phase-12.md#f12-pd-g01--product-details-v1-architecture-approval-and-governance).
- [x] `F12-PD-B1A` — Product content backend foundation; batch `PD-B1A`; DONE, Codex /root;
  review PASS, claim RELEASED 2026-10-14; [evidence/handoff](../logs/phase-12.md#f12-pd-b1a--product-content-backend-foundation).
  Depends on G01 DONE, accepted Commerce/media baselines and frozen B1 contract.
- [x] `F12-PD-B1B` — Dashboard product-content editor; batch `PD-B1B`; DONE, Muse Spark;
  review PASS, claim RELEASED 2026-10-14; [evidence/handoff](../logs/phase-12.md#f12-pd-b1b--dashboard-product-content-editor).
  Depends on B1A DONE, accepted Commerce/media baselines and frozen B1 contract.
- [x] `F12-PD-B1B-R1` — independent B1B review corrective: prevent conflict auto-rebase/full-field
  overwrite and preserve unsaved content across token refresh; DONE, Codex /root, PD-B1B-R1;
  review PASS WITH FIXES, claim RELEASED 2026-10-14. Depends on B1B/8ebfdbe.
  [Reproductions/verification](../logs/phase-12.md#f12-pd-b1b-r1--focused-conflict-and-session-review-corrections).
  Mocked acceptance only; real backend acceptance remains separate. No later batch started.
- [x] `F12-PD-B1C` — Customer PDP real content and demo-claim retirement; batch `PD-B1C`; DONE, Muse Spark;
  review PASS, claim RELEASED 2026-10-14; [evidence/handoff](../logs/phase-12.md#f12-pd-b1c--customer-product-details-integration).
  Depends on B1A/B1B DONE and their generated contract/editor acceptance.
- [ ] `F12-PD-B2` — Category templates, typed attributes, variants/availability and order integrity;
  batch `PD-B2`; BLOCKED_OWNER_DECISIONS until B1C DONE, explicit initial category definitions and
  the B2 contract appendix are approved/frozen. Architecture approval is not definition approval.

The next eligible implementation candidate after accepted B1A is B1B; it still needs an explicit
instruction to start, a fresh eligibility/ownership check and normal STATUS claim. No batch automatically follows
G01 or any completed implementation batch. One agent/no subagents applies to these planned batches.

### B1A — exact scope and owned paths

Shared optional Product brand/manufacturer/short/full description/ingredients/usage/warnings/
contraindications; additive columns/provenance/revision/approval metadata; legacy preservation;
strict content save/read/approve API; legacy create/PATCH description integration; permission and
clinic ownership; atomic revision/approval/audit; centralized public projection; stable errors;
OpenAPI and generated client. No Dashboard/customer source, templates, SKU/checkout/order/media,
R2 runtime, existing migrations, auth-role expansion or dependencies change.

Planned exclusive writer paths: `apps/api/prisma/schema.prisma`, one new owned migration under
`apps/api/prisma/migrations/`, `apps/api/src/modules/commerce/catalog/**`, directly required catalog
projection code under `apps/api/src/modules/commerce/cart/**`, `apps/api/src/common/errors/api-error.ts`,
focused API tests, `packages/api-client/openapi.json`, `packages/api-client/src/schema.generated.ts`.
Coordinator-only plan paths: STATUS, this phase checklist and phase-12 evidence. A required path
outside this set must be reviewed/reassigned before editing, not treated as blanket Commerce ownership.

Acceptance: isolated PostgreSQL clean replay and upgrade preserve every legacy description/status/order;
new content stays pending; source/nonempty approval rules; omitted/null/no-op behavior; strict and legacy
write invalidation; approval/edit races and stale revisions; anonymous/non-admin/foreign-resource denial;
no draft/provenance leaks through list/detail/cart/wishlist; stable error/OpenAPI freshness; API/client
targeted checks and focused regression tests. Record exact commands/results; no broad monorepo tests.
Review and independent task commit required. Backend-only foundation is not full V1 acceptance.

### B1B — exact scope and owned paths

Depends on accepted B1A API/client. Existing Store editor presents fields, provenance, revision/status,
explicit save versus approve and visibility warning. Persian RTL, accessible input/error feedback,
session refresh, preserved unsaved form and deliberate conflict reload. No implied medical/brand
certification. No API/schema/generated-client/media-uploader/template/customer changes.

Planned paths: directly relevant `apps/dashboard/src/features/store/**`, existing Store API wrapper
and focused dashboard/editor tests; coordinator plan/evidence only. Confirm precise wrapper/test paths
at claim; exclude Uppy/image editor implementation from source writes.
Acceptance: validation/null/clear/save/approval flow, failure recovery, stale-revision conflicts,
role/resource denial, no automatic approval, existing media editor regression; focused dashboard
typecheck/tests plus scoped desktop/mobile/RTL/keyboard browser validation using development fixtures.
Review/evidence/task commit required before B1C.

### B1C — exact scope and owned paths

Depends on B1A/B1B DONE. Customer PDP uses embedded approved content and preserved legacy description,
omits pending/null sections and removes fabricated ratings/counts/reviews/Q&A/seller verification/
satisfaction/warranties/hardcoded specifications. Retire corresponding fake seller claims in cart.
Preserve real product/media/pricing, cart/wishlist/navigation and unrelated banners/offers/assets.
No UGC, seller, warranty or campaign API; no SKU selection/templates/checkout changes.

Planned paths: `apps/app/src/app/(public)/store/products/[id]/page.tsx`, directly affected
`apps/app/src/components/store/**`, `apps/app/src/stores/product-extras.ts` and its affected consumers/tests,
existing Store API wrapper only for generated-type adoption, focused customer tests; coordinator plan/evidence.
Acceptance: approved/pending/legacy/no-content fixtures; no visible or accessible fabricated claims;
no extra editorial fetch waterfall; escaped content; image/no-store/fallback unchanged; real API handling,
cart/wishlist regressions, Persian RTL/accessibility and mobile/desktop browser evidence. Report any
unavailable real fixture separately. Review/evidence/task commit required; B1 content slice accepted here.

### B2 — exact scope, pending decisions and acceptance gates

After B1C, owner approves actual initial categories/fields, scope, units, required/allowed values,
meaningful variant keys and health-attribute approval linkage. Freeze the B2 API/migration appendix
including bounds and publication/category-transition rules before eligibility/claim.

Implement immutable database template versions and exact product pins; typed bounded JSONB Product/SKU
values; scope/type/unit/duplicate validation; transactional repin/category validation; admin template
and attribute editors; manual SKU creation/selection; per-SKU availability and selected-SKU continuity
in customer cart/wishlist; additive immutable SKU-title/variant order-line snapshots and versioned
order-payload/read compatibility. No generator/EAV/scripts/filter engine or personalized clinical content.

Planned exclusive shared paths: Prisma/new migrations, relevant Commerce catalog/cart/inventory read/
checkout snapshot/order-response code, stable errors and generated API/client; existing dashboard Store
and customer Store surfaces/tests. Exact claim must enumerate the narrow paths before work and keep
one writer for schema, OpenAPI and shared contracts. Existing inventory/payment authority is preserved.

Acceptance: definition validation/version immutability/FK scoping; duplicate/wrong-type/scope/unit rejection;
missing required values; category/repin rollback; legacy/no-template products; approval-linked health
attributes; chosen-SKU title/attributes/price/availability/cart/reservation agreement; immutable meaningful
order snapshots after later catalog edits; old/new snapshot and previous-application compatibility;
additive migration/upgrade/rollback; checkout idempotency/stock races; focused API/dashboard/customer
checks and end-to-end variant/order fixtures. New differentiated multi-SKU purchasing cannot be enabled
before the snapshot compatibility gate passes. B1 never silently changes checkout. Final review,
evidence and task commit are mandatory; no production-readiness claim follows from this development slice.

## Wallet shared-payment backend — owner-requested extension (2026-10-16)

Authority: explicit backend implementation request after wallet planning, including full payment before final booking and ADMIN credit/debit/set balance from patient detail. [ADR-0017](../decisions/ADR-0017-shared-wallet-backend.md), [frozen backend contract](../contracts/wallet-billing-v1.md).

- [x] `F12-WAL-BE01` — all backend persistence/ledger/admin adjustments/shared payment/top-up/order/appointment/refund/reporting/authorization/OpenAPI and isolated verification. DONE; WAL-BE01 review gate PASS; Codex /root; single writer; claim released. One inseparable financial shared-contract operation replaces the proposal's backend G01/G02/B01–B05 task split. [Evidence](../logs/phase-12.md#f12-wal-be01--shared-wallet-and-prepaid-booking-backend), [handoff](../contracts/wallet-backend-handoff.md). Frontend and live rollout remain separate and are not complete.

## Patient Journey backend — owner-authorized technical correction (2026-10-16)

Authority: explicit owner implementation request after the patient journey review. Backend-first scope; no closed phase reopened. [ADR-0018](../decisions/ADR-0018-patient-journey-assessment-reliability.md), [additive contract](../contracts/assessment-reliability-v1.md), [implementation routing](../patient-journey-backend.md).

- [x] `F12-PJ-R01` — assessment start/save/submit concurrency, optional revision preconditions, same-resource idempotency, transactional sensitive audit and valid-source Mezaj read. Batch PJ-R01 DONE/released; Codex /root single writer/reviewer. 78 focused API tests + 5 client tests, 43-migration fresh/legacy/duplicate-refusal checks, no drift, generated contracts and consumer types PASS. [Evidence](../logs/phase-12.md#f12-pj-r01--assessment-concurrency-revisions-and-transactional-audit). No clinical/scoring/publication/booking policy, frontend or billing/provider changes. This is the first technical slice of the brief's assessment foundation, not acceptance of all its requirements.

## معیار خروج (initial release, unchanged)

- [x] `F12-PJ-M01` — DONE/review PASS/released; draft-only configurable dimension scoring, original 11-question/44-option preset, 16 unreviewed result display profiles and admin synthetic preview.65 focused API/domain +client5/types/generated PASS; evidence Phase12 log. ADR-0035/mizaj-draft-preview-v1. No patient/runtime/payment/protocol contract change or clinical release.

- [x] `F12-PJ-PG04` — DONE/review PASS/released; exact named custom request/scoped care authority, custom-program-request-care-v1/ADR-0033.21 new PostgreSQL cases;216 distinct focused API12 files+client5/fresh65/populated130-table preservation/no drift/official API/types PASS; evidence Phase12 log. No custom charge/chart access/native therapy.
- [x] `F12-PJ-PG05` — DONE/review PASS/released; custom-program-native-delivery-v1/ADR-0034; shared PROGRAM right and assigned reviewed native TreatmentPlan/tasks/progress with bound generic access protection.23 new PostgreSQL cases;251 distinct focused API16 files+client5/fresh73/populated132-table preservation/no drift/types PASS; evidence Phase12 log. Backend only; actual clinical/legal/provider/frontend release gates remain.

- [x] `F12-PJ-C04` — DONE/review PASS/released; shared two-beneficiary payment/private existing engine/retained mutual joint education, safe patient offering discovery and Home; couple-assessment-paid-access-v1/additive discovery/ADR-0027.30 new PostgreSQL cases,332 distinct focused API+client5/fresh56/123-table upgrade/no drift/types PASS; evidence phase-12 log. Actual clinical/legal/frontend/provider release remains separate.
- [x] `F12-PJ-D01` — DONE/review PASS/released; explicit retained patient/source/assigned-physician/appointment consent and bounded educational summary, assessment-assigned-care-context-v1/ADR-0028.19 new PostgreSQL+CLI purpose case;135 distinct focused API11 files+client5/fresh58/124-table upgrade/no drift/types PASS; evidence phase-12 log. No default clinical capability, actual legal content or automated clinical review.
- [x] `F12-PJ-D02` — DONE/review PASS/released; narrow assigned-physician worklist/context/start/complete facade over existing appointment/Encounter/text support; assigned-consultation-operations-v1/ADR-0029. Current physician/specialty/view/edit/sign and strict assignment;14 new PostgreSQL cases,142 distinct focused API12 files+client5/fresh58/no drift/types PASS; evidence phase-12 log. No blanket appointment management/new consultation engine/default grant or voice/video.
- [x] `F12-PJ-PG01` — DONE/review PASS/released; versioned reviewed educational program/professional service definitions, program-definition-v1/ADR-0030. One version ledger/migration59;19 new PostgreSQL cases,127 focused API10 files+client5/fresh59/populated126-table preservation/no drift/types PASS, evidence Phase12 log. Reuse G01 and directory/TreatmentPlan; no sale/entitlement/patient therapy in this foundation.
- [x] `F12-PJ-PG02` — DONE/review PASS/released; immutable configurable program commercial publication/owner terms/access period, program-commercial-publication-v1/ADR-0031. One publication ledger/migration60;18 new PostgreSQL+CLI purpose case,144 focused API11 files+client5/fresh60/populated127-table preservation/no drift/types PASS, evidence Phase12 log. No patient charge/entitlement or automatic therapy.
- [x] `F12-PJ-PG03` — DONE/review PASS/released; ready educational program shared purchase/proved access/owned Home, ready-program-purchase-access-v1/ADR-0032. Existing free/wallet/server Verify reused; custom charge/delivery stays separately gated.30 new PostgreSQL cases;222 distinct focused API16 files+client5/fresh63/populated128-table preservation/no drift/types PASS; evidence Phase12 log. Only READY_EDUCATION fulfilled.

- [x] `F12-PJ-C03` — DONE/review PASS/released; exact independent couple participation consent/final privacy withdrawal, couple-assessment-participation-v1/ADR-0026.16 new PostgreSQL cases;115 focused API+client5/fresh53/121-table upgrade/no drift/types PASS; evidence Phase12 log. No charge/grant/shared result generation.

- [x] `F12-PJ-C02` — DONE/review PASS/released; qualified exact versioned joint educational protocol, couple-result-protocol-v1/readiness addendum/ADR-0025.15 new PostgreSQL cases;129 focused API+client5/fresh52/120-table upgrade/no drift/types PASS; evidence Phase12 log. Paid couple participation and actual medical/legal release remain separate.

- [x] `F12-PJ-P02` — DONE/review PASS/released; shared paid individual assessment purchase/access/existing engine integration; assessment-purchase-access-v1/privacy-retirement addendum/ADR-0024.23 new real PostgreSQL cases;306 focused API+client5/fresh51/upgrade/no drift/types PASS; evidence Phase12 log. No couples checkout/actual medical or legal content/provider activation/full-product acceptance.

- [x] `F12-PJ-O03` — DONE/review PASS/released; configurable exact draft/protocol/terms commercial publication; assessment-commercial-publication-v1/ADR-0023.18 new PostgreSQL cases;227 focused API+client5/fresh49/upgrade/no drift/types PASS, evidence Phase12 log. No patient checkout/entitlement/provider activation; actual legal/clinical text unseeded.

- [x] `F12-PJ-O02` — DONE/review PASS/released; append-only exact assessment protocol physician review; assessment-protocol-review-v1/ADR-0022.19 new PostgreSQL cases;208 focused API+client5/fresh48/upgrade/no drift/types PASS; evidence Phase12 log. No new algorithm/questionnaire editor, paid activation or real consent text.

- [x] `F12-PJ-P01` — DONE/review PASS/released; PJ-P01, Codex /root; typed shared billing target effects, billing-target-effects-v1.52 focused API +client5/types/freshness PASS, evidence Phase12 log; financial behavior preserved, digital activation later.

- [x] `F12-PJ-G02` — DONE/review PASS/released; PJ-G02, Codex /root; exact assessment educational mapping and own guidance delivery, assessment-guidance-v1;187 focused API +client5/fresh47/upgrade/no drift/types PASS, evidence Phase12 log. G01/directory/audit reused; no actual clinical taxonomy/new engine/paid activation.

- [x] `F12-PJ-G01` — DONE/review PASS/released; PJ-G01, Codex /root; immutable educational snapshots and physician-only publication, guidance-content-v1/ADR-0021. 18 new PostgreSQL cases;167 focused API +client5/fresh46/upgrade/no drift/types PASS; evidence Phase12 log. Backend-only, no clinical content invented or seeded; mappings later.

- [x] `F12-PJ-C01` — adult independent couple account-link/invitation/linking-consent foundation; PJ-C01 DONE/review PASS/released, Codex /root; ADR-0020/couple-account-link-v1/privacy addendum. Owner age18/nonexpiry; no private answer/result/payment processing or actual legal-text publication. 140 focused API + client5/fresh45/upgrade/no drift/types PASS, evidence phase-12 log. Registered recipient address+phone, independent auth and explicit consent required; no ordinary phone membership oracle.

- [x] `F12-PJ-R03` — technical questionnaire authoring/scoring-structure validation, concurrent version/state edits and atomic audit; PJ-R03 DONE/review PASS/released, Codex /root; assessment-authoring-reliability-v1. Three pre-fix defects reproduced; 106 focused API + client5/type/freshness checks PASS, evidence phase-12 log. No clinical algorithm, schema or permission change.

- [x] `F12-PJ-O01` — append-only individual/couples offering draft configuration and release-readiness blockers; PJ-O01 DONE/review PASS/released, Codex /root; ADR-0019/assessment-offering-drafts-v1. 72 focused API + client5, fresh44/upgrade/no drift/generated/consumer checks PASS; evidence phase-12 log. Publication disabled, no invented clinical/commercial policies or runtime billing change.

- [x] `F12-PJ-R02` — owned assessment discovery, exact historical questionnaire and persisted technical scoring provenance; PJ-R02 DONE/review PASS/released, Codex /root; assessment-discovery-v1. 60 focused API + client5 tests and generated/consumer types PASS; evidence phase-12 log. Preserved existing historic commands; no clinical algorithm invention, new schema or frontend.

- [x] `F12-PJ-J01` — self-only derived Patient Journey/Next Action API; PJ-J01 DONE/review PASS/released, Codex /root; contract patient-journey-v1. 45 focused API + 5 client tests, generated contracts/consumer types PASS; evidence in phase-12 log. No journey table, frontend or new clinical/provider policy. Owner explicitly authorizes serialized continuation beyond independent task commits.

- SLO/capacity با evidence ثبت شده است.
- restore و rollback موفق ثبت شده‌اند.
- alertها owner و runbook دارند.
- هر datastore یا زیرساخت اضافی با bottleneck واقعی توجیه شده است.

- [x] `F12-PJ-J02` — DONE/review PASS/released; exact medical purpose/locale/clinic/current matching consent in admin patient projections/read/correction;18 new PostgreSQL cases,87 distinct focused API11 files and types PASS; evidence Phase12 log. No schema/API/default grant changes.

- [x] `F12-PJ-R04` — DONE/review PASS/released; exclude paid private contexts from generic admin patient detail per accepted P02; two new actual paid/engine cases,103 focused API6 files/types PASS; evidence Phase12 log. No schema/API/default grant changes.

F12-FE01 payment follow-up checkpoint (2026-10-20): Home now distinguishes the exact Journey payment purpose/amount and multiple requests; wallet-pay confirms authoritative cancellation with a Home return. Original owner intent confirmed CANCELLED, Home referenced another intent. Types/17 focused units/2 intercepted desktop-mobile cancellation flows PASS; evidence in logs/phase-12.md. Financial rules/priority unchanged, no real financial writes. Full task remains REWORK/unchecked.

F12-FE01 optional top-up correction (2026-10-20): owner clarification supersedes payment presentation-only checkpoint. Journey no longer promotes voluntary TOPUP to Home next action; actual service payments remain independently selected beyond preview caps. Existing pending data/money preserved. API/test/app types,15 isolated PG cases and2 desktop/mobile cases PASS; live Home result action confirmed. Evidence Phase12 log; full task REWORK/unchecked.

F12-FE01 compact Home personal-access rail (2026-10-20): owner-requested native horizontal RTL scroll at narrow widths, all links fit when wide.320–1440/keyboard/destinations/no whole-page overflow checks PASS; evidence Phase12 log. Task remains REWORK/unchecked.

F12-FE01 Store header polish (2026-10-20): owner-requested cart icon and responsive search hint complete; types and320–1440 browser checks PASS, evidence Phase12 log. Task remains REWORK/unchecked.

F12-FE01 owner-requested commit checkpoint (2026-10-20): completed reviewed payment/Home/Store session work committed in related groups; final178 app tests PASS. Broader production acceptance unchanged, task remains REWORK/unchecked; evidence Phase12 log.

F12-FE01 assessment administration (2026-10-20): same CLIENT-INTEGRATION /root batch, IMPLEMENTED_UNVERIFIED. Full multi-section/five-type scalar authoring, bounded dimension draft/preview, server pagination, real booking policy/results and ADMIN offering/publication/protocol/guidance/couple connections implemented. Existing physician/consent/privacy/release gates preserved; missing list-query OpenAPI metadata documented/generated. System Design template artifact rendered separately. Source/contract review only; owner review and all application runtime gates deferred. Evidence: logs/phase-12.md#assessment-administration--implemented-unverified. Task remains unchecked/REWORK, no final commit.

F12-FE01 Mizaj11+1 (2026-10-20): same CLIENT-INTEGRATION /root batch, IMPLEMENTED_UNVERIFIED. Dedicated dashboard main/matched tie-case/results/rules authoring and real exact-hash ADMIN simulation; isolated schema3 draft,11 mandatory main answers and at most one exact-set tie-break (max12). Existing v1/v2/patient release controls preserved. Scope/contract: ../assessment-mizaj-11plus1.md; handoff in phase log. No execution verification or final acceptance; task remains unchecked/REWORK, no final commit.

F12-FE01 owner-requested storage checkpoint (2026-10-20): shell/Home,product lifecycle,product workspace,assessment API/contracts,assessment dashboard and System Design artifacts committed separately; coordinator documentation records commit map in phase log. Explicit checkpoint authorization only; IMPLEMENTED_UNVERIFIED stages and REWORK/unchecked task remain. All deferred runtime gates/owner review still pending; no push or new batch.

F12-FE01 assessment modal/delete (2026-10-20): same CLIENT-INTEGRATION /root batch. Native management dialog retains assessment list; draft deletion from main list uses permission/clinic/locked current hash/audited transaction and existing Restrict/immutable constraints. Published/retired/referenced versions protected; published archive retained. IMPLEMENTED_UNVERIFIED; tests/types/lint/build/browser deferred, source review only. Evidence phase log; task remains REWORK/unchecked, no new final commit.

F12-FE01 archived assessment deletion (2026-10-21): owner supersedes draft-only deletion restriction. DRAFT/RETIRED may be explicitly deleted only without references, exact hash/clinic/ADMIN/locks/audit maintained; PUBLISHED and all reference/history constraints protected. New additive migration20261021090000 permits RETIRED DELETE only; all UPDATE immutability unchanged. Applied successfully to configured local database after confirming only this migration pending; no record deleted. IMPLEMENTED_UNVERIFIED; execution checks still deferred and task REWORK/unchecked. Evidence phase log.

F12-FE01 assessment deletion error routing (2026-10-21): registered three new deletion domain errors in central allowlist/OpenAPI/client so the global filter preserves the precise reason instead of CONFLICT. Scoped read-only reference diagnosis: all5 current archived versions have submission history; some have Mezaj results. Deletion constraints retained, no delete attempted. Filter regression test source added but not executed; stage IMPLEMENTED_UNVERIFIED/task REWORK, execution gates remain deferred.

F12-FE01 assessment hold-to-delete (2026-10-21): browser deletion confirm replaced with deliberate1.5s continuous pointer/touch/Enter/Space hold and progress on button. Release/leave/cancel/blur/hidden/disable/unmount cancels; repeat presses do not duplicate action. Existing API/reference constraints retained. IMPLEMENTED_UNVERIFIED, timer regression source added but not run; UI/runtime checks deferred and task REWORK/unchecked.

F12-FE01 assessment checkpoint commits (2026-10-21): explicit owner request saved guarded delete/API/contracts as c797d07 and modal/hold/dashboard as0629386, plus documentation handoff. Source/staged whitespace review only; deferred verification not executed. IMPLEMENTED_UNVERIFIED, task REWORK/unchecked; owner review/authorized checks remain next.

F12-FE01 Home-aligned Store preview (2026-10-21): implemented local ice/teal/glass catalog identity, decorative glass storefront intro, integrated search/address, soft shortcuts, real product-card image/price/details hierarchy and matching results/empty/error/personalization surfaces. Same existing routes/data/actions; full skin catalog-scoped, shared card footer reaches existing Store consumers. IMPLEMENTED_UNVERIFIED; owner explicitly defers repeated tests and reserves final review. No tests/types/build/browser/Graphify/commit; task remains REWORK/unchecked. Handoff: logs/phase-12.md#store-identity-aligned-with-home--implemented-unverified.

F12-FE01 Store card/upload standard (2026-10-21): square image geometry, responsive card widths and aligned footer implemented; actual upload contract and1600-square preparation guide recorded. Source-only, owner final review pending; no execution checks, task remains REWORK/unchecked.


F12-FE01 11+1 publication/runtime and small-screen hold (2026-10-21): IMPLEMENTED_UNVERIFIED. Owner checkpoint commits4f5f363/a12f04d on front; new local hold fix keeps label geometry/capture/touch cancellation stable. Schema3 exact qualified physician draft-review/publication and patient11+at-most-one server-selected follow-up/result connected, active approval/revision/idempotency/history protections retained. Local additive migration20261021100000 applied successfully; OpenAPI/client source regenerated. No actual review/publication/deletion/patient answer mutation. Physician frontend and real clinical content/approval remain release prerequisites; paid/couple/guidance/care scalar contracts not expanded. Domain/integration test sources added but all execution checks remain deferred; task REWORK/unchecked, no final acceptance or new batch. Handoff: logs/phase-12.md#assessment-111-publication-and-small-screen-hold--implemented-unverified.

F12-FE01 assessment connection simplification (2026-10-21): IMPLEMENTED_UNVERIFIED; corrected paginated services contract/items/server filters and pagination, deferred regression source added; unsupported11+1 commercial/band/couple forms hidden and legacy optional functions retained behind explicit settings. Content-review terminology and advanced reference input simplified; no backend authority change. ADR0022 originally gates paid commercial publication, whereas prior continuation added a general11+1 gate; that separate product-policy decision remains pending. Source-only review, all execution gates deferred, REWORK/unchecked. Handoff logs/phase-12.md#assessment-connection-simplification--implemented-unverified.

F12-FE01 ADMIN educational11+1 publication (2026-10-21): owner explicitly supersedes general physician gate; ADR0036. Existing ADMIN authoring/publication now requires complete structure only; free patient progression uses actual published source/self-access, result ADMIN_PUBLISHED without fabricated physician approval. Dashboard readiness/copy/controls synchronized; commercial/paid boundaries retained separately. No migration/real publication; regression sources revised but all runtime/test/type/lint/build/browser/Graphify checks deferred. IMPLEMENTED_UNVERIFIED, task REWORK/unchecked. Handoff logs/phase-12.md#admin-111-publication--implemented-unverified.

F12-FE01 restore full assessment settings (2026-10-21): owner rejects hiding offering/connection forms. Full tabs/forms restored for11+1, default offerings, accurate engine and real draft-save contract; ordinary ADMIN publication remains free of physician approval IDs. Unsupported11+1 paid/band-guidance/couple activation remains explicit rather than faked; existing legacy commercial contract preserved. Source-only review; all checks deferred, IMPLEMENTED_UNVERIFIED/REWORK/unchecked. Handoff logs/phase-12.md#restore-full-assessment-settings--implemented-unverified.

F12-FE01 delete assessment with retained results (2026-10-21): owner-authorized terminal DELETED lifecycle (ADR0037); hide authoring/new-use source, retain complete patient submissions/Mezaj/snapshots/source/FKs and historical reads. Published deletion enabled, required booking source clears atomically with audit. Local additive20261021120000 applied; source generations complete; focused regression sources updated, all execution checks deferred. IMPLEMENTED_UNVERIFIED/REWORK/unchecked, no actual assessment deletion or final commit. Handoff logs/phase-12.md#assessment-delete-with-retained-results--implemented-unverified.
