> PATIENT UI WORKTREE COORDINATION: read authoritative X:/Git/mushroom/plan/STATUS.md before any claim/write; stop if inaccessible. PUI-B02/PUI-T02 DONE after review; central claim released after task commit, Codex /root, feat/patient-app-ui; plan/patient-ui.md. No independent branch-local registry.
# وضعیت زنده اجرای پروژه

> این فایل فقط وضعیت فعلی، ownership، blocker و handoff کوتاه را نگه می‌دارد. شواهد taskهای
> تکمیل‌شده در [`logs/`](logs/README.md) ثبت می‌شوند؛ checklist کامل هر فاز نیز در فایل همان
> فاز منبع حقیقت است.

## وضعیت کلی

- آخرین به‌رورسانی: `2026-10-12`
- Milestone فعال: `Milestone E — Phase 12 IN_PROGRESS`
- فاز فعال: `Phase 12 — Production Hardening`
- وضعیت فاز فعال: `IN_PROGRESS`
- batch فعال: ندارد
- task فعال: ندارد
- blocker فعال: `F12-T05 BLOCKED — Liara WAL/archive/restore capability evidence is absent.`؛ `F12-T07 BLOCKED — written Liara managed-secret-store/rotation capability evidence is absent.`

## پیشرفت کلان

- [x] Monorepo با pnpm workspace و Turborepo ایجاد شده است.
- [x] سایت عمومی `apps/web` پیاده‌سازی ظاهری شده است.
- [x] اپ کاربر `apps/app` پیاده‌سازی ظاهری و mock شده است.
- [x] داشبورد `apps/dashboard` پیاده‌سازی ظاهری و mock شده است.
- [x] بک‌اند NestJS پایه ایجاد شده است.
- [x] PostgreSQL و migration پایه ایجاد شده‌اند.
- [x] احراز هویت واقعی جایگزین mock شده است.
- [x] onboarding پزشکی و consent واقعی شده‌اند.
- [x] آزمون اصلی و eligibility قابل تنظیم واقعی شده‌اند.
- [x] اولین جریان end-to-end رزرو نوبت کامل شده است.
- [x] اطلاعات بالینی واقعی شده‌اند.
- [ ] فروشگاه و پرداخت واقعی شده‌اند.
- [x] چت واقعی شده است.
- [ ] production readiness تأیید شده است.

## وضعیت فازها

- [x] `Phase 00` — Foundation — `DONE` — checklist: [`phases/00-FOUNDATION.md`](phases/00-FOUNDATION.md)
- [x] `Phase 01` — Identity & Access — `DONE` — checklist: [`phases/01-IDENTITY-ACCESS.md`](phases/01-IDENTITY-ACCESS.md)
- [x] `Phase 02` — Patient Onboarding & Consent — `DONE`
- [x] `Phase 03` — Assessment Engine & Booking Eligibility — `DONE`
- [x] `Phase 04` — Clinic, Doctors, Services & Availability — `DONE (CLOSED)`
- [x] `Phase 05` — Appointment Booking & Dashboard Operations — `DONE (CLOSED)`
- [x] `Phase 06` — Encounter & Clinical Workspace — `DONE (CLOSED)`
- [x] `Phase 07` — Prescription & Treatment — `DONE (CLOSED)`
- [x] `Phase 08` — Follow-up, Health Tracking, Notifications & Content — `DONE (CLOSED)`
- [x] `Phase 09` — Commerce, Inventory & Payments — `DONE (CLOSED)`
- [x] `Phase 10` — Chat & Online Consultation — `DONE (CLOSED)`
- [x] `Phase 11` — Dashboard Reporting & Access Expansion — `DONE (CLOSED)`
- [ ] `Phase 12` — Production Hardening — `IN_PROGRESS`
- [ ] `Deferred` — AI, Bots & Advanced Automation — خارج از roadmap اجرایی فعلی

## handoff فاز فعال

## آخرین batch تکمیل‌شده — F01-B06-B-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-12 Asia/Tehran`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `F01-R06-B` / `F01-R06-C` و قرارداد freeze‌شدهٔ `contracts/otp-sms-auth-v1.md`.

- Task ID: `F01-R06-B-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F01-R06-B DONE` و قرارداد OTP/SMS پذیرفته‌شده.
  - Scope: حفظ کدهای خطای OTP/SMS از فیلتر HTTP، انتشار پاسخ‌های OTP در OpenAPI/client و regression test.
  - Owned paths: `apps/api/src/common/errors/api-error.ts`، `apps/api/src/modules/identity/presentation/http/auth.controller.ts`، `apps/api/test/**`، `packages/api-client/openapi.json`، `packages/api-client/src/schema.generated.ts`، `apps/web/src/services/auth.ts`، `plan/STATUS.md`، `plan/phases/12-PRODUCTION-HARDENING.md`، `plan/logs/phase-12.md`.
  - Shared/exclusive resource: API error registry و generated OpenAPI/client، single-writer.
  - Expected verification: filter regression، API test typecheck، OTP integration در صورت وجود DATABASE_URL، OpenAPI runtime drift/client generation، frontend typecheck/test و `git diff --check`.
  - Contract: هر کد خطای literal که از API پرتاب می‌شود باید در registry بماند؛ مقدارهای غیرخطا مثل role code وارد enum نمی‌شوند. رفتار fallback برای کد ناشناخته حفظ می‌شود.
  - Review: PASS — کدهای error literal ثبت شدند؛ OTP error responses در OpenAPI مستند و client بازتولید شد؛ fallback ناشناخته حفظ شد.
  - Verification: API typecheck، filter/OpenAPI/OTP integration و treatment-plan integration، client test/build و web typecheck/test پاس شدند. اجرای کل API suite شکست‌های مستقل reminders/database fixtures/config داشت که در `plan/logs/phase-12.md` ثبت شده‌اند.
  - Commit: در این handoff ایجاد می‌شود.
  - Next eligible work: F12 blockers و ترتیب جاری Phase 12؛ batch جدیدی در این handoff شروع نمی‌شود.

## آخرین batch تکمیل‌شده — F01-B06-C

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `F01-R06-B` commit `492d934` and generated OTP/admin API contract.

- Task ID: `F01-R06-C`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F01-R06-A` and `F01-R06-B DONE`.
  - Scope: OTP-first/password-secondary web UX, responsive dashboard SMS/provider/policy/log UX, frontend regressions and deployment observation.
  - Owned paths: `apps/web` auth UI/service/tests, dashboard SMS settings/API/settings integration and final coordinator evidence.
  - Shared/exclusive resource: generated client is frozen by B; no schema/API change in this task.
  - Review: PASS — ورود و ثبت‌نام OTP-first هستند، password روش ثانویه و session/redirect موجود را reuse می‌کند؛ داشبورد provider/policy/log را بدون secret read-back مدیریت می‌کند.
  - Verification: web 13/13، dashboard 75/75، typecheckهای web/dashboard/API، Chrome OTP E2E (2/2) و build webpack هر دو frontend پاس شدند؛ Turbopack در sandbox روی CSS-worker port bind محدود بود.
  - Deployment: GitHub Action `38173139936` برای commit `23ffeae` در `2026-10-12` PASS شد؛ shared-dev API readiness و `/login` هر دو پاسخ موفق دادند. تا تنظیم runtime live و credential توسط ADMIN، OTP عمداً fail-closed است.

## آخرین batch تکمیل‌شده — F01-B06-B

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `F01-R06-A` commit `6dc106b` and the frozen OTP/SMS contract.

- Task ID: `F01-R06-B`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F01-R06-A DONE`.
  - Scope: HMAC OTP engine, rate-limit/idempotency/concurrency, passwordless account provisioning, session reuse, public endpoints and generated client.
  - Owned paths: identity OTP/session code, auth controller/DTOs, OTP integration tests and OpenAPI/generated client.
  - Shared/exclusive resource: identity session infrastructure and generated API contract are single-writer resources.
  - Expected verification: API typecheck, PostgreSQL integration including single-use concurrency, password regression and OpenAPI drift.
  - Review: PASS — OTP code فقط در memory ارسال، verifier به‌صورت HMAC، consume اتمیک و provisioning بدون credential جعلی انجام می‌شود؛ session همان زیرساخت موجود است.
  - Verification: PostgreSQL integration single-use/concurrency، 18 تست regression رمز/session، API test typecheck و OpenAPI generated-client drift پاس شدند.
  - Next eligible batch: `F01-B06-C` برای web/dashboard UX و evidence نهایی.

## آخرین batch تکمیل‌شده — F01-B06-A

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: [`contracts/otp-sms-auth-v1.md`](contracts/otp-sms-auth-v1.md), owner-authorized OTP/SMS change control.

- Task ID: `F01-R06-A`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: no active batch; contract frozen by the owner.
  - Scope: ADR/change control, independent SMS schema/migration, credential encryption/runtime configuration, FarazSMS port/registry and ADMIN provider/policy backend.
  - Owned paths: `apps/api/prisma/**`, `apps/api/src/modules/communications/sms/**`, API runtime/config/error wiring, deployment env/secret contract, `apps/api/package.json`, lockfile, and coordinator plan files.
  - Shared/exclusive resource: Prisma, API module wiring, environment contract and lockfile are single-writer resources.
  - Expected verification: migration replay/generate, SMS unit and admin authorization tests, API typecheck/build, deployment-env contract and `git diff --check`.
  - Review: PASS — schema، AES-256-GCM keyring، runtime fail-closed، registry واقعی FarazSMS و API صرفاً ADMIN با credential write-only پیاده شدند.
  - Verification: PostgreSQL 16 migration replay، API typecheck، SMS security tests، release/dev deployment contracts و shell syntax پاس شدند.
  - Next eligible batch: `F01-B06-B` برای OTP engine و public auth/OpenAPI.

## آخرین batch تکمیل‌شده — F12-B12-R12

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: a change to the versioned bootstrap/deployment contract invalidates prior stage state and must
re-run idempotent migrations plus all generated runtime artifacts before service readiness is accepted.

- Task ID: `F12-T12-R12`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: F12-T12-R11 flag propagation and live refresh `500` evidence after stale migration state.
  - Scope: include the deployment orchestrator in the runtime fingerprint and make runtime-contract changes reconcile
    API client, Prisma generation/migrations, API compilation and frontend runtime config.
  - Owned paths: `deploy/vps/deploy-dev.sh`, dev deployment contract tests, and coordinator plan files.
  - Shared/exclusive resource: existing versioned migrations may only run via idempotent `prisma migrate deploy`; no
    schema or application auth contract changes.
  - Expected verification: dev/release deployment contract suites, shell syntax, `git diff --check`, push, API health
    and authenticated refresh observation.
  - Review: PASS — the orchestrator is part of the runtime fingerprint and any runtime-contract change forces the
    complete idempotent bootstrap reconciliation before all services are recreated and probed.
  - Verification: dev VPS regression, release pipeline contract, shell syntax and `git diff --check` passed.
    Post-push migration/refresh observation remains the external acceptance gate.

## آخرین batch تکمیل‌شده — F12-B12-R11

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: every build stage selected by `deploy-dev.sh` must be explicitly present in the bootstrap container
environment; host-shell flags are not assumed to cross the Compose boundary.

- Task ID: `F12-T12-R11`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: F12-T12-R10 artifact fingerprinting and live failure evidence from run `38113797757`.
  - Scope: pass all selected dependency/client/Prisma/migration/API/runtime-config stages into bootstrap and lock the
    Compose boundary with a regression contract.
  - Owned paths: `deploy/vps/compose.dev.yaml`, deployment contract tests, and coordinator plan files.
  - Shared/exclusive resource: no database schema, application runtime contract, secret value or provider call changes.
  - Expected verification: deployment contract suites, shell syntax, `git diff --check`, then push and VPS readiness.
  - Review: PASS — all eight bootstrap controls are now declared at the Compose environment boundary, including the
    API source fingerprint; the contract suite asserts each mapping independently.
  - Verification: full release pipeline contract, dev VPS sync regression, shell syntax and `git diff --check` passed.
    Post-push shared-dev readiness remains the external acceptance observation.

## آخرین batch تکمیل‌شده — F12-B12-R10

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: a shared-dev API artifact is runnable only when its recorded source fingerprint matches the current
API inputs; a missing or stale artifact must trigger a clean compile before the API container is recreated.

- Task ID: `F12-T12-R10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R9 live Sadad runtime and the existing incremental shared-dev deployment.
  - Scope: bind the API dist artifact to its source fingerprint, clean stale output before compilation, and add a
    regression proving a same-source rerun repairs an incoherent artifact rather than starting stale JavaScript.
  - Owned paths: `deploy/vps/{deploy-dev.sh,dev-service.sh,compose.dev.yaml}`, deployment contract tests, and
    coordinator plan files.
  - Shared/exclusive resource: no runtime secret value, database, payment credential or provider call is changed.
  - Expected verification: shell syntax, dev VPS deployment contract regression, release pipeline contract and
    `git diff --check`, followed by push and shared-dev readiness observation.
  - Review: PASS — the API dist directory is cleaned before compilation, receives its source SHA-256 marker only
    after a successful emit, and any absent/mismatched marker forces compile plus API recreation on a same-source rerun.
  - Verification: dev VPS sync regression and release pipeline contract checks passed; shell syntax and
    `git diff --check` passed. Post-push shared-dev readiness remains the external acceptance observation.

## آخرین batch تکمیل‌شده — F12-B12-R9

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: deployment mode proves that the server is permitted to contact Sadad; encrypted provider revisions
snapshot `RIAL` readiness; an authorized dashboard administrator remains the sole owner of enabled/default state.
Disabling stops new attempts while callbacks for already-created attempts remain processable.
Coordinator-only files: Prisma/OpenAPI client, `plan/STATUS.md`, phase checklist/log.

- Task ID: `F12-T12-R9`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Sadad protocol adapter/orchestration, F12-T12-R7 credential contract and F12-T12-R8 adapter controls.
  - Scope: replace the dormant Sadad runtime with an explicit disabled/live deployment mode; wire real attempt,
    redirect, callback and Verify orchestration; derive readiness from validated runtime configuration; keep final
    enable/default and emergency disable in dashboard settings; return a redirect URL to the patient app.
  - Owned paths: Sadad/payment services, controllers, DTOs/config/module wiring and tests under `apps/api`; payment
    page/API under `apps/app`; payment settings status under `apps/dashboard`; deployment env/compose documentation;
    generated OpenAPI/client artifacts; coordinator plan files.
  - Shared/exclusive resource: OpenAPI/generated client single-writer; no credential values, external payment call,
    production environment mutation or database migration in the repository task.
  - Expected verification: config/adapter/unit tests, PostgreSQL integration when available, API/app/dashboard
    typecheck and focused tests, OpenAPI drift check, disabled-mode regression and `git diff --check`.
  - Review: PASS — runtime only selects the real bounded HTTPS transport under validated `live` configuration;
    ADMIN enable/default remains independent, callback/Verify can finish after an administrative disable, and only a
    matching successful Verify produces the single payment/order/inventory effect. Callback input is allowlisted and
    rate-limited, unknown/timeout outcomes remain reconciliation-safe, and concurrent attempt reuse keeps one OrderId.
  - Verification: clean PostgreSQL 16 replayed all `33` migrations and seed; live provider-config integration `1/1`
    and disabled checkout/payment integration `2/2` passed. API TypeScript plus focused `27/27`, OpenAPI `7/7`, app
    `52/52`, dashboard `75/75`, generated-client drift/typecheck and `git diff --check` all passed.
  - External next action: deploy this commit, set the documented non-secret runtime values on the VPS using the exact
    merchant-confirmed redirect profile, enter/rotate the three credentials in Dashboard, enable/default Sadad, then
    execute the controlled low-value acceptance transaction. No real credential or Sadad transaction was used here.

## آخرین batch تکمیل‌شده — F12-B12-R8

Coordinator/Thread: `Codex /root`
Started at: `2026-10-11 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: the dashboard lists the provider registry dynamically, exposes each adapter's code-owned
configuration and callback guidance, and controls enabled/default state through the existing authorized API. Sadad
activation remains fail-closed while `goLiveReady=false`; deactivation and credential rotation remain available.
Coordinator-only files: `plan/STATUS.md`, phase checklist/log.

- Task ID: `F12-T12-R8`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R7 payment credential contract and the Phase 09 provider registry/config API.
  - Scope: replace the single-form payment editor with adapter cards and a focused adapter detail view; show current
    public API callback/back-link and provider redirect information; connect enable/disable and default-provider
    controls to the existing API; preserve stable activation blockers and write-only credential rotation.
  - Owned paths: `apps/dashboard/src/features/settings/payment-provider-settings.tsx`,
    `apps/dashboard/src/lib/{api.ts,commerce-payment-provider-api*}`, provider-state service/tests under
    `apps/api/src/modules/commerce/payments/` and relevant dashboard/API tests; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: no database, migration, API route, OpenAPI, generated client, credential-storage,
    runtime transport or payment-attempt change.
  - Expected verification: payment adapter URL/state unit tests, dashboard test/typecheck/lint, responsive read-only
    browser inspection when environment permits, and `git diff --check`.
  - Review: PASS — registry results are rendered as adapter cards; the selected adapter exposes environment-specific
    callback, technical endpoints, write-only credential rotation and state controls. Disabling all adapters provides
    the payment-wide off action; per-adapter disable also clears stale default state. Enable/default controls remain
    unavailable when the server reports `goLiveReady=false`.
  - Verification: dev runtime config confirms `apiUrl=https://dev-api.roxco.ir`, callback helper tests cover dev and
    staging origins, dashboard TypeScript/ESLint and `75/75` tests across `22` files pass, API test TypeScript and
    OpenAPI contract `7/7` pass, and `git diff --check` passes. Post-push shared-dev inspection remains external.
  - External next action: push `dev`, observe deployment, and inspect adapter list/detail at desktop/mobile widths.

## batch تکمیل‌شده — F12-B12-R7

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: every settings entity exposes its accepted lifecycle (create, edit, activate/deactivate and guarded
delete); Sadad configuration requires write-only `merchantId`, `terminalId` and `terminalKey` as one encrypted revision.
Coordinator-only files: `plan/STATUS.md`, phase checklist/log, runtime OpenAPI and generated API client.

- Task ID: `F12-T12-R7`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Phase 04 directory/scheduling CRUD, Phase 09 payment credential encryption, and F12-T12-R6.
  - Scope: connect the existing update/delete endpoints for every dashboard settings category with explicit edit,
    deactivate and confirmed-delete UX; map dependency conflicts to actionable feedback; define and validate the three
    Sadad credential fields in backend/OpenAPI/client and replace the ambiguous dashboard secret input.
  - Owned paths: `apps/dashboard/src/features/settings/**`, `apps/dashboard/src/lib/directory-settings-api*`,
    `apps/api/src/modules/commerce/payments/**`, relevant API tests, `packages/api-client/{openapi.json,src/schema.generated.ts}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: OpenAPI/generated client single-writer; existing encrypted credential storage is reused;
    no migration, payment enablement, role or permission change.
  - Expected verification: API unit/integration and OpenAPI checks, generated-client drift check, dashboard adapter/UI
    tests, API/dashboard typecheck/lint, desktop/mobile browser inspection, mutation safety review and `git diff --check`.
  - Review: PASS — تمام رکوردهای directory/scheduling اکنون edit، activate/deactivate و confirmed delete دارند؛
    delete وابسته با `DIRECTORY_RECORD_IN_USE` به غیرفعال‌سازی هدایت می‌شود. فرم سداد سه فیلد صریح دارد و API
    همان سه مقدار را اجباری و write-only اعتبارسنجی و در credential revision رمزنگاری می‌کند.
  - Verification: API test TypeScript، OpenAPI contract `7/7`، generated client build، dashboard TypeScript/ESLint،
    dashboard `73/73` test در `22` فایل و `git diff --check` پاس شدند. build پیش‌فرض Next در sandbox هنگام bind
    پردازشگر CSS Turbopack با `Operation not permitted` متوقف شد؛ این محدودیت محیط است و typecheck/lint/test پاس است.
  - External next action: push `dev` و مشاهدهٔ deployment/browser روی shared dev.

## آخرین batch تکمیل‌شده — F12-B12-R6

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: settings opens as a read-first operational overview; mutations are available only inside an
explicitly opened, focused editor and remain server-confirmed after submit.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R6`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R4 workflow and F12-T12-R5 pagination corrective.
  - Scope: replace the always-open settings forms with a compact clinic overview and descriptive category cards;
    open each editor in an accessible responsive modal/sheet, keep writes behind explicit submit actions, and preserve
    existing directory/scheduling/payment API behavior and error feedback.
  - Owned paths: `apps/dashboard/src/features/settings/**`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: no API, database, OpenAPI, generated-client, auth or role change.
  - Expected verification: focused settings tests, dashboard test/typecheck/lint, responsive browser review on desktop
    and mobile widths, keyboard dialog behavior, and `git diff --check`.
  - Review: PASS — the initial route is read-first and contains only server-backed summary/status data plus descriptive
    category cards; every form is isolated in an explicitly opened editor, draft input is discarded on close, and the
    responsive dialog owns scroll/focus, Escape/backdrop close and keyboard focus wrapping.
  - Verification: dashboard `69/69` tests across `21` files, TypeScript, ESLint and `git diff --check` PASS. Desktop
    and mobile browser inspection remains the post-push shared-dev gate.
  - External next action: push `dev`, verify the deployment, then inspect the overview and at least one editor at
    desktop and mobile widths without submitting a mutation.

## آخرین batch تکمیل‌شده — F12-B12-R5

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 18:03 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: every dashboard settings list request must respect the accepted API maximum `pageSize=50`; a
single invalid list query must not make a valid authenticated settings session appear unavailable.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R5`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed F12-T12-R4 settings workflow and the existing Phase 04 directory/scheduling list contracts.
  - Scope: align dashboard settings list pagination with the API maximum, add a regression assertion for the emitted
    queries, and verify the authenticated shared-dev settings route no longer fails with `BAD_REQUEST`.
  - Owned paths: `apps/dashboard/src/lib/directory-settings-api*`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: generated API client is read-only; no API, database, OpenAPI, auth or role change.
  - Expected verification: focused adapter test, dashboard test/typecheck/lint, `git diff --check`, then authenticated
    browser observation after the `dev` deployment.
  - Review: PASS — all seven paginated directory/scheduling reads now send the API-supported maximum `pageSize=50`;
    the regression test inspects every emitted list URL, while authentication and authorization contracts are unchanged.
  - Verification: authenticated shared-dev browser diagnosis reproduced `400 BAD_REQUEST` with
    `pageSize must not be greater than 50` on all seven list endpoints; focused `7/7` tests, full dashboard `69/69`
    tests, TypeScript, ESLint and `git diff --check` PASS.
  - External next action: push `dev`, observe deployment, then repeat the authenticated browser request to confirm all
    settings reads return `2xx` and the workflow renders server data.

## آخرین batch تکمیل‌شده — F12-B12-R4

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: dashboard settings must express the accepted directory publication prerequisites and keep each
clinic, doctor, offering, schedule and calendar mutation visibly scoped to its own form.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R4`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Phase 04 directory/scheduling APIs and completed F12-T12-R3 dashboard navigation corrective.
  - Scope: replace the ambiguous settings form with a guided clinic → specialty/doctor → service/offering → schedule
    workflow, preserve backend error codes, repair refresh/success state handling, isolate form selections, and add
    explicit payment-setting feedback without changing API or persistence contracts.
  - Owned paths: `apps/dashboard/src/features/settings/**`, `apps/dashboard/src/lib/directory-settings-api*`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: existing generated API client is read-only; no API, database, OpenAPI or role change.
  - Expected verification: focused adapter/workflow regression tests, dashboard test/typecheck/lint, supported build or
    shared-dev route compilation, responsive source review and `git diff --check`.
  - Review: PASS — new records follow API publication prerequisites in one guided path; old drafts have explicit
    repair actions; mutation messages retain stable server error codes; successful writes are re-read before progress
    changes; independent forms no longer overwrite one another's doctor or date selection.
  - Verification: dashboard `69/69` tests across `21` files, TypeScript, ESLint, settings contract scan and
    `git diff --check` PASS. Shared-dev `/settings` compilation remains the post-push build observation because this
    executor cannot capture Next child-process output during a production build.
  - External next action: push `dev`, verify the shared-dev workflow and request `/settings` from the live dashboard.

## آخرین batch تکمیل‌شده — F12-B12-R3

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: dashboard navigation and status affordances expose only API-backed operational capabilities;
empty, loading and failure states remain distinct; the shell remains usable on narrow viewports.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/phases/12-PRODUCTION-HARDENING.md`.

- Task ID: `F12-T12-R3`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed Phase 05–11 dashboard connections and the deferred AI/bot/advanced-automation boundary.
  - Scope: remove fabricated dashboard badges and mock/deferred navigation, remove false header affordances, expose
    the real audit route, distinguish patient-list failure from an empty list, resolve the authorized clinic for CRM,
    replace raw chat UUID entry with an API-backed appointment selector, and add responsive shell navigation.
  - Owned paths: `apps/dashboard/src/**`; coordinator-only `plan/{STATUS.md,logs/phase-12.md,phases/12-PRODUCTION-HARDENING.md}`.
  - Shared/exclusive resource: dashboard navigation/session UI only; no API, database, OpenAPI or generated-client change.
  - Expected verification: focused dashboard regression tests, dashboard typecheck/build, mock/navigation scan,
    responsive browser inspection where available, and `git diff --check`.
  - Review: PASS — operational navigation contains only API-backed features, deferred routes fail closed with an
    explicit unavailable state, CRM/chat no longer require copied UUIDs, health loading/error/empty states are
    distinct, and the responsive shell exposes an accessible mobile drawer.
  - Verification: dashboard `66/66` tests, TypeScript, ESLint, route/mock scan and `git diff --check` PASS. The
    sandbox cannot execute Next's child-process `tsc --showConfig` or Turbopack's internal bind, so production-build
    verification is deferred to the post-push CI/shared-dev compile; direct TypeScript configuration output is valid.
  - External next action: push to `dev`, verify the GitHub sync and compile representative dashboard routes on the
    shared development origin.

## آخرین batch تکمیل‌شده — F12-B02-R23

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: shared-dev frontend watchers keep their original Next development compiler and may use available
host memory during first-route compilation without a per-container memory ceiling.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R23`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: live app compilation repeatedly restarting under the 768 MiB container limit and a local root-route
    compile measurement of approximately 1.07 GiB RSS.
  - Scope: restore the original app Turbopack command and remove only the web/app/dashboard dev memory ceilings.
  - Owned paths: `deploy/vps/{dev-service.sh,compose.dev.yaml,README.md}`,
    `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev frontend resource policy only.
  - Expected verification: original compiler command and absent frontend memory-ceiling contracts, full dev/release
    deployment checks and `git diff --check`.
  - Review: PASS — all frontend watchers retain the default Next development command, while their dev Compose
    services no longer impose a memory cgroup below measured compilation demand.
  - Verification: shell syntax, full dev VPS simulation, release pipeline contract and `git diff --check` PASS.
  - External next action: push to `dev` and verify the app root compilation completes with available host RAM.

## آخرین batch تکمیل‌شده — F12-B02-R22

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: the app remains a development watcher with fast source refresh, but its compiler process must stay
resident after serving the first route.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R22`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R21` and live diagnostics showing Next Turbopack repeatedly exits cleanly after
    detecting `next.config.ts`, with `RestartCount=16`, `OOM=false` and intermittent successful root responses.
  - Scope: run only the unstable shared-dev app watcher on Next's webpack development compiler and preserve web and
    dashboard Turbopack watchers.
  - Owned paths: `deploy/vps/{dev-service.sh,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev app watcher command only.
  - Expected verification: service command contract, dev/release deployment checks and `git diff --check`.
  - Review: PASS — only `apps/app` selects webpack development mode; the existing dev server, bind mount, HMR and
    isolated web/dashboard commands are preserved.
  - Verification: shell syntax, full dev VPS simulation, release pipeline contract and `git diff --check` PASS.
  - External next action: push to `dev` and verify the app watcher remains resident on the shared server.

## آخرین batch تکمیل‌شده — F12-B02-R21

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: frontend readiness checks must fail within a bounded interval and attempt one safe recovery of a
stalled Next development watcher before rejecting the synced source.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R21`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R20` and live evidence that `app` accepts a container start but never answers HTTP.
  - Scope: bound frontend readiness retries, emit diagnostics promptly, clear only the affected derived `.next` cache,
    recreate that watcher once and verify readiness again.
  - Owned paths: `deploy/vps/{deploy-dev.sh,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev watcher lifecycle only; no database, secret, API contract or release behavior.
  - Expected verification: stalled-app recovery simulation, dev/release deployment checks, shell syntax and
    `git diff --check`.
  - Review: PASS — a stalled frontend now produces diagnostics promptly, receives one isolated cache reset/recreate,
    and either becomes ready or fails the deployment within a bounded interval.
  - Verification: shell syntax, first/unchanged/per-service sync plus stalled-app recovery simulation,
    `pnpm release:test` and `git diff --check` PASS.
  - External next action: push to `dev`, observe the shared-dev sync and verify all three public frontend origins.

## آخرین batch تکمیل‌شده — F12-B12-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 Asia/Tehran`
Phase: `12-PRODUCTION-HARDENING` (public web alert severity corrective)
Batch status: `DONE`
Contract baseline: authentication/API failures must be visually destructive and accessible; success, information and
warning notices must retain distinct semantic colors.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T12-R2`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: existing typed auth error mapping and live theme evidence that `destructive` has no web color token.
  - Scope: define public-web semantic alert colors and preserve Sonner severity variants without changing auth/API
    behavior or Persian error mappings.
  - Owned paths: `apps/web/src/app/globals.css`, `apps/web/src/components/{auth/AuthErrorAlert.tsx,ui/sonner.tsx}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: none.
  - Expected verification: web tests/typecheck/build, rendered semantic alert colors, accessibility role and
    `git diff --check`.
  - Review: PASS — inline auth/API failures now use the destructive red palette and Sonner success, information,
    warning and error variants keep separate green, blue, amber and red palettes.
  - Verification: 12 web tests, web typecheck, webpack production build, Chromium computed-style checks for the auth
    `role=alert` and information toast, plus `git diff --check` PASS.
  - External next action: push to `dev` and verify the public login error alert after shared-dev sync.

## آخرین batch تکمیل‌شده — F12-B12-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING` (public web visual asset and mobile corrective)
Batch status: `DONE`
Contract baseline: public web icons and typography must render from repository dependencies/assets without runtime
font or icon services; the home page must keep a bounded mobile viewport through and after the footer.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T12-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed public web baseline and live mobile evidence that unresolved Material Symbols render as text
    and the page wrapper adds blank space below the footer.
  - Scope: replace font-based generic icons with local component icons, self-host Yekan Bakh typography, correct the
    mobile footer/page boundary and verify responsive rendering without external asset requests.
  - Owned paths: `apps/web/**`, root dependency manifests; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: root lockfile only; no API, authentication, database, app, dashboard or deployment
    behavior change.
  - Expected verification: focused tests/typecheck/build, mobile/desktop browser layout and asset-request checks,
    live shared-dev sync and `git diff --check`.
  - Review: PASS — all generic web icons are typed, tree-shaken Lucide SVG components; Yekan Bakh FaNum is a
    self-hosted variable font; and the mobile page ends at the footer without the previous trailing padding.
  - Verification: 12 web tests, web typecheck, supported webpack production build, Chromium at 320/390/768/1440px,
    same-origin font request/no external icon request, zero horizontal overflow and `git diff --check` PASS.
  - External verification: GitHub run `38017448280` synced commit `9453128` successfully. Fresh Chromium at 390px on
    `https://dev.roxco.ir` loaded Yekan Bakh from the same origin, rendered 56 Lucide SVGs and zero Material Symbols,
    had no failed requests or horizontal overflow, and ended the document at the footer.

## آخرین batch تکمیل‌شده — F12-B02-R20

Coordinator/Thread: `Codex /root`
Started at: `2026-10-10 UTC`
Phase: `12-PRODUCTION-HARDENING` (shared-dev browser hydration and fast frontend sync corrective)
Batch status: `DONE`
Contract baseline: shared dev remains a bind-mounted Next development runtime without full frontend builds; browser
hydration, dev-origin authorization and changed-service refresh must be verified after every source sync.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R20`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R19` and live evidence that the public dev page serves HTML while its Next client
    does not hydrate, leaving the account header in its server-rendered checking state.
  - Scope: allow explicit remote/LAN Next development origins, fingerprint frontend source independently, restart only
    changed watcher services without production builds, and add a browser-realistic HMR deployment probe.
  - Owned paths: `apps/{web,app,dashboard}/next.config.ts`, `deploy/vps/{compose.dev.yaml,deploy-dev.sh,
    dev-env.example,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}` and a focused dev browser probe;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev frontend watcher lifecycle only; no authentication policy, API runtime,
    database, secret, staging, production-sim or release artifact change.
  - Expected verification: config parsing/typechecks, first/unchanged/per-frontend sync simulations, browser hydration
    probe contract, release/deployment checks and `git diff --check`.
  - Review: PASS — all three Next 16 development servers receive normalized explicit hostnames, changed frontend
    source recreates only its own persistent watcher, and deployment requires a public-origin HMR WebSocket `101`
    after bounded CDN/watcher warm-up retries before it records the synced source as ready.
  - Verification: focused origin parsing, all frontend typechecks, first/unchanged/dependency/API/per-frontend dev sync
    simulations, `pnpm release:test`, a live local browser-origin HMR handshake and `git diff --check` PASS.
  - External verification: GitHub run `38015897226` synced commit `4ef2d24` successfully. A fresh Chromium session on
    `https://dev.roxco.ir` rendered both login/register controls, observed the expected anonymous refresh `401` and
    reported no failed browser requests. Existing `APP_ORIGINS` supplied Next's allowlist; no server secret, database,
    port or Caddy change was required.

## آخرین batch تکمیل‌شده — F12-B02-R19

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev Next warm-up corrective)
Batch status: `DONE`
Contract baseline: persistent Next dev watchers must be warmed serially by deployment readiness probes; Docker health
checks must not concurrently trigger their expensive first route compilation with a shorter timeout.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R19`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R18` and live app logs showing 6–7 second initial Next compilation versus a
    five-second health/readiness timeout.
  - Scope: make dev watcher health cadence and sequential readiness timeouts accommodate bounded initial compilation.
  - Owned paths: `deploy/vps/{compose.dev.yaml,deploy-dev.sh}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev Next watcher startup only; no API runtime, database, secret, Caddy, staging
    or production-sim change.
  - Expected verification: startup timeout/cadence contract, dev/release deployment tests and `git diff --check`.
  - Review: PASS — Docker no longer concurrently compiles all three Next root routes through healthchecks. The
    existing deployment probes warm web, app and dashboard serially and allow 30 seconds for their first compile.
  - Verification: `bash scripts/test-vps-dev.sh`, `pnpm release:test` and targeted `git diff --check` PASS.
  - External next action: push the corrective to `dev`; a failed probe now also prints restart/OOM state. No server
    configuration change is required.

## آخرین batch تکمیل‌شده — F12-B02-R18

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev sync serialization corrective)
Batch status: `DONE`
Contract baseline: a newly dispatched shared-dev sync must serialize behind an already-running remote sync instead
of failing immediately, and rsync must preserve the complete server-generated API source directory.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R18`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R17` and live concurrent-sync/rsync warning evidence.
  - Scope: queue GitHub runs, wait with a bounded timeout for the remote deploy lock before source upload and deploy,
    and exclude the complete ignored API generated directory from source deletion.
  - Owned paths: `.github/{workflows/dev-sync.yml,CI.md}`, `scripts/deploy-dev-vps.mjs`, `deploy/vps/deploy-dev.sh`,
    `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev source sync and deployment lock only; no application, database, secret,
    Caddy, staging or production-sim change.
  - Expected verification: lock-contention simulation, generated-directory preservation contract, dev/release tests
    and `git diff --check`.
  - Review: PASS — GitHub no longer cancels an in-flight sync, source upload and deployment both wait up to ten
    minutes for the remote kernel lock, and rsync preserves the complete ignored API generated directory rather than
    attempting to delete its parent.
  - Verification: live lock-contention simulation, first/unchanged/dependency/API/frontend dev sync cases,
    `pnpm release:test` and `git diff --check` PASS.
  - External next action: push the corrective to `dev`; do not delete `state/deploy.lock`. No server configuration
    change is required.

## آخرین batch تکمیل‌شده — F12-B02-R17

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev build-context corrective)
Batch status: `DONE`
Contract baseline: the dev runtime image must always build from the validated synced workspace, independent of the
remote shell working directory or Docker Compose project-directory resolution.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R17`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R16` and live failure evidence showing Compose resolved the build context outside
    the synced workspace.
  - Scope: anchor the dev image build context to the already validated absolute `DEV_WORKSPACE_PATH` and freeze that
    contract in release/deployment tests.
  - Owned paths: `deploy/vps/compose.dev.yaml`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev image build context only; no application, database, secret, Caddy, staging
    or production-sim change.
  - Expected verification: rendered Compose context, dev/release deployment tests, `git diff --check`.
  - Review: PASS — Compose now receives the validated absolute workspace as its build context, so neither the remote
    login directory nor Compose project-directory semantics can move the Docker build outside the synced source.
  - Verification: rendered Compose context, `bash scripts/test-vps-dev.sh`, `pnpm release:test` and
    `git diff --check` PASS.
  - External next action: push the corrective to `dev`; no server-side runtime.env, secret, database, Caddy or port
    change is required.

## آخرین batch تکمیل‌شده — F12-B02-R16

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (shared-dev delivery and browser-runtime correctives)
Batch status: `DONE`
Contract baseline: Next services remain genuine development servers with bind-mounted source and HMR; the API keeps
its OOM-safe compile-on-sync runtime. Unchanged bootstrap work must be skipped, and public runtime configuration must
execute synchronously before hydration in web, app and dashboard.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, `plan/logs/phase-01.md`.

- Task ID: `F12-T02-R16`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R15` and live healthy/OOM-free API evidence.
  - Scope: fingerprint API client, Prisma, public config and API emit inputs; run only changed bootstrap stages, avoid
    API recreation when its emit is unchanged, and reduce fresh-runner rsync retransmission.
  - Owned paths: `.github/CI.md`, `scripts/deploy-dev-vps.mjs`,
    `deploy/vps/{deploy-dev.sh,dev-service.sh,README.md}`, `scripts/{test-vps-dev.sh,test-release-pipeline.mjs}`.
  - Shared/exclusive resource: shared-dev sync lifecycle only; no release, staging, production-sim or product change.
  - Expected verification: first/dependency/source-only/frontend-only sync simulations, release contracts, syntax and
    `git diff --check`.
  - Review: PASS — unchanged/frontend-only syncs skip bootstrap and recreation; API-only changes transpile and
    recreate only API; dependency/runtime changes retain the full safe path. Generated artifacts persist across rsync.
  - Verification: `bash scripts/test-vps-dev.sh`, `pnpm release:test`, shell/Node syntax and `git diff --check` PASS.

- Task ID: `F01-R08`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted browser auth/session baseline and live dev evidence that client hydration never attaches.
  - Scope: load the generated public runtime configuration as a native blocking head script before Next client chunks
    in web, app and dashboard; cover the shared contract and retain secret-free public values.
  - Owned paths: `apps/{web,app,dashboard}/src/app/layout.tsx`, `scripts/test-runtime-config-loading.mjs`.
  - Shared/exclusive resource: browser runtime-config bootstrap only; no auth policy, API or secret change.
  - Expected verification: runtime-config loading contract, three frontend typechecks, web tests/build, live-browser
    hydration reproduction locally, and `git diff --check`.
  - Review: PASS — runtime config now executes synchronously in the document head before any hydratable body content;
    all three clients retain the same generated secret-free public values and no longer depend on Next's script
    scheduler to begin hydration.
  - Verification: runtime-config contract, web tests/build, serial web/app/dashboard typechecks, local browser header
    hydration and intercepted login submission, and `git diff --check` PASS.
  - External next action: push both accepted task commits to `dev`; after the workflow completes, verify the public
    header leaves its account-checking skeleton and login submits to `https://dev-api.roxco.ir/v1/auth/login` rather
    than navigating with `POST https://dev.roxco.ir/login`.

## آخرین batch تکمیل‌شده — F12-B02-R15

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev API compiler/runtime isolation corrective)
Contract baseline: every Git sync compiles the API once in the one-shot bootstrap container; the persistent API
container only runs the emitted application so compiler and runtime memory cannot accumulate under its `1g` cgroup.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R15`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R14` and live cgroup evidence (`oom=2`, `oom_kill=2`, container unhealthy).
  - Scope: move shared-dev API compilation into bootstrap, leave only the emitted Node runtime in the API container,
    recreate that runtime once per completed sync, and freeze the separation in deployment tests.
  - Owned paths: `deploy/vps/{dev-service.sh,deploy-dev.sh}`, `scripts/{test-vps-dev.sh,
    test-release-pipeline.mjs}`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev API process lifecycle only; no application compiler contract, production
    runtime, database, secret, Caddy, port, staging or production-sim change.
  - Expected verification: constrained compiler emission with decorator metadata, dev/release deployment tests,
    shell syntax and `git diff --check`.
  - Review: PASS — bootstrap completes migration, optional seed and bounded transpilation before activation; the API
    container now runs only emitted Node code and source-only syncs recreate only that container.
  - Verification: constrained `640 MiB` emit with decorator metadata in 111 files, `pnpm release:test`, direct dev
    VPS contract test, Node/shell syntax and `git diff --check` PASS.
  - External next action: push this commit to `dev`; the runtime hash change forces recreation and replaces the live
    compiler-bearing unhealthy API container without any manual Caddy, database, secret or port change.

## آخرین batch تکمیل‌شده — F12-B02-R14

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (low-memory shared-dev API compiler corrective)
Contract baseline: shared dev retains TypeScript decorator metadata and CI typechecking, but its persistent compiler
must emit without full semantic/declaration work inside the existing `1g` API container; failed probes must print the
service state and logs in the workflow.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R14`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R13` and repeated live API reset/restart evidence after the heap-only corrective.
  - Scope: make the API dev compiler transpile-only without losing decorator metadata, bound it below the previous
    heap ceiling, and expose API logs automatically when readiness fails.
  - Owned paths: `apps/api/scripts/dev.mjs`, `apps/api/test/dev-runtime.spec.ts`,
    `deploy/vps/deploy-dev.sh`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: API development compilation and dev readiness diagnostics only; no production runtime,
    database, secret, Caddy, port, staging or production-sim change.
  - Expected verification: constrained transpile with decorator metadata, focused API dev-runtime test, API build,
    dev/release deployment tests, syntax and `git diff --check`.
  - Review: PASS — dev `tsc` now skips semantic/declaration work, stays bounded at `640 MiB`, and preserves emitted
    Nest decorator metadata; CI/full builds retain normal typechecking. A failed health probe now prints service state
    and the last 200 log lines before exiting.
  - Verification: clean constrained emit at `640 MiB` with decorator metadata in 111 files, focused API dev-runtime
    test (3/3), full API build, `pnpm release:test`, Node/shell syntax and `git diff --check` PASS.
  - External next action: push this commit to `dev` and rerun `Sync shared dev VPS`; no server-side configuration
    change is required. If readiness still fails, the workflow will now include the actionable API logs.

## آخرین batch تکمیل‌شده — F12-B02-R13

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev API compiler heap corrective)
Contract baseline: shared dev keeps its existing `1g` API container limit; only the TypeScript compiler subprocess
receives a larger V8 old-space ceiling so the application runtime and other services are unaffected.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R13`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R12` secret-mount corrective and live logs proving compiler heap exhaustion.
  - Scope: prevent the shared-dev API compiler from restarting at the container-aware default V8 heap ceiling and
    add a focused regression assertion.
  - Owned paths: `apps/api/scripts/dev.mjs`, `apps/api/test/dev-runtime.spec.ts`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: API development compiler process only; no production runtime, container limit,
    database, secret, staging or production-sim change.
  - Expected verification: focused API dev-runtime test, API development build, Node syntax and `git diff --check`.
  - Review: PASS — both TypeScript compiler invocations receive a `768 MiB` V8 old-space ceiling while the Nest
    runtime and the existing `1g` API container limit remain unchanged.
  - Verification: focused API dev-runtime test (3/3), API build, Node syntax and `git diff --check` PASS.
  - External next action: push this commit to `dev` and rerun `Sync shared dev VPS`; no server-side environment,
    database, secret, Caddy or port change is required.

## آخرین batch تکمیل‌شده — F12-B02-R12

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev lower-case secret mount corrective)
Contract baseline: Compose mounts lower-case file-secret names while application environment variables remain
upper-case; shared dev must translate between those names without changing secret files or release environments.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R12`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R11` build-context corrective and the first successful live dev image build.
  - Scope: make the shared dev secret loader read Compose's lower-case `/run/secrets/*` paths while exporting the
    existing upper-case API environment variables, and add a regression contract assertion.
  - Owned paths: `deploy/vps/dev-service.sh`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev file-secret adapter only; no secret value, application contract, database,
    staging or production-sim change.
  - Expected verification: dev/release contract suite, VPS behavior simulation, shell syntax and `git diff --check`.
  - Review: PASS — one shared loader now maps upper-case environment-variable names to Compose's lower-case secret
    filenames, covering database, JWT, refresh pepper and both payment-key files without changing their values.
  - Verification: `pnpm release:test`, `bash scripts/test-vps-dev.sh`, `bash -n deploy/vps/dev-service.sh` and
    `git diff --check` PASS.
  - External next action: push this commit to `dev`; the existing PostgreSQL volume/container may remain in place and
    the sync can resume bootstrap without recreating secrets. No batch is started in this handoff.

## آخرین batch تکمیل‌شده — F12-B02-R11

Coordinator/Thread: `Codex /root`
Started at: `2026-10-09 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` shared-dev live corrective)
Batch status: `DONE` (shared-dev build-context and Caddy corrective)
Contract baseline: shared dev remains isolated on `3300–3303`; Caddy terminates HTTPS; Compose build context must be
the synced workspace regardless of the deployment user's home path.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`.

- Task ID: `F12-T02-R11`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: completed `F12-T02-R10` port corrective and the second live dev-sync failure.
  - Scope: stop overriding Compose's file-relative project directory so `../..` resolves to the synced workspace,
    add a regression assertion for the resolved build context, and replace the obsolete Nginx example with the
    owner-confirmed Caddy virtual hosts on `3300–3303`.
  - Owned paths: `deploy/vps/{deploy-dev.sh,README.md}`, `scripts/test-release-pipeline.mjs`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: shared-dev bootstrap build path and reverse-proxy documentation only; no application,
    database, secret, staging or production-sim change.
  - Expected verification: resolved Compose build-context assertion, dev/release contract suite, shell syntax and
    `git diff --check`.
  - Review: PASS — removing the unnecessary project-directory override restores Compose's file-relative `../..`
    resolution to the synced workspace. Caddy documentation now matches the confirmed live proxy and `3300–3303`.
  - Verification: resolved Compose JSON context equals the repository/workspace root; `pnpm release:test`,
    `bash scripts/test-vps-dev.sh`, shell syntax and `git diff --check` PASS.
  - External next action: update the live dev `runtime.env` and Caddy upstreams to `3300–3303`, push this corrective
    to `dev`, and rerun `Sync shared dev VPS`. No batch is started in this handoff.

## آخرین batch تکمیل‌شده — F12-B15-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (owner-approved release regression correctives)
Batch status: `DONE`
Contract baseline: `ADR-0001` browser session contract, accepted Phase 09 commerce boundary, and the owner-approved
requirement that product browse/search/detail is public while patient-owned commerce mutations remain authenticated.
Coordinator-only files: `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}` and generated OpenAPI/client.

- Task ID: `F01-R05`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted Phase 01 identity/session baseline and Phase 11 ADMIN-only dashboard admission.
  - Scope: renew the memory-only access token before protected app/dashboard requests, preserve single-flight refresh
    rotation and absolute session deadlines, and distinguish authentication expiry from real authorization denial.
  - Owned paths: `packages/api-client/src/index.ts`, focused API-client tests,
    `apps/app/src/{auth,components/auth,lib/api*}`, `apps/dashboard/src/{auth,components/auth,lib/api*,
    features/settings/settings-page.tsx}`, and focused frontend tests.
  - Shared/exclusive resource: API-client request transport and browser refresh-token rotation contract; no API
    token/session lifetime or role policy change.
  - Expected verification: expired-token request refresh, concurrent single-flight behavior, refreshed bearer use,
    refresh failure, 401/403 presentation, app/dashboard tests/typechecks/builds and `git diff --check`.
  - Review: PASS — protected requests now renew an expired memory-only access token through the existing single-flight
    refresh session before sending, without changing access/session lifetime or exposing refresh credentials. App and
    dashboard retain their authenticated view during renewal, and settings distinguish 401 from a real 403 denial.

- Task ID: `F09-T04-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted F09-T04 catalog/cart implementation; independent of F01-R05 implementation.
  - Scope: make active product browse/search/detail public for the single active release clinic, keep cart/wishlist/
    checkout/order/payment protected, and prevent protected personalization failures from hiding the public catalog.
  - Owned paths: `apps/api/src/modules/commerce/catalog/{patient-commerce-catalog.controller.ts,
    patient-commerce-catalog.service.ts}`, focused API/OpenAPI tests; `apps/app/src/app/**/store/**`, app layouts,
    `apps/app/src/lib/commerce-catalog-api*`, focused app tests; generated OpenAPI/client.
  - Shared/exclusive resource: commerce catalog route contract and generated OpenAPI/client; no Prisma change.
  - Expected verification: anonymous public catalog/detail plus active-clinic filtering, protected patient commerce
    authorization regression, OpenAPI/client freshness, app/API tests/typechecks/builds and `git diff --check`.
  - Review: PASS — active-clinic product browse/search/detail is available without a bearer token, while inactive
    products/categories/SKUs and other clinics stay hidden. Cart, wishlist, address, checkout, order and payment
    remain protected; a protected personalization failure no longer hides the public catalog.
  - Verification: disposable PostgreSQL workspace suite (5/5 packages; API 95 files/385 tests, app 12/50,
    dashboard 18/62, web 4/9, API client 1/5), API/app typechecks and production builds, generated OpenAPI/client
    freshness, focused anonymous/protected contract checks and `git diff --check` PASS.

- Task ID: `F12-T02-R10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted `F12-T02-R9` shared-dev delivery and live collision evidence from the first dev sync.
  - Scope: move the documented/default shared-dev host bindings away from the already-reserved production-sim
    `3200–3203` range to `3300–3303`, retaining the existing fail-closed cross-environment validation.
  - Owned paths: `deploy/vps/{dev-env.example,README.md}`, `scripts/{test-vps-dev.sh,
    test-release-pipeline.mjs}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: VPS loopback port allocation only; no container internal port, database, secret,
    production runtime or application contract change.
  - Expected verification: simulated collision rejection, dev/release contract suite, exact port-reference scan and
    `git diff --check`.
  - Review: PASS — the live blocker was a correct fail-closed boundary check, not a container failure. The dev
    defaults now use the unreserved `3300–3303` range; production-sim retains `3200–3203`.
  - Verification: `bash scripts/test-vps-dev.sh`, `pnpm release:test`, exact port-reference scan and
    `git diff --check` PASS. The behavior test now models both staging (`3100–3103`) and production-sim
    (`3200–3203`) before accepting the new dev range.
  - External next action: change only the dev `runtime.env` and the four dev reverse-proxy upstreams to `3300–3303`,
    then push this corrective and rerun the same `dev` SHA. Do not change production-sim.

- Batch review gate: PASS — all three independently committed tasks have implementation, focused/integration
  verification and recorded evidence. The active claim is cleared; no new batch is started. `F12-T05` and
  `F12-T07` remain externally blocked, `F12-T09` remains dependency-gated, and `F12-T11`/`F12-T12` remain
  unclaimed.

## آخرین batch تکمیل‌شده — F12-B02-R9

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F12-T02` owner-approved development-delivery extension)
Batch status: `DONE` (isolated fast shared development delivery)
Contract baseline: one shared internal `dev` branch/environment on the existing VPS; source-sync and hot reload are
isolated from immutable `main` release workflows, databases, secrets, ports and state.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`, deployment workflow and ADR.

- Task ID: `F12-T02-R9`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted VPS deployment baseline and completed `F07-T11-R1` corrective.
  - Scope: implement a gated `dev`-branch source-sync workflow, persistent Docker Compose watch services, isolated
    PostgreSQL/secrets/ports, dependency and migration bootstrap, health verification, operator setup documentation
    and focused contract/behavior tests without changing the production release path.
  - Owned paths: `.github/workflows/dev-sync.yml`, `.github/CI.md`, `deploy/vps/{Dockerfile.dev,compose.dev.yaml,
    dev-*.sh,dev-env.example,README.md}`, `scripts/{deploy-dev-vps.mjs,test-vps-dev.sh,
    test-release-pipeline.mjs}`, one deployment ADR; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: VPS deployment identity and host resource envelope; no production runtime state,
    Prisma schema, OpenAPI contract or application feature code change.
  - Expected verification: dev workflow/release contracts, simulated VPS source/bootstrap/watch behavior, shell/Node
    syntax, YAML parse, production workflow non-regression and `git diff --check`.
  - Review: PASS — `dev` now has a gated source-sync path, persistent Nest/Next watchers, isolated/capped Compose
    state and fail-closed boundary checks. Existing `main` CI, immutable release and promotion files are unchanged.
  - Verification: `pnpm release:test`, `bash scripts/test-vps-dev.sh`, Node/shell syntax, dev workflow YAML parse and
    `git diff --check` PASS. The focused simulation covers first bootstrap/seed, source-only hot update, dependency
    reinstall/recreate and staging-port collision rejection.
  - External next action: configure the documented VPS runtime/secrets/DNS/reverse proxy and GitHub variable, create
    branch `dev`, then record the first live four-endpoint sync. No batch is started in this handoff.

## آخرین batch تکمیل‌شده — F12-B14-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F07-T11` CI reliability corrective)
Batch status: `DONE` (prescription concurrency-test reliability corrective)
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`

- Task ID: `F07-T11-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: remove the nondeterministic winner assumption from the real-PostgreSQL concurrent prescription revision
    assertion while preserving the one-winner/one-conflict and exact issued-evidence contract.
  - Owned paths: `apps/api/test/prescription.integration.spec.ts`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Review: PASS — the test still requires exactly one committed revision and one stale-revision conflict, but now
    verifies issued/history evidence against whichever concurrent request PostgreSQL serialized first.
  - Verification: CI run `37727025727` passed the original race; post-merge run `37727664058` reproduced the opposite
    valid winner and isolated the sole flaky assertion. Patched main CI run `37729167480`, API typecheck and
    `git diff --check` PASS.
  - Next eligible work: no batch is started in this handoff; the requested isolated fast dev environment can be
    claimed next without modifying the production release path.

## آخرین batch تکمیل‌شده — F12-B13-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING` (`F02-T08` release-readiness corrective)
Batch status: `DONE` (patient profile and consent-policy release corrective)
Contract baseline: `plan/contracts/patient-onboarding-v1.md`; missing policy remains fail-closed and no production
placeholder may be introduced.
Coordinator-only files: `plan/STATUS.md`, `plan/logs/phase-12.md`

- Task ID: `F02-T08-R1`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: restore newly registered patient profile access when the consent policy is unavailable, preserve the
    explicit onboarding blocker, expose the real generated-client error code, and add release-safe consent-policy
    verification/provisioning support without running the development seed.
  - Owned paths: `apps/app/src/lib/onboarding/**`, `apps/app/src/app/(app)/profile/**`, focused app tests;
    `apps/api/prisma/*consent-policy*`, `apps/api/package.json`, focused API/script tests; VPS release scripts,
    deployment documentation and their contract tests; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: consent-policy lifecycle and VPS release activation sequence; no schema/OpenAPI change.
  - Review: PASS — profile/edit/medical views now load only their own resources; generated-client error bodies retain
    stable error codes; onboarding remains explicitly fail-closed when consent is unavailable. Rehearsal deployment
    publishes and verifies an environment/hash-bound policy after migrations and before application activation.
  - Verification: focused app 10/10 and consent-policy 3/3 tests, full app 48/48 tests, app/API typechecks and builds,
    release/VPS contracts, shell/Node syntax and `git diff --check` PASS. The full API integration suite was not
    asserted because no local PostgreSQL listener or Docker engine is available; failures stopped at database setup.
  - Next eligible work: no batch is started. Deploy this commit through the existing release path and confirm a new
    patient can open profile and complete consent in staging; production still requires a separately approved policy.

## آخرین batch تکمیل‌شده — F12-B02-R8

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (non-root file-secret ownership corrective)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: correct file-secret ownership for the accepted non-root Distroless UID/GID after the first live staging
    deployment proved that Compose file secrets retain host ownership.
  - Owned paths: `deploy/vps/deploy-release.sh`, `scripts/test-vps-deploy.sh`, VPS deployment documentation;
    coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Expected verification: VPS behavior contract, release contract, shell syntax, security/ordering review and
    `git diff --check`; live staging rerun remains external evidence.
  - Review: PASS — the accepted API artifact now performs a no-network, read-only, capability-bounded ownership helper
    before migration/activation. Host owner `deploy` is retained, runtime group `65532` receives read access and no
    secret becomes world-readable.
  - Verification: VPS behavior/release contracts, shell syntax and `git diff --check` PASS. Live run `37715705119`,
    attempt 4, completed successfully; all five staging containers and API live/ready plus three Next HTTP probes pass.
  - Next eligible work: no batch is started. Record baseline release `37715705119` for the later two-update and
    rollback rehearsal; production-sim promotion remains an explicit owner operation.

## آخرین batch تکمیل‌شده — F12-B02-R7

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (private GitHub Free test-VPS credential boundary)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: adapt the test-VPS CD workflows to the confirmed private-repository GitHub Free boundary by using
    repository-scoped SSH inputs, while preserving automatic staging, explicit owner promotion/rollback,
    immutable manifests and the two isolated VPS environments.
  - Owned paths: `.github/workflows/{release,promote,rollback}.yml`, `.github/CI.md`, `deploy/vps/README.md`,
    `scripts/test-release-pipeline.mjs`, affected SpecKit/decision documentation; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Expected verification: workflow contract tests, YAML/actionlint, permission and owner-gate review,
    repository-input documentation review and `git diff --check`.
  - Review: PASS — GitHub Environment references were removed from the three VPS workflows because the confirmed
    private repository on GitHub Free cannot configure them. Repository-scoped SSH inputs are validated before use;
    staging remains opt-in/automatic, while production-sim promotion and rollback retain explicit actor matching.
  - Verification: `pnpm release:test`, six-workflow YAML parse, actionlint and `git diff --check` PASS.
  - External next action: repository Actions currently reports zero repository variables and zero repository secrets.
    Configure the documented four SSH secrets and four variables, keep `VPS_CD_ENABLED=false` until present, then set
    it to `true` and merge a baseline update to exercise staging. No new batch is started.

CI maintenance handoff (owner-authorized, 2026-10-04): ordinary checks retained; security/browser/artifact
gates added; frozen chat capacity is manual-only without changing its contract. Browser 7/7, typecheck,
dependency High/Critical gate, tracked-source secret scan and workflow validation pass. Artifact smoke/scan
remains unverified because the local Docker Linux engine is unavailable; no full-green claim or task DONE.
No roadmap task/batch selected, no existing blocker/dependency changed. Scope is CI configuration/helpers/docs
only. Evidence and exact remaining verification: [`logs/ci-maintenance-2026-10-04.md`](logs/ci-maintenance-2026-10-04.md).

`F10-T09 REWORK` CI/load-test isolation is accepted; Phase 10 remains `DONE (CLOSED)`. `F11-T01` through `F11-T11`
remain accepted with independent closure evidence in [`logs/phase-11.md`](logs/phase-11.md); Phase 11 remains
`DONE (CLOSED)` and is out of scope. `F12-T01` is accepted with evidence in [`logs/phase-12.md`](logs/phase-12.md).
`F12-T02 REWORK` is accepted with corrective evidence in [`logs/phase-12.md`](logs/phase-12.md): bounded bigint
request values now cross the actual transport as JSON number tokens, and top-level `Amount`/`OrderId` response
literals remain exact through Verify parsing. The `@sabz-zendegi/api-client` resolver was a fresh-worktree artifact
preparation issue (`dist/` missing despite a correct workspace link); its package build and dashboard checks pass.
`F12-T06` remains accepted and unchanged. `F12-T03` is accepted with evidence in
[`logs/phase-12.md`](logs/phase-12.md): the frozen mixed result is PASS at 99.944% success and p95 21.81ms; the
boundary 401s are a known iteration-based harness artifact rather than a product/capacity failure; and the complete
frozen chat workload passes with its per-batch timing and final count/sequence invariants. The harness rotates from
JWT `exp` with a safety margin and keeps all-route-2xx only as a short preflight check. Mixed, booking-conflict and
simulated-Sadad results were retained, not rerun. `F12-T05` remains
unchecked and unclaimed: Liara's official CLI evidence confirms
manually created/downloadable backups but not the approved daily backup plus continuous WAL/archive, restore/PITR,
or RPO/RTO capability. `F12-T02`'s corrective provider-neutral OCI artifact extension is accepted with evidence in
[`logs/phase-12.md`](logs/phase-12.md): the pinned Distroless Node 24 non-root runners, explicit API-image migration,
public-only runtime configuration, Compose health and Liara documentation-profile gates pass; all four actual release
images scan `0 Critical / 0 High`. This proves local artifact behavior only, not Liara or Sadad external readiness.

## آخرین batch تکمیل‌شده — F12-B02-R6

Coordinator/Thread: `Codex /root`
Started at: `2026-10-08 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (free-plan-compatible manifest preservation and optional provenance attestation)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Scope: preserve the immutable release manifest before optional provenance work, skip GitHub artifact attestations
    unless explicitly enabled on a supporting plan, and retain digest-only promotion/deployment guarantees.
  - Owned paths: `.github/workflows/release.yml`, `.github/CI.md`, `deploy/vps/README.md`,
    `scripts/test-release-pipeline.mjs`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Expected verification: workflow contract tests, YAML/actionlint, permission/order review and `git diff --check`.
  - Review: PASS — GitHub run `37540615770` attempt 3 published all four private images and produced exact digests,
    then failed only because private-repository artifact attestation is unavailable on the organization's Free plan.
    The manifest is now uploaded before optional attestation work, and all provenance steps require the explicit
    `GHCR_ATTESTATIONS_ENABLED=true` repository variable. Digest-only promotion and deployment remain unchanged.
  - Verification: `pnpm release:test`, six-workflow YAML parse, actionlint 1.7.12 and `git diff --check` PASS.
  - Next eligible work: no batch is started. Merge this corrective, allow the resulting main release to publish a
    retained manifest, then configure the VPS inputs before enabling staging delivery.

## آخرین batch تکمیل‌شده — F12-B02-R5

Coordinator/Thread: `Codex /root`
Started at: `2026-10-06 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (continuous-delivery software/readiness scope; live VPS acceptance remains a release gate)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted provider-neutral OCI artifacts, release build/scan gates and F12-T10 application-only
    rollback contract. No active batch or ownership conflict exists.
  - Scope: clarify and implement automatic immutable-image publication, staging deployment to a disposable/test VPS,
    owner-gated production promotion, explicit migration and application-only rollback. Preserve provider-neutral
    application/runtime code and keep real Sadad and production activation blocked.
  - Owned paths: `specs/010-production-hardening/{spec.md,plan.md,tasks.md}`, `.github/workflows/**`,
    `deploy/**`, `scripts/**`, release documentation and package scripts needed by this corrective;
    coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
  - Shared/exclusive resources: GHCR release namespace, deployment workflow contracts, migration/release manifest and
    VPS staging interface.
  - Expected verification: workflow validation, least-privilege permission review, immutable digest and provenance
    assertions, offline migration, disposable/local deployment rehearsal, VPS deployment/update/rollback evidence when
    target access is supplied, and `git diff --check`.
  - Review: PASS — successful protected-main CI is the only private-GHCR publication trigger; the four exact digests
    are preserved in one release manifest, staging delivery is automatic only when explicitly enabled, production-sim
    promotion/rollback is a separate owner-dispatched operation, and the VPS script enforces pinned SSH, non-root use,
    isolated Compose projects, temporary registry authentication, migration-before-switch and application-only rollback.
  - Verification: SpecKit analysis has 100% requirement/task coverage and no HIGH/CRITICAL finding; release contract,
    workflow YAML/actionlint, synthetic Compose configuration, staged/failed-release rollback behavior, lint/typecheck
    and actual four-image build/smoke/scan all pass. The four images remain `0 Critical / 0 High` and all run as the
    accepted non-root Distroless UID/GID.
  - External gate: no GHCR publication or VPS deployment was performed. Before release sign-off, configure a GitHub
    plan that supports private-repository Environment secrets, repository variables, environment-scoped SSH material
    and the isolated test VPS; then retain evidence for one baseline, two sequential updates and controlled rollback.
  - Next eligible work: no batch is started. F12-T05/F12-T07 remain blocked by their existing external evidence; F12-T09
    remains dependency-gated. Real production and Sadad activation remain blocked through F12-T13.

## آخرین batch تکمیل‌شده — F12-B02-R4

Coordinator/Thread: `Codex /root`
Started at: `2026-10-05 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (owner-requested release-build and CI corrective)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted provider-neutral OCI artifacts, artifact smoke/scan gates and documentation from F12-T02.
    No active batch or ownership conflict exists.
  - Scope: replace four manually repeated image-build commands with one declarative Docker Buildx Bake entry point;
    keep deterministic commit tags and lowercase registry derivation; diagnose and correct cross-event GitHub Actions
    cancellation without weakening tests. Do not publish images, deploy, provision a provider, touch runtime code or
    activate Sadad.
  - Owned paths: `docker-bake.hcl`, `scripts/release-images.mjs`, `package.json`, `README.md`, `docs/PRODUCTION.md`,
    `.github/workflows/{ci.yml,container-checks.yml}`; coordinator-only `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: release artifact build configuration and CI concurrency keys.
  - Expected verification: Bake print/target/tag assertions, wrapper dry-run and argument validation, workflow parse
    and concurrency review, targeted package-script validation, current remote CI evidence and `git diff --check`.
  - Review: PASS — Docker Buildx Bake now defines the four release targets once, and the root wrapper derives a
    lowercase registry plus commit-based tags for print/build/verify/push. The full local verification built all four
    Distroless/non-root artifacts, passed their disposable smoke checks and reported `0 Critical / 0 High` for every
    image. Workspace lint, typecheck and all tests also pass against a disposable PostgreSQL 16 database.
  - CI diagnosis: the canceled post-merge `pnpm test` step contains no failed assertion and the same test command
    passes locally and in the following pull-request run. GitHub's retained log reports only an external cancellation,
    so it does not identify the initiator. CI and artifact checks now use GitHub's documented `head_ref || run_id`
    pattern: stale runs for one pull-request branch cancel, while every protected `main` push gets a unique group and
    cannot be canceled by workflow concurrency. Container CI consumes the same Bake targets.
  - Next eligible work: no batch is started. Existing F12-T05/F12-T07 external-evidence blockers and the F12-T09
    dependency remain unchanged.

## آخرین batch تکمیل‌شده — F12-B02-R3

Coordinator/Thread: `Codex /root`
Started at: `2026-10-05 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (owner-requested documentation-only corrective)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted provider-neutral OCI artifacts and migration/rollback procedure from `F12-T02` and
    `F12-T10`. No active batch or ownership conflict exists.
  - Scope: add one development/Codespaces runbook and one production image build/promotion runbook, then replace
    the stale root README overview with accurate project entry points and links. Do not change runtime code,
    dependencies, migrations, deployment artifacts, provider configuration, secrets or external environments.
  - Owned paths: `README.md`, `docs/DEVELOPMENT.md`, `docs/PRODUCTION.md`; coordinator-only
    `plan/{STATUS.md,logs/phase-12.md}`.
  - Shared/exclusive resource: documentation only.
  - Expected verification: command/path/config review against package scripts, Dockerfiles, Compose files and CI;
    Markdown link validation; no-secret review; `git diff --check`.
  - Review: PASS — root README now routes contributors to two focused runbooks. Development covers local and
    Codespaces configuration, valid synthetic secrets, migrations, seed, runtime URLs and lifecycle. Production
    covers four provider-neutral image builds, artifact smoke/scan, registry digest capture, file-backed secrets,
    Compose migration/start, staging promotion, update and application-only rollback. All relative links and
    documented repository paths/scripts resolve; 36 Bash blocks pass syntax validation; the documented loopback
    port-variable shape passes `docker compose config`; no real secret or provider action is present. A post-push
    usability correction now derives and lowercases the GHCR namespace instead of exposing a copyable uppercase
    `OWNER` placeholder that Docker rejects.
  - Next eligible work: no batch is started. Existing F12-T05/F12-T07 blockers and the F12-T09 dependency remain
    unchanged.

## batch تکمیل‌شده — F12-B05-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-04 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (reduced single-task migration/rollback rehearsal)

- Task ID: `F12-T10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T02` and `F12-T04` are DONE. `F12-T09` is not eligible because `F12-T07` remains BLOCKED;
    F12-T05 and F12-T07 are excluded and retain their existing owners/paths. No active ownership conflict exists:
    the pre-existing uncommitted F12-T07 secret-rotation files remain untouched, unstaged and out of this task.
  - Scope: on run-owned disposable PostgreSQL only, rehearse empty-database replay, an older schema baseline upgrade,
    current/previous application compatibility at rollout, application rollback against the current schema, and
    Prisma validate/generate/migrate-status/client compatibility. Record expand/migrate/contract and forward-fix
    policy, commands, duration, result and cleanup. Do not create, rewrite or remove an accepted migration, a
    destructive data rollback, shared/staging/production database, capacity run, container scan, Sadad operation or
    F12-T02 rerun.
  - Owned paths: `apps/api/test/phase-12-migration-rollback.integration.spec.ts`,
    `deploy/phase-12-migration-rollout.md`; coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
    Shared/exclusive resource: schema/migration compatibility rehearsal and fully labelled run-owned PostgreSQL
    container/databases; no schema, migration, dependency, client-generation output or F12-T07 file may be changed.
  - Expected verification: fresh 32-migration replay, selected pre-current baseline upgrade, previous/current API
    startup and client compatibility at the rollout boundary, explicit rollback-to-previous-artifact startup, Prisma
    validate/generate/migrate status, test evidence, cleanup and `git diff --check`.
  - Review: PASS — labelled PostgreSQL 16 child databases replayed all 32 immutable migrations, passed Prisma
    validate/generate/status and proved the actual Phase 09→10 SQL upgrade is forward-only. Clean source artifacts
    from `d8e9948` (previous) and `df24278` (current) each built non-root, and readiness passed in order
    previous → current → previous against the current schema. No data/schema rollback was performed; application
    rollback leaves the expanded schema in place. All run-owned Docker databases, containers, networks and images
    were removed. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible work: no batch is started. F12-T09 remains ineligible while F12-T07 is BLOCKED; F12-T11 and
    F12-T12 are not started by this task.

## آخرین batch تکمیل‌شده — F12-B02-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (single-task Distroless runtime corrective extension)

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: accepted `F12-T01`; original T02 and its serialization corrective (`44667c2`) are accepted. No
    active ownership conflict: the pre-existing, uncommitted F12-T07 secret-rotation files are preserved and
    explicitly excluded from this task's staging and commit.
  - Scope: record ADR-0011 and update the release envelope/SpecKit task map; make API/web/app/dashboard OCI
    artifacts provider-neutral and non-root; add public runtime URL configuration, explicit API-image migration,
    production Compose example and a Liara documentation-only profile. Verify image build/smoke/health/migration and
    scan the real artifacts. No provider provisioning, external Sadad call, secret, or production deployment.
  - Initial verification: API/web/app/dashboard typechecks and entrypoint shell syntax pass; `git diff --check` passes.
    Docker Desktop's service is stopped, cannot be started from this non-elevated session, and its existing Linux-engine
    named pipes accept no CLI response (`docker version` and the run-owned image build remained silent). Therefore no
    OCI image, smoke/health/migration result or actual container scan exists and none is claimed.
  - Prior verification: `docker version` (`28.4.0`) and `docker run --rm hello-world` pass. The API image built
    as non-root `mushroom`; its run-owned tag was removed during cleanup. The web image failed at `next build` because
    Docker could not resolve workspace package `@sabz-zendegi/api-client`, although the same local web build passes.
    No web/app/dashboard image, smoke, migration, Compose validation or image scan ran after this gate failure.
  - Resumption scope: owner diagnosis confirms the workspace symlink is correct; ignored `dist/` plus imported
    `tsconfig.tsbuildinfo` made TypeScript skip its output. This run owns only ignoring incremental/turbo caches,
    forcing API-client output generation with an `dist/index.js` assertion, then the remaining artifact gates. Keep the
    pre-existing F12-T07 changes unstaged; do not provision Liara or contact Sadad.
  - Result: the clean client-output assertion unblocked all four OCI image builds; non-root runtime config, one-shot
    migration and API liveness/readiness pass. Production Compose fails before startup at line 27 because its inline
    mapping contains an unquoted `${VAR:?message}` with `:`. The run-owned Docker containers/networks were removed.
  - Current execution: all required Compose interpolations are quoted and API/web/app/dashboard environments use
    block mappings; `docker compose config` resolves with synthetic values. All four images rebuilt and the
    disposable migration passed, but the Compose API container rejected deliberately non-secret yet malformed AES and
    keyring test values before reaching health. The three Next services were healthy/non-root. All run-owned
    containers, network and images were removed.
  - Review: PASS — the owner-approved pinned Distroless Node 24 Debian 13 non-root final base, numerical
    `65532:65532` ownership, Node-only API/Next entrypoints, clean API-client assertion, explicit Prisma JavaScript
    migration, runtime-config promotion, Compose health and Liara documentation-profile gates all pass. Docker Scout
    reports `0 Critical / 0 High` for each of API, web, app and dashboard. All run-owned Docker resources were
    removed. F12-T07 remains unstaged and outside this commit. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible work: no batch is started. F12-T05 and F12-T07 remain external-evidence blockers; do not start B05.

## batch تکمیل‌شده — F12-B04-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE` (single-task corrective override compatibility experiment)

- Task ID: `F12-T08`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01` and `F12-T02` DONE; no active ownership conflict. F12-T07’s uncommitted secret-rotation
    work remains preserved and excluded from every T08 stage/commit. The experiment owns only the bounded root
    `pnpm.overrides` entries, corresponding lockfile paths and T08 scan/evidence/status hunks. It tests the
    registry-stable advisory versions `deepmerge-ts@8.0.2` (GHSA-ggr8-5vv4-36mx requires >=8.0.0) and
    `mysql2@3.24.5` (GHSA-3f6p-5ww8-9rcr requires >=3.22.0), without Prisma 8 or MySQL configuration. Frozen
    install, Prisma validate/generate, fresh disposable PostgreSQL migration/replay, typechecks, affected tests/build,
    abuse suite and final audit passed. The final audit is `0 critical`, `0 high`, `5 moderate`, `0 low`; T08 is
    accepted. No B05 work is authorized.

## batch نیازمند بازکاری — F12-B04-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK` (single-task corrective batch closed without completion commit)

- Task ID: `F12-T08`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked; claim released)`
  - Depends on: `F12-T01` and `F12-T02` DONE; no active task ownership conflict. F12-T07’s uncommitted secret-rotation
    work is preserved but excluded from every T08 stage/commit. Owned resource: dependency/lockfile remediation,
    scan results and abuse verification. The source audit had 30 unique GHSA advisories, represented by 35
    advisory-plus-patched-version entries across 47 advisory-path occurrences (18 unique dependency paths). The serialized Next, Nest/Fastify and bounded
    transitive remediation removes all critical findings, but the final production audit is `0 critical`, `2 high`,
    `6 moderate`, `0 low`: Prisma 7.10.0 still resolves `deepmerge-ts@7.1.5` (GHSA-ggr8-5vv4-36mx; patched >=8.0.0)
    and `mysql2@3.15.3` (GHSA-3f6p-5ww8-9rcr; patched >=3.22.0). No compatible stable parent upgrade exists;
    Prisma 8 is pre-release/major and was not adopted blindly. Exact next action: owner-approved Prisma-major
    compatibility remediation or wait for a compatible stable Prisma release, then rerun the final audit and abuse
    suite. No B05 work is authorized.

## آخرین batch نیازمند بازکاری — F12-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK/BLOCKED` (closed without a successor batch)

- Task ID: `F12-T04`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T03` DONE. Disposable query-plan, bounded-pool saturation and controlled timeout-recovery
    checks passed. The accepted T03 result has no measured query/pool/timeout bottleneck, so no runtime setting,
    index, datastore or topology was changed. Owned resource: query-plan, pool/timeout code/tests and T04-only
    evidence.
- Task ID: `F12-T07`
  - Agent/Thread: `Codex /root`
  - Status: `BLOCKED (unchecked; claim released)`
  - Depends on: `F12-T01` and `F12-T02` DONE. Software-level versioned key rotation, validation and synthetic
    continuity tests are prepared, but acceptance requires written Liara managed-secret-store capability and an
    authorized environment drill. That evidence is absent and remains a F12-T13 sign-off gate. Owned resource:
    secret inventory/rotation procedure, secret-template boundary and key-rotation test/evidence.
- Task ID: `F12-T08`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked; claim released)`
  - Depends on: `F12-T01` and `F12-T02` DONE. Corrective serialized remediation reduced the production audit from
    10 critical/37 high to 0 critical/2 high, but did not and may not mute or waive the remaining Prisma transitives:
    `deepmerge-ts@7.1.5` (GHSA-ggr8-5vv4-36mx; patched >=8.0.0) and `mysql2@3.15.3`
    (GHSA-3f6p-5ww8-9rcr; patched >=3.22.0). Exact next action: owner-approved Prisma-major compatibility
    remediation or compatible stable parent release, then rerun audit and abuse coverage. Owned resource: scan
    configuration/results and auth/rate-limit/Sadad callback-redirect/secret-disclosure abuse coverage.

The coordinator serialized the shared Phase 12 checklist, status and evidence updates. T04 received its independent
commit; T07/T08 have no completion commit because their acceptance gates are unresolved. No runtime secret, provider
provisioning, external Sadad request, enable/default, production deployment, push or PR is authorized.

## آخرین batch تکمیل‌شده — F12-B03-R3

Coordinator/Thread: `Codex /root`
Started at: `2026-10-02 +03:30`
Completed at: `2026-10-02 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`

- Task ID: `F12-T03`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01` and `F12-T02` are DONE; no active ownership conflict. `F12-T06` remains accepted and
    excluded; `F12-T05` remains separately BLOCKED and unclaimed.
  - Scope: corrected the capacity-harness token rotation/acceptance diagnosis; recorded the valid frozen mixed result;
    passed a short boundary preflight; then ran only the outstanding frozen chat workload with durable ignored stdout/stderr.
    Mixed, booking conflict, and simulated Sadad invariants were not rerun.
  - Owned paths: F12 capacity harness, run-owned capacity logs and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. No payment runtime, schema/migration,
    dependency, workflow or F12-T05/T06 path.
  - Review: `PASS` — frozen mixed acceptance is `17,990/18,000` (`99.944444%`) and p95 `21.8106ms`, satisfying the
    authoritative `>=99%` and `<=750ms` thresholds. The all-route-2xx assertion is preflight-only. The short boundary
    preflight passed, and the frozen chat execution exited `0` after `2202.78s` with both tests passing, including
    `20 msg/s × 30 min`, a `61s` gap, `50 msg/s × 5 min`, every batch `<=1000ms`, and count/sequence `511` per
    conversation. API typecheck, `git diff --check`, owned-path review and disposable database/container cleanup pass.

## آخرین batch نیازمند بازکاری — F12-B03-R2

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 22:20 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK`

- Task ID: `F12-T03`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked/unclaimed)`
  - Depends on: `F12-T01` and `F12-T02` are DONE; no ownership conflict. F12-T06 remains accepted and excluded;
    F12-T05 remains separately blocked and unclaimed.
  - Scope: after preflight PASS, execute the exact approved mixed authenticated profile once and then the exact frozen
    Phase 10 chat workload serially, each with durable ignored stdout/stderr and exit-code evidence. No booking/Sadad
    rerun without a new cause.
  - Owned paths: F12 capacity harness, run-owned capacity logs and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. No payment runtime, schema/migration,
    dependency, workflow or F12-T05/T06 path.
  - Review: `SUPERSEDED` — R2's frozen mixed metrics, `17,990/18,000` (`99.944%`) and p95 `21.81ms`, meet the only
    authoritative acceptance thresholds. The ten boundary 401s were an iteration-based harness artifact; the prior
    per-route all-2xx assertion was not an authoritative gate. See accepted F12-B03-R3 evidence for the corrected
    expiry-driven rotation, boundary preflight and completed chat workload.

## آخرین batch نیازمند بازکاری — F12-B03-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 18:20 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `REWORK`
Contract baseline: approved mixed/booking capacity profile and frozen Phase 10 chat contract in
`plan/contracts/phase-12-release-envelope.md`, `specs/010-production-hardening/`, accepted F12-T02 at `44667c2`,
and existing payment/booking contracts.

- Task ID: `F12-T03`
  - Agent/Thread: `Codex /root`
  - Status: `REWORK (unchecked/unclaimed)`
  - Depends on: `F12-T01` and `F12-T02` are DONE; no ownership conflict. T06 is accepted and excluded; T05 remains
    unclaimed with its separate host-evidence blocker.
  - Scope: execute the approved mixed authenticated `10 req/s × 30 min`, booking-conflict `2 req/s` one-slot,
    unchanged frozen chat `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, `<=1000 ms` per batch, and
    simulated-only Sadad/financial-idempotency capacity checks. Record historical `1015ms`/`1032ms`, CI isolation and
    scheduled/manual evidence as inputs; do not change workload or thresholds.
  - Owned paths: `apps/api/test/**` capacity harness/evidence only, capacity command documentation if required, and
    coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. No payment runtime,
    schema/migration, provider configuration, dependency, workflow or T05/T06 path.
  - Shared/exclusive resource: the F12 capacity harness and run-owned local PostgreSQL container/databases. Tests are
    serialized; no shared or production database is permitted.
  - Review: `REWORK` — the authoritative mixed run completed 1,800 seconds/18,000 requests with p95 `48.84ms`, but
    only `11,250/18,000` successful requests (`62.5%`); it cannot satisfy the frozen `>=99%` acceptance gate. The
    diagnostic preflight identifies `/v1/me` as 401 because the synthetic patient has no durable session and both
    clinical read journeys as 503 because no clinical fixture exists. The booking/Sadad invariants passed on a separate
    disposable child database. No frozen threshold/workload changed; no chat result was available to accept.
  - Safe next action: build valid session and clinical fixtures for all selected release journeys, rotate the capacity
    token before the post-profile booking check, rerun preflight, then rerun only the approved mixed profile and the
    still-unverified frozen chat profile with durable logs. Do not claim a new batch until this REWORK is reviewed.

## آخرین batch تکمیل‌شده — F12-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 17:35 +03:30`
Completed at: `2026-10-01 17:45 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE (REDUCED)`
Contract baseline: `plan/contracts/phase-12-release-envelope.md`, frozen `specs/010-production-hardening/`,
`plan/04-ENGINEERING-STANDARDS.md`, and accepted F12-T02 evidence at `44667c2`.

- Task ID: `F12-T06`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01 DONE`; no ownership conflict. F12-T02 remains accepted but is not a dependency of this task.
  - Scope: inventory actual API/app/dashboard/package file consumers and record whether object storage remains N/A. Do
    not add a bucket, storage SDK, upload endpoint, schema, dependency, retention job, or configuration without an
    approved real consumer.
  - Owned paths: storage-decision evidence/contract and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
  - Shared/exclusive resource: the Phase 12 object-storage decision is single-writer; it does not overlap F12-T03's
    load harness or F12-T05's recovery procedure.
  - Expected verification: source/API/schema consumer inventory, deferred-chat/architecture contract cross-check,
    no-storage-dependency/configuration diff review, and `git diff --check`.
  - Review: `PASS` — current API/app/dashboard/web/package/deployment consumers contain no real upload, attachment,
    medical-file or binary consumer; no multipart/upload transport, storage persistence model, object-store SDK,
    bucket configuration or secret exists. The only attachment-related persistence migration explicitly defers it.
    `N/A` is documented with a mandatory re-entry review; no object-storage infrastructure, dependency, schema,
    configuration or secret was introduced. Evidence: [`contracts/phase-12-object-storage-decision.md`](contracts/phase-12-object-storage-decision.md)
    and [`logs/phase-12.md`](logs/phase-12.md).

Excluded, unchecked tasks and exact next action:

- `F12-T03 BLOCKED`: Docker Desktop client is installed but `dockerDesktopLinuxEngine` is not running; no `postgres`,
  `initdb`, or PostgreSQL service is present. Start Docker Desktop (or supply a local disposable PostgreSQL runtime),
  then create a run-owned database and execute the frozen capacity profiles. Do not use a shared or production-like
  database as a substitute.
- `F12-T05 BLOCKED`: obtain written Liara evidence covering daily base backup retention, continuous WAL/archive,
  restore/PITR procedure and supported RPO/RTO before claiming recovery acceptance. The official CLI supports manual
  backup create/list/download, but that is insufficient evidence for the approved recovery objective.

## آخرین batch تکمیل‌شده — F12-B02-R1

Coordinator/Thread: `Codex /root`
Started at: `2026-10-01 00:05 +03:30`
Completed at: `2026-10-01 17:20 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `plan/contracts/sadad-ipg-v1.md`, `plan/contracts/phase-12-release-envelope.md`, frozen
`specs/010-production-hardening/`, and the original F12-T02 completion commit `24cee87` (which will not be rewritten).

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01 DONE`; no other active batch or ownership conflict existed before this corrective claim.
  - Defect: request `Amount` and `OrderId` used `bigint.toString()` and were then emitted by `JSON.stringify` as JSON
    strings, contrary to the frozen `Number` / `Number(Long)` contract. `response.json()` could also lose precision for
    provider financial integers before `verifyPayment` compares them.
  - Scope: preserve exact bounded integer lexical values as JSON number tokens on the real transport boundary; preserve
    numeric response precision until financial parsing; update affected tests to inspect local/simulated-fetch wire
    payloads; diagnose and, if preparation-caused, repair the workspace `@sabz-zendegi/api-client` resolver failure.
    No real Sadad request, provider activation/default, credential, provisioning, deployment, push, PR, schema,
    migration, dependency, workflow, or F12-B03 work.
  - Owned paths: `apps/api/src/modules/commerce/payments/sadad-payment-provider.adapter.ts`,
    `apps/api/test/sadad-payment-provider.adapter.spec.ts`, and coordinator-only
    `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`. Package build artifacts may be regenerated
    locally for verification but are not task source or commit content.
  - Shared/exclusive resource: Sadad adapter/transport and F12 status/evidence are single-writer resources for this
    corrective batch. `F12-B03` remains unclaimed.
  - Review: `PASS` — the real Fetch transport writes `Amount` and `OrderId` as unquoted exact integer JSON literals
    without converting bigint to Number, rejects unsafe or out-of-range values before fetch, and parses raw successful
    responses so `Amount`/`OrderId` retain their lexical int64 values before Verify financial matching. A loopback HTTP
    server proves both normal and boundary wire payloads; no Sadad endpoint was contacted. The workspace resolver
    failure was caused only by the missing ignored `packages/api-client/dist` artifact in this new worktree; the
    workspace junction was correct, package build recreated the artifact, and dashboard test/typecheck pass. No
    schema, migration, dependency, workflow, activation/default, credential, provisioning, deployment, push, PR, or
    F12-B03 work occurred. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible batch: `F12-B03` (`F12-T03`, `F12-T05`, `F12-T06`), unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F12-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-30 22:12 +03:30`
Completed at: `2026-09-30 23:06 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Batch status: `DONE`
Contract baseline: `plan/contracts/phase-12-release-envelope.md`, frozen `specs/010-production-hardening/`,
`b7f84b8` F12-T02 change control, and existing Phase 09 payment contracts.

- Task ID: `F12-T02`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F12-T01 DONE`; no active batch, task, blocker, or ownership conflict at claim time.
  - Scope: deployment/staging artifact-promotion/rollback preparation and the approved gap-only Sadad software path:
    transport, request/redirect/callback/Verify wiring, timeout/ambiguous outcome, retry, reconciliation, idempotency,
    config validation, safe env-template documentation and tests. No purchase/provisioning, external Sadad call,
    enable/default, production deployment, real secret, push or PR.
  - Owned paths: deployment/container/IaC/release documentation, `apps/api/src/modules/commerce/payments/**`, payment
    controllers, API contract/client when changed, `apps/api/.env.example`, local ignored `.env` placeholders, focused
    payment tests, and coordinator-only `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,logs/phase-12.md}`.
  - Shared/exclusive resource: payment adapter/orchestration/config/API-contract and deployment release-path surfaces;
    no other task may write them in this batch.
  - Review: `PASS` — the Liara staging/promotion/rollback path is recorded without provisioning; the completed Sadad
    protocol adapter supports only explicitly injected simulation while Nest runtime stays `SADAD_GO_LIVE_BLOCKED`.
    Request/redirect/callback/Verify parsing, RIAL/order/amount matching, timeout-to-reconciliation, same-attempt
    retry, duplicate-safe Verify and redaction boundaries are covered. Encrypted credential revision storage remains
    unchanged; `.env.example` validates non-secret settings and a local ignored template contains no real secret.
    No schema/migration/dependency/workflow, external Sadad request, provider enable/default, provisioning,
    production deployment, push or PR occurred. Evidence: [`logs/phase-12.md`](logs/phase-12.md).
  - Remaining release gates: the project owner must obtain Liara static outbound-egress confirmation and merchant
    acceptance evidence; these block real connection/enable/default/payment sign-off only, not this accepted task.
  - Next eligible batch: `F12-B03` (`F12-T03`, `F12-T05`, `F12-T06`), unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F12-B01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-30 21:52 +03:30`
Phase: `12-PRODUCTION-HARDENING`
Completed at: `2026-09-30 22:00 +03:30`
Batch status: `DONE`
Contract baseline: frozen `specs/010-production-hardening/`, owner-approved Liara/staging/production/recovery/
availability decisions, and `b7f84b8` Sadad F12-T02 extension change control.

- Task ID: `F12-T01`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: Phase 10 and Phase 11 `DONE (CLOSED)`; no active batch, task, blocker, or ownership conflict at claim time.
  - Scope: record the approved target release, capacity and availability objectives, environment strategy, external gates,
    owners and change-control boundary as the executable F12-T01 release envelope. No provider purchase/provisioning,
    external Sadad request, secret, runtime/schema/migration/dependency/workflow change, deployment, push or PR.
  - Owned paths: `plan/{STATUS.md,phases/12-PRODUCTION-HARDENING.md,contracts/phase-12-release-envelope.md,logs/phase-12.md}`.
  - Shared/exclusive resource: Phase 12 release-decision record and status/checklist/evidence coordination; later tasks must
    consume this record and may not alter it without approved change control.
  - Review: PASS — the executable release envelope preserves all owner-approved Liara, staging/production, manual
    promotion/rollback, capacity, availability, recovery, secrets, object-storage N/A and Sadad boundaries. It assigns
    every external dependency to its consuming future task without treating it as completed evidence. No runtime,
    schema, migration, dependency, workflow, provisioning, connection, activation, secret, push or PR was added.
    Evidence: [`contracts/phase-12-release-envelope.md`](contracts/phase-12-release-envelope.md) and
    [`logs/phase-12.md`](logs/phase-12.md).
  - Next eligible work: `F12-B02` / `F12-T02`, unclaimed.

## آخرین batch تکمیل‌شده — F10-R36-CI-CAPACITY-ISOLATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-29 18:55 +03:30`
Phase: `10-CHAT-CONSULTATION`
Completed at: `2026-09-29 19:12 +03:30`
Batch status: `DONE`
Contract baseline: frozen F10-T09 20 msg/s × 30 min, 61-second gap, 50 msg/s × 5 min, and per-batch `<= 1000ms`
criterion; the two observed CI/local timing failures (`1015ms`, `1032ms`) and Phase 10 evidence.

- Task ID: `F10-T09 REWORK`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: all original F10-T09 prerequisites and Phase 10 closure evidence are accepted; no active batch or
    blocker existed before this claim.
  - Scope: remove only the long synthetic capacity workload from the ordinary `pnpm test` path; retain it unchanged
    behind an explicit `test:capacity` command and a separate scheduled/manual-or-chat-change CI workflow.
  - Owned paths: `package.json`, `apps/api/package.json`, `.github/workflows/{ci.yml,chat-capacity.yml}`, and
    coordinator-only `plan/{STATUS.md,phases/10-CHAT-CONSULTATION.md,logs/phase-10.md}`.
  - Shared/exclusive resource: workspace/API test scripts and GitHub Actions workflow configuration; no runtime,
    schema, migration, dependency, lockfile, Phase 11, or Phase 12 path.
  - Expected verification: ordinary `pnpm test`, workspace typecheck, targeted disposable-PostgreSQL capacity
    preflight, workflow syntax/trigger review, and `git diff --check`.
  - Review: PASS — the ordinary workspace suite excludes only the frozen long capacity file and passed 91 API files/
    373 API tests in 7m29s; the unchanged capacity bootstrap preflight passed on a run-owned PostgreSQL database.
    `test:capacity` and the separate `Chat capacity` workflow preserve the full workload for schedule/manual and
    chat/capacity-relevant PR or main changes. No runtime, schema, migration, dependency, lockfile, Phase 11, or
    Phase 12 path changed. Evidence: [`logs/phase-10.md`](logs/phase-10.md).
  - Next eligible work: Phase 12 remains `NOT_STARTED`; no task or batch is selected or claimed.

## آخرین batch تکمیل‌شده — F11-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 23:55 +03:30`
Completed at: `2026-09-29 00:21 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/`, Phase 11 roadmap, `F11-T01` through `F11-T10` accepted
evidence, and the formal pre-implementation reviewer gate.

- Task ID: `F11-T11`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T01` through `F11-T10` DONE; no active batch or blocker at claim time.
  - Scope: independent requirement-by-requirement Phase 11 review and closure evidence only. The required migration,
    contract/client, PostgreSQL, authorization/audit/reporting/CRM, dashboard, browser, history, protected-path, and
    SpecKit traceability checks passed with no closure-owned or predecessor defect.
  - Owned paths: coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}` and any
    closure-review checklist/evidence explicitly required by the frozen plan. All runtime, schema/migration,
    dependency/lockfile, generated-client, dashboard/product, and Phase 12 paths are review-only.
  - Shared/exclusive resource: final Phase 11 status/checklist/evidence and run-owned disposable PostgreSQL databases.
    No other task or batch may write Phase 11 closure state.
  - Review: PASS — all required typecheck/build, OpenAPI/client, disposable PostgreSQL migration and 40-test API
    suites, normal dashboard Vitest (18 files/61 tests), independent Playwright (7/7), and diff/history isolation
    checks passed. The closure commit owns documentation/status/evidence only. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible work: `Phase 12` is `NOT_STARTED`; no task or batch is selected or claimed.

## آخرین batch تکمیل‌شده — F11-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 22:38 +03:30`
Completed at: `2026-09-28 23:16 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: owner-approved CRM change control in [`specs/009-reporting-access/`](../specs/009-reporting-access/),
including `FR-023`, `FR-027–033`, `SC-008–010`, and
[`contracts/customer-crm-api.md`](../specs/009-reporting-access/contracts/customer-crm-api.md).

- Task ID: `F11-T10`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T07` and `F11-T09` DONE; `F11-T01` through `F11-T09` accepted before claim.
  - Result: real, read-only, clinic-scoped operational customer CRM is delivered inside the existing commerce domain.
    It requires an active persisted ADMIN session and pre-existing `ClinicalClinicAccess`, derives only its approved
    non-medical projection from canonical `PatientProfile`, `UserProfile`, Payment, Refund, and order-line records,
    validates bounded query input, and audits each disclosed patient with fixed redacted provenance.
  - Review: PASS — integration on a migrated-and-seeded disposable PostgreSQL database proves payment/refund math,
    deterministic segments, integer-truncated TOMAN summary, search/filter/sort/pagination validation, clinic denial,
    PATIENT/DOCTOR/STAFF denial, disabled/revoked/expired session denial, and non-sensitive audit metadata. API/client
    freshness, API/dashboard typechecks, ordinary dashboard Vitest (18 files/61 tests), independent Phase 11
    Playwright (7/7), and `git diff --check` passed. The only Vitest configuration change excludes `e2e/**`; the
    Playwright suite remains intact. No schema, migration, aggregate, dependency, lockfile, shared-auth, marketing,
    export, campaign, saved-segment, audience, bulk-message, or medical-profiling surface changed. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T11`, unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F11-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 17:32 +03:30`
Completed at: `2026-09-28 18:16 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-017–022`, `SC-005`,
`contracts/authorization-matrix.md`, and `quickstart.md`), with `F11-T01` through `F11-T08` DONE.

- Task ID: `F11-T09`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T07` DONE; `F11-T01` through `F11-T08` accepted; no active batch or blocker at claim time.
  - Scope: prove the frozen ADMIN-only reporting/audit access matrix at backend and browser boundaries, including
    denied roles, disabled/revoked ADMIN sessions, tenant/clinic isolation, medical-ownership limits, and no API/UI/
    export disclosure. This batch adds verification only; it does not expand the release capability.
  - Owned paths: `apps/api/test/reporting-authorization.integration.spec.ts`,
    `apps/dashboard/e2e/phase-11-access.spec.ts`, `playwright.phase11.config.ts`, and coordinator-only
    `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`.
  - Shared/exclusive resource: the new authorization-matrix test and browser E2E suite plus their run-owned
    disposable PostgreSQL databases. `common/auth`, audit/report runtime modules, schema/migrations, OpenAPI/client,
    dashboard session gate, dependencies/lockfile, and CRM/segmentation remain outside this task.
  - Review: PASS — the run-owned PostgreSQL matrix proves ADMIN access only for the active clinic-scoped report,
    revenue, and redacted audit routes; PATIENT/DOCTOR/STAFF receive no protected disclosure; disabled/revoked
    ADMIN sessions receive `401`; an inactive foreign clinic and foreign medical workspace remain denied; export
    routes do not exist. Browser E2E proves the same direct-navigation boundary before dashboard UI disclosure.
    Workspace typechecks and API-client/OpenAPI freshness passed, with no runtime authorization, schema, migration,
    dependency, generated-client, or later-task path change. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T10`, unclaimed. Stop before starting it.

## آخرین batch تکمیل‌شده — F11-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 17:22 +03:30`
Completed at: `2026-09-28 17:26 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-016`, `FR-017`, `FR-024–026`, `SC-003`,
`contracts/conditional-exclusions.md`, and `contracts/authorization-matrix.md`), with `F11-T01` through
`F11-T08` DONE after review.

- Task ID: `F11-T08`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T07` DONE; no active batch or blocker at claim time.
  - Scope: prove the confirmed release exclusion of staff membership/invitation and capability menus; preserve the
    ADMIN-only admission boundary and add no membership, invitation, role mutation, route, UI capability, email,
    export, schema, migration, dependency, or generated-client surface.
  - Owned paths: `apps/api/test/phase-11-exclusions.spec.ts`, `apps/dashboard/src/auth/session.test.ts`, and
    coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`.
  - Shared/exclusive resource: exclusion evidence tests and disposable PostgreSQL test database. `common/auth`,
    schema/migrations, OpenAPI/client, final authorization matrix/browser E2E, and CRM remain owned by other tasks.
  - Review: PASS — source, schema, migration-name, and checked-in OpenAPI inspection prove no staff
    membership/invitation mutation, capability menu, role builder, or report/audit export surface was introduced.
    Dashboard refresh clears a `STAFF` bearer token and retains no authenticated snapshot. Backend ADMIN-only policy,
    reporting/audit tenant/clinic isolation, redaction, and disabled/revoked-session regression all passed on a
    disposable PostgreSQL database. Workspace typechecks and API-client contract freshness passed; no runtime,
    schema, migration, dependency, generated-client, or later-task path changed. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible tasks: `F11-T09` and `F11-T10`; both remain unclaimed. Stop before starting either task.

## آخرین batch تکمیل‌شده — F11-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 17:03 +03:30`
Completed at: `2026-09-28 17:14 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-016–019`, `SC-003–004`,
`contracts/authorization-matrix.md`), with `F11-T01` through `F11-T06` DONE.

- Task ID: `F11-T07`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T06` DONE; no active batch or blocker at claim time.
  - Scope: froze ADMIN-only dashboard/admin admission and shared backend authorization enforcement while preserving
    patient self-service and the existing tenant/clinic, medical-ownership, audit-redaction, and session controls.
  - Owned paths: `apps/api/src/common/auth/{access-token.guard,authorization.guard,authorization.policy,release-admin-session.guard,auth.module}.ts`,
    focused T07 authorization tests under `apps/api/test/`, `apps/dashboard/src/auth/{session,session.test}.ts`, and
    coordinator-only `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`.
  - Shared/exclusive resource: `common/auth` policy/guards and disposable PostgreSQL authorization test database.
    T009 remains the sole owner of the final full authorization-matrix and browser E2E suites.
  - Review: PASS — `DOCTOR` and `STAFF` no longer receive `DASHBOARD_ACCESS`; dashboard admission is ADMIN-only.
    A global shared guard requires a persisted active, unrevoked, unexpired session for every ADMIN request before
    controller execution. Focused unit tests, full workspace typechecks, real disposable PostgreSQL reporting/audit
    integrations, and revenue regression passed. No schema, migration, dependency, endpoint, generated client,
    membership/invitation, CRM, export, browser E2E, or later-task path changed. Evidence:
    [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible tasks: `F11-T08`, `F11-T09`, and `F11-T10`; all remain unclaimed. Do not start another task in
    this batch.

## آخرین batch تکمیل‌شده — F11-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-28 02:49 +03:30`
Completed at: `2026-09-28 03:06 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: `F11-T01` through `F11-T05` DONE; frozen `specs/009-reporting-access/` (`FR-020–021`,
`SC-005`, `contracts/audit-viewer.md`, and `contracts/authorization-matrix.md`).

- Task ID: `F11-T06`
  - Agent/Thread: `Codex /root`
  - Status: `DONE`
  - Depends on: `F11-T05` DONE; no active batch or blocker at claim time.
  - Scope: deliver the minimum-necessary ADMIN audit viewer/support read under `apps/api/src/modules/identity/audit/`
    and `apps/dashboard/src/features/audit/`, with an authorized, clinic-scoped redacted cursor page and sensitive
    read audit. No export, raw metadata, unbounded search, or support mutation is included.
  - Owned paths: `apps/api/src/modules/identity/audit/**`, `apps/api/src/modules/identity/identity.module.ts`,
    `apps/api/test/audit-viewer.integration.spec.ts`, `apps/dashboard/src/features/audit/**`,
    `apps/dashboard/src/app/(app)/audit/page.tsx`, `apps/dashboard/src/lib/audit-viewer-api.{ts,spec.ts}`, generated
    `packages/api-client/{openapi.json,src/schema.generated.ts}` only through the endpoint owner, and coordinator-only
    `plan/{STATUS.md,phases/11-REPORTING-ACCESS.md,logs/phase-11.md}`. Any schema/migration or shared auth change is
    excluded unless separately proved required by the frozen contract and assigned to this task.
  - Shared/exclusive resource: audit-viewer route/contract and API-client generation; disposable PostgreSQL test DB.
    `common/auth` policy/guard and broader release authorization matrix remain exclusively deferred to `F11-T07`.
  - Review: PASS — the endpoint is ADMIN-only and checks an active, unrevoked session before query execution;
    `PatientAccessAudit` is queried only with an explicit active-clinic predicate and returned solely through the
    redacted cursor projection. The generic `AuditEvent` table is deliberately not queried because it has no clinic
    provenance. The viewer audits each disclosed clinical event through the existing clinical-audit writer; it exposes
    no export/raw metadata path. No schema, migration, dependency, shared `common/auth` policy/guard, role matrix,
    CRM, browser E2E, or later-task work changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T07` only, unclaimed; do not start it in this task.

## آخرین batch تکمیل‌شده — F11-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 22:42 +03:30`
Completed at: `2026-09-28 02:42 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: `F11-T01` through `F11-T04` DONE; frozen `specs/009-reporting-access/` (`FR-015`, `SC-006`,
`research.md`, `quickstart.md`, `data-model.md`, and `contracts/reporting-api.md`).

- Task ID: `F11-T05`
  - Status: `DONE`
  - Scope: captured and replayed `EXPLAIN (ANALYZE, BUFFERS)` for 18 actual clinic-scoped report query shapes across
    appointments, patient/onboarding population, assessments, treatments, and operational commerce revenue.
  - Review: PASS — a migrated-and-seeded run-owned PostgreSQL database reported explicit clinic scope on every plan,
    deterministic replay, and no reproduced bottleneck. The direct-query baseline is accepted; no index, aggregate,
    schema, migration, OpenAPI/client, endpoint, dashboard, authorization, role, audit, CRM, browser-E2E, or later
    task path changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T06` only, unclaimed.

## آخرین batch تکمیل‌شده — F11-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 22:05 +03:30`
Completed at: `2026-09-27 22:36 +03:30`
Phase: `11-REPORTING-ACCESS`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-002–003`, `FR-012–013`, `SC-002–003`,
`contracts/kpi-inventory.md`, and `contracts/reporting-api.md`).

- Task ID: `F11-T04`
  - Status: `DONE`
  - Scope: Dashboard Home now reads only ADMIN-authorized, inventory-approved reporting sources and exposes
    truthful loading/error/forbidden/empty/zero/partial/stale states without a substitute value.
  - Review: PASS — final Home composition is KPI-01–05, KPI-09, KPI-11, KPI-14–15, KPI-19, and KPI-21 plus the
    permitted today appointment and limited operational-activity lists. KPI-21 is supplied by the existing commerce
    reporting endpoint as a clinic-scoped `Refund{REQUESTED, APPROVED}` snapshot rather than inferred in the client.
    No schema/migration, aggregate/index, shared authorization/session infrastructure, navigation, role/staff,
    audit, CRM, browser E2E, or provider activation changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T05` only, unclaimed.

## آخرین batch تکمیل‌شده — F11-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 21:24 +03:30`
Phase: `11-REPORTING-ACCESS`
Completed at: `2026-09-27 21:30 +03:30`
Batch status: `DONE`
Contract baseline: frozen `specs/009-reporting-access/` (`FR-005–006`, `SC-004`,
`contracts/kpi-inventory.md`, and `contracts/reporting-api.md`).

- Task ID: `F11-T03`
  - Status: `DONE`
  - Scope: existing ADMIN commerce revenue route and dedicated revenue view reconciled with the operational
    verified-Payment minus completed-Refund `TOMAN` contract; no Sadad production acceptance/settlement claim.
  - Review: PASS — explicit clinic scope and response provenance added; `WEEK` granularity, operational label,
    real-source empty/error/forbidden states, OpenAPI/client freshness, and disposable-PostgreSQL evidence passed.
    No schema/migration, aggregate, common authorization, Dashboard Home, provider activation, or network transport
    changed. Evidence: [`logs/phase-11.md`](logs/phase-11.md).
  - Next eligible task: `F11-T04` only, unclaimed.

## آخرین batch تکمیل‌شده — F11-B01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-27 16:18 +03:30`
Phase: `11-REPORTING-ACCESS`
Completed at: `2026-09-27 16:27 +03:30`
Batch status: `DONE`
Contract baseline: `fa2285ad docs(spec): freeze phase 11 reporting access baseline`,
[`specs/009-reporting-access/`](../specs/009-reporting-access/)

Tasks:

- Task ID: `F11-T01`
  - Status: `DONE`
  - Depends on: `none`
  - Scope: preserve the frozen KPI/widget inventory as typed response metadata only in the existing patient,
    appointment, assessment, clinical treatment-plan, clinical treatment-activity, and commerce-reporting domain
    DTO modules. This is the response-contract foundation; it does not add reporting routes, queries, dashboard UI,
    authorization changes, migrations, OpenAPI/client generation, or aggregates.
  - Owned paths: `apps/api/src/modules/patients/admin/admin-patients.dto.ts`,
    `apps/api/src/modules/appointments/admin-appointments.dto.ts`,
    `apps/api/src/modules/assessments/admin/admin-assessment-submissions.dto.ts`,
    `apps/api/src/modules/clinical/treatment-plan-response.dto.ts`,
    `apps/api/src/modules/clinical/treatment-activity-response.dto.ts`,
    `apps/api/src/modules/commerce/reporting/commerce-revenue.dto.ts`, one focused API contract test path if required,
    and coordinator-only `plan/{STATUS.md,logs/phase-11.md,phases/11-REPORTING-ACCESS.md}`.
  - Shared/exclusive resource: the six existing domain response contracts; OpenAPI output and generated clients stay
    exclusively deferred to their declared later endpoint owner.
  - Verification: API source and test typechecks, focused metadata-contract regression (2/2), isolated PostgreSQL
    migration smoke (3/3), frozen inventory cross-check, and `git diff --check` all passed.
  - Contract: every released widget must carry its frozen identifier, formula, data owner, PostgreSQL/API source of
    truth, explicit tenant/clinic scope, `Asia/Tehran` timezone, and zero/partial/stale-data behavior. Do not invent
    KPI semantics or create a central reporting module.
  - Result: all KPI-01–21 definitions are exported from their existing domain DTO owners and the focused regression
    proves exactly one complete, PostgreSQL-backed, tenant/clinic-scoped, Tehran-calendar metadata entry per KPI.
    Evidence: [`logs/phase-11.md`](logs/phase-11.md).

## آخرین batch — F10-R36-CI-CAPACITY-RATE-LIMIT-INDEXES

Coordinator/Thread: `Codex (managed worktree)`
Started at: `2026-09-27 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — local persistence/capacity gates passed; PR #15 CI recheck pending; Phase 10 remains CLOSED`
Baseline: `b7b6605 test(F10-T09): make capacity bootstrap portable`

- Task IDs: `F10-T02 REWORK (rate-limit persistence indexes)` and `F10-T09 REVALIDATION`
- Scope: add only the two PostgreSQL indexes required by the frozen sender/conversation rate-limit windows, prove their query plans on a disposable database, and revalidate the unchanged capacity compiler/typecheck/preflight gates.
- Owned paths: `apps/api/prisma/schema.prisma`, one additive Phase 10 migration, `apps/api/test/chat-migrations.integration.spec.ts`, and Phase 10 evidence/status only.
- Frozen: `20 msg/s × 30m`, the 61-second gap, `50 msg/s × 5m`, the `1000ms` ceiling, all assertions, and the CI workflow remain unchanged.
- Excluded: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, Phase 11, unrelated product behavior and old databases/data.
- Verification: the CI failure was confirmed at the first 50 msg/s batch (`1239ms`). A 36,000-row disposable PostgreSQL diagnostic proved the sender rate-limit query used a full sequential scan and the conversation window revisited heap rows; the two matching indexes changed both predicates to index-only scans. Prisma validate/generate, test compiler, API typecheck, the focused Phase 10 migration test (1/1), full migration smoke (3/3), and the short 100/300/600 PostgreSQL/Socket.IO preflight (1 passed, long workload skipped) all passed; `git diff --check` passed.
- Cleanup: both standalone SQL diagnostic databases were dropped and the successful capacity preflight removed its run-owned database. Four retained `sabz_zendegi_chat_capacity_*` databases were observed after the earlier configuration-only preflight abort; because no trustworthy before-snapshot identified ownership, they were left untouched as required. No old database or data was deleted.
- Next action: push the isolated commit and let GitHub Actions provide the only next full 20/50 capacity execution. If CI is green and no review blocker exists, merge PR #15 with a merge commit; do not start Phase 11.

## آخرین batch — F10-R35-CI-CAPACITY-PORTABILITY

Coordinator/Thread: `Codex (managed worktree)`
Completed at: `2026-09-26 08:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — local portability gates passed; PR #15 CI recheck pending; Phase 10 remains CLOSED`
Baseline: `ebca431 test(F10-T09): renew capacity fixture against persisted sessions`

- Task ID: `F10-T09 REWORK (capacity bootstrap portability)`
  - Scope: make the deferred application bootstrap import resolve under TypeScript/Node16 and Linux CI while preserving the disposable-database-before-AppModule ordering.
  - Changed path: `apps/api/test/chat-capacity.load.spec.ts`, plus Phase 10 evidence/status only.
  - Verification: exact CI TypeScript failure reproduced before the fix; test compiler and API typecheck PASS after the fix; focused real-PostgreSQL bootstrap/Socket.IO capacity scenario PASS (1 passed, long rate test skipped); `git diff --check` PASS.
  - Result: dynamic bootstrap now uses the Node16-compatible `.js` module specifier. Product code, authorization, workflow, rate, duration, 61-second gap and 1000ms threshold are unchanged. The accepted full capacity run was not repeated locally.
  - Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain outside this task.
- Next action: push the isolated commit and let GitHub Actions provide the only next full capacity execution. Do not merge or start Phase 11.

## آخرین batch — F10-R34-CI-CAPACITY-SESSION

Coordinator/Thread: `Codex (this session)`
Completed at: `2026-09-25 23:55 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated F10-T09 commit; Phase 10 remains CLOSED`
Baseline: `1a7c3ae docs(F10-CLOSE): close chat consultation phase after security review`

- Task ID: `F10-T09 REWORK (capacity fixture persisted session)`
  - Scope: renew synthetic load JWTs against the original persisted patient/doctor sessions. No product authorization, rate, duration, or assertion changed.
  - Owned paths: `apps/api/test/chat-capacity.load.spec.ts`, Phase 10 evidence/status/checklist only.
  - Verification: CI-mirror worktree (`1a7c3ae` + this fix only) with `NODE_ENV=test`, `LOG_LEVEL=error` on a disposable PostgreSQL database → full capacity suite PASS (exit 0; 2/2 tests; 20 msg/s × 30 min + 50 msg/s × 5 min; every per-second batch ≤ 1000 ms; 511 messages per conversation, count == max sequence). API typecheck PASS. Main local database row counts unchanged (read-only before/after snapshot). Disposable database dropped; no orphan test processes. Evidence: [`logs/phase-10.md`](logs/phase-10.md).
  - Result: PR #15 CI failure mode (HTTP 403 instead of 201 after token renewal) is resolved; forged-session negative control still returns 403.
  - Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned and unstaged.
- Next eligible work: Phase 11, `NOT_STARTED` and not claimed here.

## آخرین batch — F10-CLOSE

Coordinator/Thread: `Codex /root`
Completed at: `2026-09-25 03:41 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE (CLOSED)`
Baseline: `b8ff5f8 test(F10-T11): verify durable revocation gates`

- Scope: documentation-only closure after independent security/closure review PASS.
- Result: all F10 tasks and remediation/revalidation commits accepted; Milestone D complete.
- Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned and unstaged.
- Next eligible work: Phase 11, `NOT_STARTED` and not claimed here.

## active batch — F10-R33-DURABLE-REVOCATION-FINAL-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 02:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T11 commit; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `bb69c3e`, `efe5c16`, and `3167815`.

- Task ID: `F10-T11 REVALIDATION (durable revocation fence)`
  - Status: `DONE`
  - Scope: final production build, real Chrome authenticated chat journey, commit isolation/freshness review, and joint audit of every durable session/user revocation path after F10-T03/F10-T04.
  - Owned paths: Phase 10 evidence/status/checklist only unless a final gate exposes an in-scope defect.
  - Verification: `pnpm build` → PASS (5/5 packages); real Chrome `pnpm exec playwright test --config playwright.phase10.config.ts` → PASS (1 test, 18.8s); source/commit isolation and `git diff --check` → PASS. The accepted 40-minute capacity workload was not rerun.
  - Result: all durable paths are post-commit invalidated: logout/explicit session revoke → `disconnectSession`; logout-all/password change/user deactivation → `disconnectUser`; refresh reuse/disabled refresh → `disconnectSession`. The middleware holds user and active-session `FOR SHARE` locks through registration, giving the barrier-tested fail-closed ordering. The first Chrome attempt found only missing web/app local listeners; after starting those unchanged local services, the same unmodified test passed.

## active batch — F10-R32-SOCKET-REVOCATION-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 01:49 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T09 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and `efe5c16`.

- Task ID: `F10-T09 REVALIDATION (durable revocation fence)`
  - Status: `DONE`
  - Scope: rerun the PostgreSQL/Socket.IO regression set after F10-T03/F10-T04, including REST durable-session authorization, handshake/revoke barrier, refresh reuse eviction, reconnect, authorization, moderation, ordering, presence and rate limits.
  - Owned paths: Phase 10 evidence/status/checklist only.
  - Verification: API typecheck, disposable PostgreSQL `chatRevalidation` (8 files, 27 tests), and `git diff --check` → PASS.
  - Result: REST durable-session authorization, handshake/revoke serialization, refresh reuse eviction, reconnect, ordering, moderation/tombstones, authorization, presence and rate limits remain green after `efe5c16`; F10-T11 is next.

## active batch — F10-R31-SOCKET-REVOCATION-FENCE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 01:38 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T04 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and independent P1 review.

- Task ID: `F10-T04 REWORK (durable revocation fence)`
  - Status: `DONE`
  - Scope: serialize persisted session validation/registration against revocation and notify the local Socket.IO registry after every durable revocation path, with real PostgreSQL/Socket.IO barrier and refresh-reuse regressions.
  - Owned paths: chat gateway/registry boundary, identity revocation use cases and focused gateway/identity tests, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: Socket.IO identity handshake and session lifecycle; serialized after F10-T03.
  - Verification: API typecheck → PASS; focused identity unit tests → PASS (18); disposable PostgreSQL `chatRevalidation` → PASS (8 files, 27 tests); `git diff --check` → PASS.
  - Result: the handshake locks the active session through registration, so a concurrent revoke either rejects it or disconnects it after commit. Logout, session management, logout-all, user deactivation, refresh reuse/disabled refresh, and password change all now reach local socket invalidation only after their durable change commits.

## active batch — F10-R30-REST-SESSION-AUTHORIZATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:30 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T03 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and independent P1 review.

- Task ID: `F10-T03 REWORK (persisted session authorization)`
  - Status: `DONE`
  - Scope: require an active persisted principal session on all chat REST authorization paths, with real PostgreSQL history/send regressions; no Socket.IO lifecycle or shared identity invalidation changes.
  - Owned paths: chat service and focused REST/integration tests, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: chat REST authorization and serialized PostgreSQL test environment.
  - Verification: disposable PostgreSQL `outboxAfterChat` → PASS (2 files, 4 tests); API typecheck and `git diff --check` → PASS.
  - Result: chat actor authorization requires an unrevoked, unexpired session owned by `principal.sessionId`; the real REST regression proves the same signed JWT can neither read history nor create a message after session-management revocation.

## active batch — F10-R29-DISABLED-USER-FINAL-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:13 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T11 commit; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `12f84ce`, and `3442992`.

- Task ID: `F10-T11 REVALIDATION (disabled user Socket.IO)`
  - Status: `DONE`
  - Scope: final build, real Chrome authenticated chat journey, freshness/isolation checks and joint session-revoke/deactivation review.
  - Verification: workspace build → PASS (5/5 packages); `pnpm exec playwright test --config playwright.phase10.config.ts` → PASS (1 real Chrome text-chat test, 7.3s); `git diff --check` → PASS.
  - Result: session logout/revoke remains post-persistence `disconnectSession`, logout-all remains post-persistence `disconnectUser`, and the new durable deactivation owner performs transaction-then-`disconnectUser`; the shared locked handshake prevents an analogous race. The accepted 40-minute capacity evidence remains unchanged and was not repeated.

## active batch — F10-R28-DISABLED-USER-SOCKET-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T09 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and `12f84ce`.

- Task ID: `F10-T09 REVALIDATION (disabled user Socket.IO)`
  - Status: `DONE`
  - Scope: focused PostgreSQL/Socket.IO regression proof for session revocation, ACTIVE-user admission, deactivation eviction, reconnect, ordering, authorization, moderation and rate limit.
  - Verification: run-owned disposable PostgreSQL `chatRevalidation` completed with exit code 0; API typecheck and `git diff --check` had already passed for the accepted remediation.
  - Result: targeted behavior remains fail-closed. The frozen 40-minute capacity proof was not repeated because its workload/criterion is unaffected.

## active batch — F10-R27-DISABLED-USER-SOCKET-INVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-25 00:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T04 commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `a860a47`, `18e4fdf`, and `ce5e4d1`.

- Task ID: `F10-T04 REWORK (disabled user socket invalidation)`
  - Status: `DONE`
  - Scope: persisted active-user Socket.IO admission, single-instance durable user deactivation invalidation, and a real PostgreSQL/Socket.IO race proof.
  - Owned paths: identity application/module, chat realtime gateway, focused gateway tests, evidence/status/checklist.
  - Verification: API typecheck and run-owned disposable PostgreSQL `chatRevalidation` suite → PASS (8 files, 24 tests); it includes the real Socket.IO proof for ACTIVE admission, active-session/DISABLED-user rejection, buffered concurrent join/deactivation, post-commit socket disconnect, and no later fan-out.
  - Result: no client heartbeat or additional message is necessary to remove sockets after durable deactivation. The frozen 40-minute capacity criterion was not rerun because send, capacity and topology paths did not change.

## active batch — F10-R22-FINAL-REVOCATION-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-24 19:25 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated F10-T11 commit; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `d35772c`, and `a3c3bd1`.

- Task ID: `F10-T11 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted F10-T04 immediate socket invalidation and F10-T09 targeted revalidation.
  - Scope: final isolated workspace verification, production builds and real Chrome Phase 10 E2E after the gateway lifecycle change; evidence/status/checklist only unless a gate exposes a defect.
  - Owned paths: test/evidence/status/checklist only.
  - Shared/exclusive resource: isolated disposable PostgreSQL, local API/web/app/dashboard processes and Chrome.
  - Verification: Chrome trace confirms `POST /v1/auth/login` sets the refresh cookie for web origin, and `POST /v1/auth/refresh` from app origin sends it and returns 200 with credentialed CORS. The strengthened no-bypass E2E passed (1 test). Captured disposable workspace gate passed with exit code 0: 5/5 Turbo tasks, API 84 files / 347 tests, 40m39.022s. Production workspace build passed (5/5 packages); `git diff --check` passed.
  - Result: the earlier failure was a fixture readiness race: it treated the app URL as authenticated before SessionGate completed its refresh bootstrap. The fixture now waits for the real refresh response and authenticated shell; no auth/product contract changed.

## active batch — F10-R21-SOCKET-REVOCATION-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-24 19:15 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated revalidation commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and `d35772c`.

- Task ID: `F10-T09 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted F10-T04 immediate session/user invalidation.
  - Scope: targeted real PostgreSQL/Socket.IO authorization, revocation, reconnect, visibility/tombstone, presence and rate-limit revalidation only; no capacity criterion or topology change.
  - Owned paths: focused API test/evidence/status/checklist only if coverage is insufficient.
  - Shared/exclusive resource: serialized PostgreSQL and Socket.IO test environment.
  - Verification: real PostgreSQL/Socket.IO gateway, immediate session/user revoke, reconnect, authorization, moderation/tombstone, presence, ordering and rate-limit suites → PASS (8 files, 23 tests); API typecheck and `git diff --check` → PASS.
  - Result: the immediate invalidation registry preserves the frozen high-water, moderation, authorization and rate-limit contracts. The change is not on the send, capacity or topology path; the accepted 40-minute capacity evidence is unchanged and was not rerun.

## active batch — F10-R20-IMMEDIATE-SOCKET-REVOCATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-24 15:30 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit; Phase 10 remains REWORK`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `d257f70`, and independent closure-review P1.

- Task ID: `F10-T04 REWORK`
  - Status: `DONE`
  - Depends on: accepted prior F10-T04/F10-T09/F10-T11 work; this remediation precedes their revalidation.
  - Scope: process-local immediate invalidation of Socket.IO connections by authenticated session and user, wiring the real session-revoke path, and focused PostgreSQL/Socket.IO proof for session and user revocation with no follow-up client event.
  - Owned paths: chat realtime gateway/module/registry, identity session-management wiring, focused chat realtime integration tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: single realtime API instance and serialized PostgreSQL/Socket.IO test environment.
  - Verification: API typecheck → PASS; PostgreSQL/Socket.IO session revoke, user-wide revoke, gateway presence and session-use-case suites → PASS (3 files, 14 tests); `git diff --check` → PASS.
  - Result: the registry is single-instance and process-local by ADR-0010. Session revoke disconnects only that session's sockets; logout-all disconnects every socket for that user. Both happen after durable revoke and before a further room fan-out, without a client heartbeat or message.

## active batch — F10-R19-FINAL-GATES

Coordinator/Thread: `Codex /root`
Started at: `2026-09-23 20:53 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — all final gates passed; Phase 10 READY_FOR_REVIEW`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `9b760a3`, and `48a5841`.

- Task ID: `F10-T11 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted F10-T08 and F10-T09 revalidation.
  - Scope: final migration/client/typecheck/test/build/freshness and real Chrome E2E verification, including the minimal
    disposable-PostgreSQL verification harness required to eliminate shared-DB contamination.
  - Owned paths: `scripts/with-disposable-postgres.mjs`, root `package.json`, `apps/api/package.json`, test/evidence/status/checklist only.
  - Shared/exclusive resource: local PostgreSQL, API/web/app/dashboard processes and browser environment.
  - Expected verification: targeted migration/reminder proof on a disposable DB, then full workspace gate and Chrome E2E;
    `READY_FOR_REVIEW` only if every gate passes.
  - Verification: chat-producer-then-outbox fixture proof → PASS (2 files, 3 tests); the frozen 1,000ms capacity
    threshold rerun → PASS (1 file, 2 tests); full isolated workspace gate → PASS (5/5 tasks, API 84 files / 346
    tests, 40m45.245s); production workspace build → PASS; real Chrome Phase 10 E2E → PASS (1 test).
  - Result: the harness DB `sabz_zendegi_verify_e18a6a1ea96d429faa07fcde10d00149` was independently confirmed
    absent after `finally` cleanup. The fixture no longer depends on a globally empty outbox queue, and no capacity
    criterion was changed. Phase 10 is `READY_FOR_REVIEW`; do not start Phase 11 or closure.

## active batch — F10-R18-POST-RECOVERY-REALTIME

Coordinator/Thread: `Codex /root`
Started at: `2026-09-23 20:35 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and committed `9b760a3`.

- Task ID: `F10-T09 REVALIDATION`
  - Status: `DONE`
  - Depends on: accepted `F10-T08 REWORK`.
  - Scope: real PostgreSQL/Socket.IO reconnection, authorization/revocation, visibility/tombstone, block-policy, and high-water contract regression verification only.
  - Owned paths: focused API realtime/integration tests if a coverage gap is found, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: serialized PostgreSQL and Socket.IO test environment.
  - Expected verification: real gateway/reconnect/authorization/moderation/block suites, API typecheck, and diff isolation.
  - Verification: PostgreSQL/Socket.IO reconnect, realtime/visibility/revocation, moderation/block, authorization,
    ordering/presence and rate-limit suites → PASS (8 files, 22 tests); API typecheck → PASS.
  - Result: real infrastructure confirms the high-water reconnect contract and every prior security remediation;
    no product source change was required.

## active batch — F10-R17-HIGH-WATER-RECOVERY

Coordinator/Thread: `Codex /root`
Started at: `2026-09-22 01:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and independent closure-review findings on `4d56ca5`.

- Task ID: `F10-T08 REWORK`
  - Status: `DONE`
  - Depends on: accepted `F10-T03/T04`; remediation is limited to client recovery.
  - Scope: app/dashboard high-water-bounded reconnect recovery, explicit failure before `connected`, and cancellation-safe restore retry only after a successful next join.
  - Owned paths: `apps/app/src/lib/chat-api.ts`, `apps/app/src/lib/chat-api.spec.ts`, `apps/dashboard/src/lib/chat-api.ts`, `apps/dashboard/src/lib/chat-api.spec.ts`, plus Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: app/dashboard chat adapters and focused test suites.
  - Verification: app 45 tests and dashboard 52 tests, their typechecks and production builds, and `git diff --check` → PASS.
  - Result: recovery page budget derives from frozen sequence distance, validates contiguous progress through high-water, reports `recovery-failed` rather than `connected` on any unreachable/stalled/empty page, and restore work resumes only after a later successful join.

## آخرین batch — F10-R16-CLOSURE-GATES

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`

- Task ID: `F10-T11 REVALIDATION`
  - Status: `DONE`
  - Result: Prisma/client/typechecks/tests/builds and real Chrome Phase 10 E2E passed. Playwright discovers retained Phase 09 and Phase 10 suites. Independent security/closure review is next; Phase 11 is not claimed.

## آخرین batch — F10-R15-SECURITY-REVALIDATION

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`

- Task ID: `F10-T09 REVALIDATION`
  - Status: `DONE`
  - Result: all real PostgreSQL/Socket.IO P1 regression gates passed; F10-T11 is next eligible and not yet claimed.

## آخرین batch — F10-R14-CLIENT-PAGINATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 23:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, `7d8fe59`, and `975bc25`.

- Task ID: `F10-T08 REWORK`
  - Status: `DONE`
  - Depends on: F10-T03/T04 REWORK
  - Scope: bounded, cancellable app/dashboard history and reconnect pagination through authorized REST high-water; Socket.IO remains body-free signaling.
  - Owned paths: app/dashboard chat adapters and focused tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: app/dashboard source and test suites.
  - Expected verification: >150-message reconnect pagination, stale-disconnect safety, app/dashboard tests/typechecks/builds, diff/isolation.

- Result: F10-T08 REWORK passed. Next eligible task is F10-T09 REVALIDATION, not yet claimed.

## آخرین batch — F10-R13-SOCKET-REVOCATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 23:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1`, `ADR-0010`, and committed `7d8fe59`; Socket.IO is signaling only.

- Task ID: `F10-T04 REWORK`
  - Status: `DONE`
  - Depends on: `F10-T03 REWORK`
  - Scope: immediately revoke a socket after failed current authorization; prove missed visibility signaling reconciles through PostgreSQL.
  - Owned paths: chat realtime gateway/publisher and real Socket.IO integration tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: Socket.IO gateway and PostgreSQL integration environment.
  - Expected verification: real Socket.IO deactivation/revocation and disconnect-before-publish recovery, API typecheck and diff/isolation.

- Result: F10-T04 REWORK passed. Next eligible task is F10-T08 REWORK, not yet claimed.

## آخرین batch — F10-R12-VISIBILITY-RECONCILIATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 22:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Batch status: `DONE — accepted for isolated task commit`
Contract baseline: `chat-consultation-v1` and `ADR-0010`; PostgreSQL remains authority and Socket.IO is body-free signaling.

- Task ID: `F10-T03 REWORK`
  - Status: `DONE`
  - Depends on: accepted `F10-T01/T02`; no new persistence migration required because immutable moderation actions are durable.
  - Scope: authorized REST visibility reconciliation independent of message sequence; block enforcement only on human send.
  - Owned paths: chat REST/service/DTO/OpenAPI slice, focused PostgreSQL/API tests, Phase 10 evidence/status/checklist.
  - Shared/exclusive resource: common chat authorization and PostgreSQL test DB.
  - Expected verification: real PostgreSQL history/reconciliation/block regression, API typecheck, OpenAPI freshness, diff/isolation.

- Result: F10-T03 REWORK passed. Durable moderation actions reconcile current authorized visibility using a server-bound
  checkpoint independent of message sequence; block remains send-only. Next eligible task is F10-T04 REWORK, not yet claimed.

## آخرین batch — F10-CLOSE

Coordinator/Thread: `Codex /root`
Completed at: `2026-09-21 21:51 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE (CLOSED)`
Baseline: `8165d0b test(F10-T11): revalidate paginated restore closure`

- Scope: documentation-only formal closure after the user-provided fifth independent closure-review PASS.
- Result: all F10 tasks and accepted remediations/revalidations are closed; Milestone D is complete.
- Excluded: `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` remain user-owned, unstaged and absent from
  every Phase 10 commit.
- Next eligible work: `Phase 11 — Dashboard Reporting & Access Expansion`, `NOT_STARTED` and not claimed here.

## آخرین batch — F10-R11-RESTORE-PAGINATION-CLOSURE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 21:25 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`
Baseline: `a8e60b0 test(F10-T09): revalidate paginated restore visibility`

- Task: `F10-T11 REVALIDATION`
- Scope: final closure gates after bounded restore pagination; output is `READY_FOR_REVIEW`, never `DONE (CLOSED)`.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: Prisma/OpenAPI/client, API/app/dashboard types/tests/builds, Chrome E2E, source scans, diff and commit
  isolation passed. Only fifth independent closure review may decide formal closure.

## آخرین batch — F10-R09-RESTORE-PAGINATION-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 21:15 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `78c4f25 fix(F10-T08): reconcile paginated restored messages`

- Task: `F10-T09 REVALIDATION`
- Scope: PostgreSQL/Socket.IO confirmation that sequence 101 restore remains body-free, cursor-recoverable and
  unauthorized to outsiders, plus affected adapter/reconnect/history correctness.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: all affected real database/gateway and client adapter checks passed; frozen capacity evidence remains
  applicable because no gateway, send, rate-limit or throughput path changed.

## آخرین batch — F10-R08-RESTORE-PAGINATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 20:10 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `63befff test(F10-T11): revalidate restored visibility closure`

- Task: `F10-T08 REWORK`
- Scope: bounded, authorized cursor pagination for a body-free restore visibility event beyond the first history page.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: each client uses server event identity only to find the restored record across authorized REST pages; stale
  requests cannot replace a newer safe state after disconnect, and duplicate fetches are coalesced per message.

## آخرین batch — F10-R11-RESTORE-CLOSURE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 19:55 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`
Baseline: `fdb91c7 test(F10-T09): revalidate restored visibility`

- Task: `F10-T11 REVALIDATION`
- Scope: final closure gates after the restore visibility remediation. The output state is `READY_FOR_REVIEW`, never
  `DONE (CLOSED)`.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: Prisma migration status/validate, OpenAPI/client freshness, app/dashboard tests and builds, Chrome E2E,
  source scans and diff/isolation checks all passed. A fourth independent closure review remains required.

## آخرین batch — F10-R03-RESTORE-TRANSITION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +05:05`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `e9efe7d test(F10-T11): revalidate phase 10 closure`

- Task: `F10-T03 REWORK`
- Scope: durable, audited `RESTRICTED → VISIBLE` transition yields an opaque post-commit publication fact; no body or preview.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: restore creates a durable, audited opaque transition fact containing conversation/message identity, sequence
  and `VISIBLE` only; it contains no body or preview.

## آخرین batch — F10-R04-RESTORE-EVENT

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `dade0b7 fix(F10-T03): publish restore visibility transition`

- Task: `F10-T04 REWORK`
- Scope: publish authorized body-free `message:visibility-changed` restore events to the conversation room only.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: a joined, authorized recipient gets one body-free restore event only from the same conversation room.

## آخرین batch — F10-R08-RESTORE-RECONCILIATION

Coordinator/Thread: `Codex /root`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `6fe0c2c fix(F10-T04): publish restore visibility event`

- Task: `F10-T08 REWORK`
- Result: app and dashboard ignore body-free restore event content and refresh the authoritative authorized REST history.
- Verification: app adapter (5 tests), dashboard adapter (2 tests), app/dashboard typechecks and `git diff --check` → PASS.

## آخرین batch — F10-R11-VISIBILITY-CLOSURE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +04:50`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit; Phase 10 READY_FOR_REVIEW`
Baseline: `a9be31d test(F10-T09): revalidate visibility transitions`

- Task: `F10-T11 REVALIDATION`
- Scope: final related Prisma/API/OpenAPI/client/app/dashboard/browser/security/deferred-media/commit-isolation gates
  after F10-T03/T04/T08/T09. The output state is `READY_FOR_REVIEW`, not `DONE (CLOSED)`.
- Owned paths: final evidence/status/checklist and a focused verification-only regression if a gap is found.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, product feature/schema/migration,
  dependency, client output, API or UI source unless a verification gap requires its owning remediation task instead.
- Result: all related final gates passed. The phase returns to `READY_FOR_REVIEW`, never `DONE (CLOSED)`; only a third
  independent closure review can authorize any closure decision.
- Verification: Prisma migration status (31 applied), schema validate, API/app/dashboard/api-client typechecks,
  OpenAPI export/generated-client freshness, app build, dashboard build, app tests (12/38), dashboard tests (15/45),
  live Chrome Phase 10 browser E2E, scoped deferred-media/external-messenger scan, rework commit-isolation review and
  `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R09-VISIBILITY-REVALIDATION

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +04:20`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `bfcb1ae fix(F10-T08): reconcile restricted message tombstones`

- Task: `F10-T09 REVALIDATION`
- Scope: real PostgreSQL/Socket.IO validation for both connected restriction paths, history/cursor/reconnect safety,
  authorization/clinic isolation and app/dashboard tombstone regressions affected by F10-T03/T04/T08.
- Owned paths: revalidation-only test/evidence/status/checklist paths. No product feature, schema, migration,
  dependency, OpenAPI/client or UI source work.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: current production paths revalidated against PostgreSQL and live Socket.IO include direct and
  report-resolution tombstones while connected, and body-free history/sync/reconnect after restriction.
- Verification: PostgreSQL API/gateway set → PASS (9 files, 16 tests): REST/ordering, authorization, abuse/block,
  moderation, receipts, live Socket.IO direct+resolution event, presence, and reconnect. App adapter → PASS (4);
  dashboard adapter → PASS (1); API typecheck and `git diff --check` → PASS. Existing accepted F10-T09 frozen
  capacity evidence remains the authoritative 100/300/600, sustained/burst and reconnect-storm evidence.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R08-VISIBILITY-CACHE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +04:05`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `6bf1eca fix(F10-T04): publish safe visibility tombstones`

- Task: `F10-T08 REWORK`
- Scope: consume `message:visibility-changed` in app and dashboard; replace cached messages by ID/sequence with the
  authoritative tombstone and prevent ordinary UI rendering of the prior body.
- Owned paths: app/dashboard chat adapters/pages and their focused tests, plus Phase 10 status/evidence/checklists.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, API/schema/migrations/dependencies,
  gateway/runtime publication, or OpenAPI/public REST contract.
- Result: both chat clients subscribe to `message:visibility-changed` and reconcile its ID/sequence replacement into
  local state. The entire old message object is replaced, so a prior `body` cannot remain for ordinary rendering.
- Verification: app adapter suite → PASS (4 tests); dashboard adapter suite → PASS (1 test), each covering direct
  and report-resolution tombstones; app/dashboard typechecks and `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R04-VISIBILITY-EVENT

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:50`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `f2c8c45 fix(F10-T03): persist safe moderation transitions`

- Task: `F10-T04 REWORK`
- Scope: publish a body-free `message:visibility-changed` fact only after the direct or report-resolution PostgreSQL
  transaction commits; prove authorized room-only Socket.IO delivery for connected ordinary participants.
- Owned paths: chat service post-commit publisher call, realtime publisher/gateway tests, and Phase 10
  status/evidence/checklists.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, schema/migrations, dependencies,
  OpenAPI/public REST contract, or app/dashboard source.
- Result: Socket.IO now emits `message:visibility-changed` only to the server-authorized conversation room, and only
  after the direct-moderation or report-resolution transaction committed. Its payload is the canonical tombstone fact
  with no body or preview.
- Verification: real PostgreSQL/Socket.IO gateway integration covers an already delivered visible message, then direct
  restriction and report-resolution restriction while the patient remains joined → PASS (1 file, 5 tests); API
  typecheck and `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R03-VISIBILITY

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `e9efe7d test(F10-T11): revalidate phase 10 closure`

- Task: `F10-T03 REWORK`
- Scope: canonical, safe visibility-transition facts for direct moderation and report-resolution restriction;
  PostgreSQL-only persistence proof. Socket.IO publication and UI cache handling are deferred to the succeeding
  serialized `F10-T04 REWORK` and `F10-T08 REWORK` tasks.
- Owned paths: chat service/REST moderation transition, T03 PostgreSQL tests, and Phase 10 status/evidence/checklists.
- Do not change/stage: `.gitignore`, `plan/phases/12-PRODUCTION-HARDENING.md`, schema/migrations, dependencies,
  gateway/runtime publication, or app/dashboard source.
- Result: direct ADMIN restriction and report-resolution restriction share the same PostgreSQL-persisted, body-free
  transition fact. The fact exists only after transaction commit; Socket.IO publication is intentionally deferred to
  `F10-T04 REWORK`.
- Verification: PostgreSQL moderation integration proof covers both paths, REST history and cursor/realtime sync for
  patient, doctor and ADMIN, and explicit-audited review only → PASS (1 file, 1 test); API typecheck and
  `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` are not owned, edited or staged.

## آخرین batch — F10-R03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `2335ee1 test(F10-T11): close chat consultation verification`

- Task: `F10-T03 REWORK`
- Depends on: accepted `F10-T02`; closure-review HIGH restricted-content finding.
- Scope: ordinary REST/history/cursor/realtime response mappers never disclose restricted message text, including to
  ADMIN; explicit audited moderation review remains the sole text-returning path.
- Owned paths: chat REST/runtime response mapping, T03 moderation/REST regression tests, generated contract if its
  public schema changes, and task status/evidence/checklist only.
- Shared/exclusive resource: serialized PostgreSQL integration database.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Connectivity recovered: container `healthy`, internal `psql SELECT 1`, and host Node/pg using the API environment →
  PASS. No repository connection string, volume, proxy, reset, or user-owned file changed.
- Result: ordinary REST history, cursor/realtime sync and post-commit payload mapping return a tombstone only for every
  restricted message, including to ADMIN. The explicit ADMIN-only moderation-review endpoint is the sole ordinary API
  path that returns the original body and writes `RESTRICTED_CONTENT_REVIEWED` against that message.
- Verification: PostgreSQL API regression suite (REST, authorization, moderation and OpenAPI contract) → PASS
  (4 files, 11 tests); API typecheck → PASS; generated OpenAPI/client freshness → PASS; `git diff --check` → PASS.
- Review: user-owned `.gitignore` and `plan/phases/12-PRODUCTION-HARDENING.md` were neither edited nor staged.

## آخرین batch — F10-R04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `ed5724f fix(F10-T03): restrict moderated message visibility`

- Task: `F10-T04 REWORK`
- Depends on: accepted `F10-T03 REWORK`; closure-review HIGH sync-to-room subscription race finding.
- Scope: use a server-authorized join-before-backlog fence and prove with deterministic PostgreSQL/Socket.IO integration
  that a commit during the former sync/join interval reaches the reconciled client without a sequence gap or durable
  duplicate.
- Owned paths: chat realtime gateway, T04 gateway/client reconciliation tests, and task status/evidence/checklist only.
- Shared/exclusive resource: serialized PostgreSQL integration database and local Socket.IO gateway.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: authorization is checked before room subscription, then sync re-authorizes and captures the post-subscription
  high-water/backlog; a failed second check leaves the room. The app reconciliation uses message ID replacement and
  sequence ordering, making the permitted early-event/backlog duplicate harmless.
- Verification: real PostgreSQL/Socket.IO gateway suite → PASS (4 tests, including deterministic sync/join race);
  app reconciliation unit suite → PASS (3 tests); API/app typechecks and `git diff --check` → PASS.

## آخرین batch — F10-R09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `10bd7d0 fix(F10-T04): fence realtime sync and room join`

- Task: `F10-T09 REVALIDATION`
- Scope: rerun authoritative PostgreSQL correctness, authorization/moderation/block/rate-limit, reconnect/capacity and
  new race verification affected by T03/T04. Do not start F10-T11 until accepted.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Verification: authoritative PostgreSQL correctness suite (ordering/idempotency, REST, authorization, moderation,
  abuse/block, rate limit, reconnect and fenced gateway race) → PASS; frozen capacity/reconnect run completed at 20
  msg/s × 30m then 50 msg/s × 5m with the 100-consultation/300-participant/600-connection storm scenario.

## آخرین batch — F10-R11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-21 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `3a7147a test(F10-T09): revalidate chat realtime correctness`

- Task: `F10-T11 REVALIDATION`
- Scope: final Prisma/API/app/dashboard/browser/realtime/privacy/OpenAPI/client/deferred-media/secret and commit-isolation
  verification after T03/T04/T09; final state remains `READY_FOR_REVIEW`, never `DONE (CLOSED)`.
- Do not change/stage: `.gitignore` or `plan/phases/12-PRODUCTION-HARDENING.md`.
- Result: all final gates passed after T03/T04/T09. Phase 10 is returned to `READY_FOR_REVIEW` only; Phase 11 remains
  `NOT_STARTED` and a second independent closure review remains required.

## آخرین batch — F10-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Completed at: `2026-09-20 +03:30`
Status: `DONE — accepted for isolated task commit`
Baseline: `24bbe75 docs(F10-T10): defer video consultation for MVP`

- Scope: final Phase 10 migration/API/realtime/UI/browser/privacy/deferred-media verification and closure evidence.
- Owned paths: task-owned final tests/config and Phase 10 status/evidence/checklists only.
- Do not change: product runtime/schema/migrations/OpenAPI client/dependencies, `.gitignore`, or Phase 12 plan.
- Result: real PostgreSQL migration/status/validate, authoritative API/gateway/lifecycle/moderation/reconnect suites,
  app/dashboard tests and builds, deferred-media/privacy scans, and an isolated Chrome patient browser journey all
  passed. The synthetic browser journey registers and authenticates a patient, opens an eligible online appointment
  chat, sends a committed text message, and proves no audio/video control, external messenger request, or token URL.

## batch فعال — F10-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `8ba6687 test(F10-T09): prove chat security and capacity`

- Scope: prove the MVP video/voice deferral only; record absence of provider, SDK, token, room, join URL, callback,
  credential, environment, migration, external request and app/dashboard join control.
- Owned paths: Phase 10 status/evidence/checklist and task-owned absence verification only.
- Do not change: chat runtime/API/schema/migrations, app/dashboard implementation, dependencies/lockfile, `.gitignore`,
  or Phase 12 plan.
- Result: `DEFERRED / NOT_APPLICABLE FOR MVP`. Scoped runtime/manifest scans found no WebRTC/STUN/TURN/provider SDK,
  room/token/join/callback/credential/environment configuration or audio/video join control. No implementation added.

## batch فعال — F10-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-19 23:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `e9a3523 feat(F10-T08): connect chat consultation interfaces`

- Scope: task-owned PostgreSQL/gateway ordering, reconnect, abuse/authorization, rate and capacity/load proof with
  only synthetic data; the narrowly scoped Prisma Pg pool remediation required by the demonstrated throughput defect;
  evidence/status after all acceptance gates pass.
- Owned paths: `apps/api/src/database/prisma/prisma.service.ts`,
  `apps/api/test/{chat-ordering.integration.spec.ts,chat-reconnect-load.spec.ts,chat-abuse-authorization.integration.spec.ts,chat-rate-limit.integration.spec.ts,chat-capacity.load.spec.ts,chat-test-support.ts}`, task-owned load scripts/config, and Phase 10 status/evidence.
- Shared/exclusive resource: serialized PostgreSQL test database, local Socket.IO gateway and load environment.
- Do not change: production chat/API implementation, Prisma schema/migrations, OpenAPI/client, app/dashboard source,
  dependencies/lockfile, `.gitignore`, or Phase 12 plan.
- Result: Docker PostgreSQL healthy; disposable migration/seed database creation and cleanup passed. Ordering,
  idempotency, authorization, moderation, block, rate-limit and reconnect suites passed (6 tests). Capacity proof
  passed with 100 consultations, 300 authenticated participants, 600 Socket.IO connections, 95% signal delivery
  within two seconds, a 300-participant reconnect storm under 60 seconds, 20 committed messages/second for 30 minutes,
  and 50 committed messages/second for five minutes; durable message count/sequence reconciliation passed.

## آخرین batch — F10-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-19 23:00 +03:30`
Phase: `10-CHAT-CONSULTATION`
Completed at: `2026-09-19 23:15 +03:30`
Status: `DONE — accepted for isolated task commit`
Baseline: `092c5ca feat(F10-T07): add waiting room presence`

- Scope: app/dashboard use the generated REST client and Socket.IO adapter for authorized text consultations;
  remove in-scope mock conversation and unsupported phone/video UI.
- Owned paths: `apps/app/{src/app/(app)/{chat,appointments/waiting-room}/**,src/lib/chat-api.*,package.json}`,
  `apps/dashboard/{src/{app/(app)/messages,features/messages,lib/chat-api.ts,data/messages.ts},package.json}`, the
  already-frozen Socket.IO-client lockfile entries, task-owned UI tests, and Phase 10 status/evidence.
- Do not change: API/schema/migration/OpenAPI client, Socket.IO version selection (T04 baseline remains `4.8.1`),
  appointment/encounter state, attachment, video provider/SDK, `.gitignore`, or Phase 12 plan.
- Review: PASS — patient chat and dashboard use the generated REST client for authoritative history/send and the
  authenticated Socket.IO adapter only for realtime/presence. Reconnect joins with the latest applied sequence;
  REST remains the sole write path. Loading, offline/reconnecting, forbidden, tombstone and read-only states are
  explicit; STAFF is denied locally and the server remains authoritative for clinic/appointment/linked-doctor checks.
  Mock conversation data and phone/video controls are absent from both surfaces. Evidence: [`logs/phase-10.md`](logs/phase-10.md).
- Next eligible batch: `F10-B09 / F10-T09` only; do not claim it in this task.

## batch فعال — F10-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-19 09:00 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `8d9c4a1 feat(F10-T05): add chat receipts and safe outbox`

- Scope: remove/hide in-scope app/dashboard text-chat attachment, image, file and audio mocks; record deferred absence.
- Owned paths: `apps/app/src/app/(app)/chat/**`, `apps/dashboard/src/features/messages/**`, `apps/dashboard/src/data/messages.ts`, task-owned absence tests,
  and Phase 10 status/evidence only.
- Do not change: API/schema/migrations, uploads/object storage/malware pipeline, media dependencies, realtime, app/dashboard
  chat runtime beyond attachment mock controls, `.gitignore`, or Phase 12 plan.
- Result: `DEFERRED / NOT_APPLICABLE FOR MVP`. Chat surfaces expose text-only composition; attachment/image/file/audio
  mocks and fake filenames are absent. No storage, upload, attachment schema, scanner, object lifecycle or dependency exists.
- Verification: scoped absence scan, app/dashboard typechecks and `git diff --check` passed. Video/voice call controls are
  intentionally retained for the separately owned F10-T10 deferral task.
- Next eligible batch: `F10-B07 / F10-T07` only; no task is claimed by this completion.

## batch فعال — F10-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-17 03:20 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `51d8716 feat(F10-T04): add authenticated chat realtime gateway`

- Scope: participant-scoped monotonic receipt acknowledgement and safe post-commit chat outbox/notification handling.
- Owned paths: `apps/api/src/modules/communications/chat/{receipts,notifications}/**`, task-required chat service/gateway
  extensions, `apps/api/src/modules/outbox/**`, `apps/api/src/modules/assessments/notifications/**`,
  `apps/api/test/chat-receipts-notifications.integration.spec.ts`, and task evidence/status.
- Do not change: Prisma schema/migration, REST/OpenAPI/generated client ownership, Socket.IO dependency/lockfile,
  waiting-room/presence, app/dashboard UI, media, `.gitignore`, or Phase 12 plan.
- Result: receipts are authenticated, participant-scoped and monotonic; chat outbox records only opaque identifiers and
  is safely consumed without a text preview or a user-visible notification unsupported by the current category model.
- Verification: PostgreSQL Socket.IO receipt acknowledgement and outbox privacy integration suites passed; API typechecks
  and `git diff --check` passed. No task stage includes user-owned files.
- Next eligible batch: `F10-B06 / F10-T06` only; no task is claimed by this completion.

## batch فعال — F10-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-17 03:00 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `ffa06cf feat(F10-T03): add appointment chat REST API`

- Scope: pinned Socket.IO/Nest gateway dependency and lockfile, handshake-authenticated connection lifecycle,
  backend-authorized conversation join/reconnect/sync, token expiry and three-live-connection boundary, and targeted
  gateway tests only.
- Owned paths: `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/app.module.ts`,
  `apps/api/src/modules/communications/chat/realtime/**`, task-required extension points under
  `apps/api/src/modules/communications/chat/**`, `apps/api/test/chat-realtime.gateway.spec.ts`, and task status/evidence.
- Do not change: Prisma schema/migrations/seed, REST/OpenAPI/generated client surface, receipt/outbox runtime,
  waiting-room/presence runtime, app/dashboard UI, attachment/video runtime, `.gitignore`, or Phase 12 plan.
- Acceptance focus: auth payload only (never URL), no client-selected arbitrary room/publish, server-side rechecks on
  join/reconnect/sync, expiry close, bounded reconnect high-water recovery and at-least-once signal semantics.
- Result: Socket.IO remains an in-process signaling/connection layer only. REST remains the sole persist path; a
  committed message is emitted only after the PostgreSQL transaction returns successfully.
- Verification: pinned dependency advisory scan found no Socket.IO/Nest websocket finding; targeted unit plus live
  Socket.IO/PostgreSQL integration tests and API typecheck passed. Repository-wide audit findings are pre-existing,
  out-of-scope Next/Fastify/Prisma dependencies and are not masked by this task.
- Next eligible batch: `F10-B05 / F10-T05` only; no task is claimed by this completion.

## batch فعال — F10-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-16 05:05 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `62f2921 feat(F10-T02): persist chat consultation records`

- Scope: appointment-bound chat REST authorization, conversation/history/cursor/send/report/moderation/block endpoints,
  PostgreSQL-backed sequence/idempotency/rate checks, stable errors, OpenAPI and generated client slice, and targeted
  integration/authorization/moderation tests only.
- Owned paths: `apps/api/src/modules/communications/chat/**`, `apps/api/src/common/{auth,errors}/**` only where the frozen
  contract requires a common capability, `apps/api/src/app.module.ts`, `apps/api/test/{chat-rest.integration.spec.ts,
  chat-authorization.integration.spec.ts,chat-moderation.integration.spec.ts,openapi-contract.spec.ts}`, `packages/api-client/**`,
  and `plan/{STATUS.md,logs/phase-10.md,phases/10-CHAT-CONSULTATION.md}` plus `specs/008-adopt-phase-10/tasks.md`.
- Do not change: Prisma schema/migrations/seed, Socket.IO dependencies or lockfile, receipt/outbox runtime, waiting-room/
  presence runtime, app/dashboard UI, attachment/video runtime, `.gitignore`, or Phase 12 plan.
- Acceptance focus: server-side permission + clinic + appointment/conversation membership checks; no STAFF or unlinked-doctor
  access; REST-only committed send with stable idempotency/order/error behavior; moderation/block audit boundaries; generated
  OpenAPI/client consistency. No realtime, receipt, waiting-room, attachment, or video implementation is claimed.
- Result: REST-only, PostgreSQL-backed appointment chat authorization, history/cursor, idempotent ordered send, report,
  moderation and scoped-block APIs are accepted with stable errors and generated OpenAPI client coverage. Socket.IO,
  receipts/outbox, presence/waiting-room, UI and media remain unclaimed.
- Verification: targeted REST, authorization and moderation integration tests passed against PostgreSQL; OpenAPI contract,
  API/test/client TypeScript checks, export/generation and `git diff --check` passed. Coordinator review excluded
  user-owned `.gitignore` and Phase 12 changes.
- Next eligible batch: `F10-B04 / F10-T04` only; no task is claimed by this completion.

## batch فعال — F10-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-16 03:45 +03:30`
Phase: `10-CHAT-CONSULTATION`
Status: `DONE — accepted for isolated task commit`
Baseline: `79e7979 docs(F10-T01): freeze chat consultation contract`

- Scope: additive PostgreSQL/Prisma persistence only for the frozen appointment-bound text-chat contract: conversation,
  participant, message/sequence/idempotency, receipt, report, block, moderation, retention/legal-hold and safe audit
  boundaries; migration replay/Phase 09 upgrade/seed idempotency/schema-drift evidence.
- Owned paths: `apps/api/prisma/{schema.prisma,migrations/20260916034500_phase_10_chat_persistence/migration.sql,seed.mjs}`,
  `apps/api/test/{chat-migrations.integration.spec.ts,migrations.integration.spec.ts}` only when Phase 10 migration
  coverage is necessary, and `plan/{STATUS.md,logs/phase-10.md,phases/10-CHAT-CONSULTATION.md}` plus
  `specs/008-adopt-phase-10/tasks.md` for accepted-task synchronization.
- Shared writer: `F10-T02` exclusively owns Prisma schema/migrations/seed. Do not add REST, authorization, OpenAPI,
  generated client, Socket.IO, outbox handler, waiting-room runtime, app/dashboard, attachment, or video work.
- Result: accepted persistence schema/migration stores only appointment-bound text-chat facts and preserves exclusive
  Prisma ownership. It adds no runtime REST, Socket.IO, attachment/video, Redis/Centrifugo, generated client or UI work.
- Verification: clean replay and Phase 09 upgrade/seed/invariant suite (4 tests) passed against disposable PostgreSQL;
  `prisma migrate deploy/status`, migrations-to-schema drift and database-to-schema drift all passed; development seed
  ran twice idempotently; Prisma validate/generate, API typecheck and `git diff --check` passed.
- Next eligible batch: `F10-B03 / F10-T03` only; no task is claimed by this completion.

## batch فعال — F09-CI01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-15 20:40 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Status: `DONE — accepted for isolated remediation commit`
Baseline: `984579c docs(F09-CLOSE): close commerce payments phase`

- Scope: correct only the five Phase 09 `react-hooks/set-state-in-effect` errors exposed by the repository root
  `pnpm lint` PR gate, rerun the local CI-aligned verification, synchronize Phase 09 evidence/status, and prepare
  the existing branch for a pull request to `main`.
- Owned paths: `apps/dashboard/src/features/{discounts/discounts-page.tsx,orders/orders-page.tsx,revenue/revenue-page.tsx,settings/payment-provider-settings.tsx,store/store-page.tsx}` and
  `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`.
- Do not change: the two pre-existing patient-workspace lint warnings; `.gitignore` (user-owned); product
  contracts, migrations, generated artifacts, confidential Sadad material, provider activation, or Phase 10.
- Result: the five Phase 09 Dashboard effects now start their initial asynchronous reads directly and cancel
  stale completions on unmount; user-triggered refresh callbacks remain available. Root `pnpm lint` passes with
  zero errors (the two pre-existing patient-workspace warnings remain untouched). Dashboard tests `44/44`,
  Dashboard typecheck/build, root typecheck, the complete database-backed root test suite (API `72/72` files,
  `320/320` tests; app/dashboard/web `34/44/9`) and root production build all pass. `git diff --check` passes.
- PR note: the repository workflow currently exports `NODE_ENV=test` globally into its Next production-build
  step; local reproduction proves that non-production value can fail Next prerendering, while the same root build
  with `NODE_ENV=production` passes. This is a pre-existing CI configuration risk to confirm from the live PR;
  no workflow/config bypass was added to this Phase 09 remediation.

## closure review — F09-CLOSE

Coordinator/Thread: `Codex /root`
Started at: `2026-09-15 19:05 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Completed at: `2026-09-15 20:05 +03:30`
Status: `DONE (CLOSED)`
Baseline: `b5d3eda test(F09-T12): verify commerce payment phase`

- Scope: independent evidence/code/contract review and fresh Phase 09 verification only.
- Owned paths: `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}` and
  `specs/007-adopt-phase-09/{spec.md,plan.md,tasks.md}` only when final synchronization is required.
- Do not change: product code, migrations, generated artifacts, tests, `.gitignore` (user-owned), confidential
  Sadad materials, provider activation/network transport, or Phase 10.
- Result: PASS — task/commit isolation for `F09-T01` through `F09-T12`, frozen contracts, source boundaries,
  migration/seed/drift, PostgreSQL commerce suites, full API suite (72 files/320 tests), OpenAPI/client,
  app/dashboard/web checks, Chrome localhost E2E and disposable-data cleanup all passed. One historical Spec Kit
  phrase incorrectly implied that `SADAD_GO_LIVE_BLOCKED` blocked closure; it was synchronized with the frozen
  contract/ADR/Phase 12 decision. No product finding or convergence task remains.
- Next eligible batch: `F10-B01 / F10-T01` only, `NOT_STARTED` and unclaimed.

## batch فعال — F09-B12

Coordinator/Thread: `Codex /root`
Started at: `2026-09-14 00:10 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; accepted T11 at `8aa5fc9`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T12` — `DONE`
  Dependencies: `F09-T01` through `F09-T11` are `DONE`; no active batch existed when claimed.
  Scope: final migration/drift/OpenAPI/client/API/app/dashboard/PostgreSQL/browser verification; removal only of
  proven in-scope local commerce source-of-truth remnants; Phase 09 evidence, checklist and closure-review handoff.
  Owned paths: `apps/{api/test/**,api/scripts/**,app/src/**,dashboard/src/**,web/src/**}`, `packages/api-client/**`,
  root `package.json`, `pnpm-lock.yaml`, `playwright.config.ts`, `tests/e2e/phase-09/**`,
  `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, and `specs/007-adopt-phase-09/**`.
  Do not change: accepted product architecture/contracts/migrations unless a demonstrated in-scope defect requires
  the smallest fix; `.gitignore` (user-owned); confidential Sadad samples/PDF/credentials; provider enable/default/
  network transport; or Phase 10.
  Review: `PASS` — final Chrome-channel multi-context E2E ran twice on localhost using real PostgreSQL and
  run-scoped disposable data. It proves secure context/native `crypto.randomUUID`, cart/order persistence,
  persisted PICKUP/Courier prices, fail-closed `503 SADAD_GO_LIVE_BLOCKED` with no PaymentAttempt/Payment/token/
  redirect/external request, patient isolation/404 direct access, ADMIN Dashboard cancellation, one reservation
  release/ledger effect, unchanged revenue, controlled console/page errors, and exact cleanup. Full API (72 files,
  320 tests), migration smoke (3/3), drift, Prisma, OpenAPI/client, app/dashboard/web tests/typechecks/builds and
  scope/secret/artifact review pass. No provider was enabled, defaulted or contacted; user-owned `.gitignore` and
  confidential Sadad material remain excluded. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next action: `independent Phase 09 closure review` only; do not start Phase 10.

## آخرین batch — F09-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-13 21:15 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; accepted commerce experience at `6298181`

- `F09-T11` — `DONE`
  Dependencies: `F09-T01` through `F09-T10` are `DONE`; no active batch existed when claimed.
  Scope: clinic-scoped direct PostgreSQL revenue read model from authoritative Payment and completed Refund only;
  ADMIN API/OpenAPI-client/dashboard revenue surface, task-owned integrations and documentation/evidence.
  Owned paths: `apps/api/src/modules/commerce/reporting/**`, `apps/api/src/modules/commerce/catalog/admin-commerce-catalog.module.ts`,
  `apps/api/test/commerce-revenue.integration.spec.ts`, `apps/dashboard/src/{features/revenue/**,app/(app)/revenue/**,lib/commerce-revenue-api.ts,lib/commerce-revenue-api.spec.ts,features/dashboard/dashboard-page.tsx,data/revenue.ts}`,
  `packages/api-client/**`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, and
  `specs/007-adopt-phase-09/**`.
  Do not change: existing Payment/Refund data or their T08/T09 mutation boundaries; `.gitignore` (user-owned);
  confidential Sadad paths/credentials; provider activation/network; patient payment experience; or F09-T12 work.
  Review: PASS — the bounded direct query reads only `Payment.commerceAmountToman` with a verified Payment
  aggregate and `Refund.amountToman` at `COMPLETED`; payment provider amount/unit, callbacks, attempts, unpaid
  orders and catalog values are not revenue sources. Clinic-local Tehran boundaries, ISO-week/month buckets,
  ADMIN-only access, inactive-clinic isolation, safe integer serialization and real `/revenue` loading/empty/
  error/forbidden/retry states are covered. No migration, provider activation or network transport was added.
  Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B12 / F09-T12` — eligible and unclaimed; do not start it in this task.

## آخرین batch — F09-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-13 20:45 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; T09 at `cdf23cc`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T10` — `DONE`
  Dependencies: `F09-T01` through `F09-T09` are `DONE`; no active batch existed when claimed.
  Scope: patient-scoped payment initiation/status/result/receipt/tracking with no client-authoritative callback;
  real dashboard order operations and source-backed operational widgets; minimal safe read DTO/API only if
  existing endpoints cannot support that UI; task-owned client/tests/docs.
  Owned paths: `apps/{api/src/modules/commerce/{payments/**,checkout/**,orders/**,catalog/admin-commerce-catalog.module.ts},app/src/{app/(app)/store/{payment/**,order-success/**,order-tracking/**,orders/**,checkout/**},lib/commerce-catalog-api.ts,lib/commerce-catalog-api.spec.ts},dashboard/src/{features/{orders/**,dashboard/**},app/(app)/{orders/**,dashboard/**},lib/commerce-orders-api.ts,data/store.ts}}`, `packages/api-client/**`, `apps/api/test/{commerce-payment-experience.integration.spec.ts,openapi-contract.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, and `specs/007-adopt-phase-09/**`.
  Do not change: accepted migrations unless a minimal additive read-model migration is unavoidable; user-owned
  `.gitignore`; confidential Sadad paths/credentials; provider enable/default/network transport; revenue/reporting
  (F09-T11), Phase-wide cleanup (F09-T12), or unrelated app/dashboard mock surfaces.
  Review: PASS — checkout now hands its persisted order to payment; the patient page uses a stable idempotency
  key and shows `SADAD_GO_LIVE_BLOCKED` without a fake attempt, token, redirect or success. Result, receipt and
  tracking re-read owner-scoped API data; receipt is unavailable without an authoritative Payment and exposes no
  provider token, credentials or raw callback data. The API exposes a minimal redacted tracking/refund read model.
  Dashboard operations call existing authorized lifecycle endpoints, and Home renders source-backed operational
  counts only (no revenue). Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B11 / F09-T11` — eligible and unclaimed; do not start it in this task.

## batch فعال — F09-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-12 03:34 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; provider-neutral payment foundation at `4b23bb1`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T09` — `DONE`
  Dependencies: `F09-T01` through `F09-T08` are `DONE`; the active-batch check was clear before this claim.
  Scope: transactional ADMIN fulfillment and manual tracking; owner/ADMIN-only pre-payment cancellation with
  exactly-once reservation release; ADMIN cancellation/return requests and manually evidenced TOMAN refunds;
  safe reconciliation of ambiguous attempts through the existing verification boundary; the corresponding
  ADMIN API, real dashboard `/orders`, OpenAPI/generated client, PostgreSQL integration tests, and task
  documentation/evidence.
  Owned paths: `apps/api/{prisma/{schema.prisma,migrations/20260912034000_phase_09_order_operations/**},src/{common/errors/api-error.ts,modules/commerce/{catalog/admin-commerce-catalog.module.ts,checkout/**,discounts/**,inventory/**,orders/**,payments/payment-verification.service.ts}},test/{commerce-order-operations.integration.spec.ts,commerce-checkout.integration.spec.ts,openapi-contract.spec.ts,migrations.integration.spec.ts}}`, `apps/dashboard/src/{app/(app)/orders/**,features/orders/**,lib/commerce-orders-api.ts,lib/commerce-orders-api.spec.ts}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md}`, and `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: order/payment/refund/inventory/discount transaction boundary, additive Prisma
  migration, commerce module wiring, API error contract, OpenAPI/client generation and PostgreSQL lifecycle tests.
  Do not change: accepted migrations; the accepted Sadad adapter/callback/Verify flow except an unavoidable
  reconciliation boundary change; `.gitignore` (user-owned); Sadad sample/PDF/credential paths; provider
  activation/defaulting or network calls; revenue (F09-T11), patient receipt/result/tracking UI (F09-T10), or
  any later task.
  Required verification: PostgreSQL lifecycle, authorization/clinic isolation, idempotency/audit, exactly-once
  cancellation release, concurrent over-refund prevention, manual-evidence enforcement, no synthetic
  provider-refund, reconciliation concurrency/exactly-once payment effect, HTTPS tracking URL validation,
  migration/drift, OpenAPI/client/API/dashboard checks and production dashboard build.
  Review: PASS — the additive order-operations persistence preserves immutable commercial snapshots and only
  exposes ADMIN operations (apart from owner-scoped pending-payment cancellation). Fulfillment reads immutable
  shipping method; manual tracking accepts HTTPS only; refunds are TOMAN-only, manual/evidenced and bounded by
  a locked Payment; reconciliation is conditional and enters the accepted verification boundary exactly once.
  PostgreSQL replay/upgrade/seed, migration status, API/client/dashboard checks and production dashboard build
  passed. User-owned `.gitignore` remains outside the task commit. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B10 / F09-T10` — eligible and unclaimed; do not start it in this task.

## آخرین batch — F09-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 19:25 +03:30`; completed at: `2026-09-12 03:21 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; F09-T07 at `8f50018`; `SADAD_GO_LIVE_BLOCKED`

- `F09-T08` — `DONE`
  Dependencies: `F09-T01/T02/T06/T07 DONE`; no active batch existed when claimed.
  Scope: provider-neutral port/registry/capabilities; fake test-only provider; disabled Sadad protocol adapter;
  encrypted credential/config revisions and ADMIN management; patient attempt/status and safe callback/verify
  orchestration; dashboard settings and generated OpenAPI/client slice.
  Owned paths: `apps/api/src/modules/commerce/{payments/**,catalog/admin-commerce-catalog.module.ts,inventory/**}`, `apps/api/src/common/errors/api-error.ts`, `apps/api/test/{payment-provider-contract.spec.ts,sadad-adapter.spec.ts,payment-idempotency.integration.spec.ts,payment-provider-config.integration.spec.ts,openapi-contract.spec.ts,commerce-checkout.integration.spec.ts,inventory-reservation-expiry.integration.spec.ts}`, `apps/dashboard/src/{features/settings/settings-page.tsx,lib/commerce-payment-provider-api.ts}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/{09-COMMERCE-PAYMENTS.md,12-PRODUCTION-HARDENING.md},contracts/{commerce-payment-provider-v1.md,sadad-ipg-v1.md},decisions/ADR-0009-multi-provider-payment-architecture.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: payment/config/credential transaction boundary, commerce module wiring, inventory
  consumption boundary, OpenAPI/client generation and PostgreSQL payment tests.
  Do not change: accepted migrations/schema, user-owned `.gitignore`, confidential Sadad sample/PDF/credentials,
  fulfillment/refund/reconciliation operations, app/dashboard receipt flows, F09-T09 or later tasks.
  Required verification: provider contract/capability/registry/crypto/redaction/rotation/auth/clinic/default and
  attempt concurrency/idempotency; callback/Verify 0/100/mismatch/timeout/retry; no network while
  UNCONFIRMED; real PostgreSQL regression, OpenAPI/client/dashboard, typecheck/test/build/diff/scope review.
  Review: PASS — provider-neutral registry/configuration/credential lifecycle, dormant RIAL adapter and SignData,
  Form Data allowlist, injected transport orchestration and all financial idempotency paths meet T08 criteria.
  PostgreSQL, migration, generated client and dashboard gates passed. Owner approval moves merchant acceptance,
  deployment and production sign-off to Phase 12 without allowing Sadad activation in Phase 09. User-owned
  `.gitignore` and confidential material remain outside the task commit. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B09 / F09-T09` — eligible and unclaimed; do not start it in this task.

## آخرین batch — F09-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 15:10 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Completed at: `2026-09-11 19:16 +03:30`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; checkout/inventory at `dd3d108`; owner-confirmed discount policy dated `2026-09-11`

- `F09-T07` — `DONE`
  Dependencies: `F09-T05 DONE` at `3e20784`; `F09-T06 DONE` at `dd3d108`; no active batch existed when claimed.
  Scope: additive discount-reservation persistence; one-code server-authoritative checkout pricing and immutable
  snapshot; transactional global/per-patient limits; internal release/consume/expiry coordination; ADMIN-only
  audited discount API; real dashboard `/discounts`; this endpoint slice's OpenAPI/generated client and tests.
  Owned paths: `apps/api/{prisma/{schema.prisma,migrations/20260911152000_phase_09_discount_reservations/**},src/{common/errors/api-error.ts,modules/commerce/{catalog/admin-commerce-catalog.module.ts,checkout/**,discounts/**,inventory/**}},test/{commerce-discount.integration.spec.ts,discount-usage-concurrency.integration.spec.ts,commerce-checkout.integration.spec.ts,inventory-reservation-expiry.integration.spec.ts,migrations.integration.spec.ts,openapi-contract.spec.ts}}`, `apps/dashboard/{src/{app/(app)/discounts/**,features/discounts/**,lib/commerce-discount-api.ts,lib/commerce-discount-api.spec.ts}}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: Prisma/schema migration, checkout-discount transaction boundary, commerce module wiring,
  API error contract, OpenAPI/client generation, dashboard discounts source of truth and PostgreSQL test databases.
  Do not change: accepted migrations; user-owned `.gitignore`; Sadad sample/PDF/credentials; provider/callback/Verify;
  fulfillment/public cancellation/refund; unrelated app behavior; F09-T08 or later work.
  Review: PASS — PostgreSQL empty replay/Phase-08 upgrade and idempotent seed; SQL constraints for code/amount/order
  uniqueness; atomic server-priced checkout plus discount snapshot/reservation and canonical idempotency; API ADMIN
  authorization/audit; OpenAPI/client freshness; API/dashboard typechecks and dashboard build. `git diff --check`
  and scope/secret/Sadad review passed. Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B08 / F09-T08` — do not claim or start in this task.

## آخرین batch — F09-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 14:40 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Completed at: `2026-09-11 15:02 +03:30`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; checkout snapshots at `3e20784`; owner-confirmed inventory/reservation semantics dated `2026-09-11`

- `F09-T06` — `DONE`
  Dependencies: `F09-T05 DONE` at `3e20784`; no active batch existed when claimed.
  Scope: atomic checkout reservation, deterministic/global inventory ledger entries, internal idempotent
  reserve/release/consume operations, a bounded concurrency-safe expiry worker with injected clock and
  configurable 20-minute default TTL, system cancellation only after safe expiry conditions, and routing the
  existing ADMIN inventory adjustment through the ledger.
  Owned paths: `apps/api/{src/modules/commerce/{catalog/admin-commerce-catalog.service.ts,checkout/commerce-checkout.service.ts,inventory/**},src/common/errors/api-error.ts,test/{commerce-checkout.integration.spec.ts,inventory-concurrency.integration.spec.ts,inventory-reservation-expiry.integration.spec.ts,admin-commerce-catalog.integration.spec.ts,migrations.integration.spec.ts},prisma/{schema.prisma,migrations/20260911150000_phase_09_inventory_reservations/**}}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: commerce checkout/inventory transaction boundary, Prisma schema/migration if required, API error contract, test PostgreSQL databases and catalog inventory mutation.
  Do not change: accepted migrations through F09-T05; `.gitignore` (user-owned); Sadad sample/PDF/credentials;
  discount eligibility; provider/Sadad/callback/Verify; public cancellation/fulfillment/refund; app/dashboard/
  OpenAPI/generated client absent an unavoidable accepted inventory-contract change; and F09-T07 or later work.
  Required verification: PostgreSQL checkout contention/rollback/idempotency, reserve/release/consume ledger
  consistency, expiry/recovery/retry and expiry-consume race with injected clock, ADMIN lower-than-reserved
  rejection, previous checkout/outbox regressions, migration/drift/diff and scoped review.
  Review gate: `PASS` — checkout uses atomic conditional reservation and full rollback; ledger mutations are
  global-idempotent; expiry is bounded, clock-driven and reconciliation-safe; consume remains internal for future
  Verify. PostgreSQL tests cover contention, rollback, replay and race behavior. No accepted migration was changed,
  and no provider/Sadad/outbox/UI/OpenAPI work or user-owned `.gitignore` is included.
  Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B07 / F09-T07` — do not claim or start in this task.

## آخرین batch — F09-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-11 14:00 +03:30`
Completed at: `2026-09-11 14:32 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; commerce persistence at `fa1aec4`; patient catalog/cart at `8a96539`; owner-confirmed courier-rate policy dated `2026-09-11`

- `F09-T05` — `DONE`
  Dependencies: `F09-T04 DONE` at `8a96539`; no active batch existed when claimed.
  Scope: a new additive PostgreSQL migration for clinic-scoped courier rates and the non-sensitive initial seed; ADMIN rate API/dashboard with authorization/audit; patient address management and selection; server-priced idempotent checkout; immutable order/line/address/shipping/commercial snapshots; patient checkout/order surfaces; and the task-owned OpenAPI/generated-client slice.
  Owned paths: `apps/api/{prisma/schema.prisma,prisma/seed.mjs,prisma/migrations/20260911140000_phase_09_commerce_shipping_rates/migration.sql,src/common/errors/api-error.ts,src/modules/commerce/{catalog/admin-commerce-catalog.module.ts,shipping/**,checkout/**,orders/**},test/{admin-commerce-shipping-rate.integration.spec.ts,commerce-checkout.integration.spec.ts,openapi-contract.spec.ts,migrations.integration.spec.ts}}`, `apps/dashboard/{src/lib/commerce-catalog-api.ts,src/lib/commerce-catalog-api.spec.ts,src/features/store/store-page.tsx}`, `apps/app/{src/app/(app)/store/{checkout/**,orders/**},src/lib/commerce-catalog-api.ts,src/lib/commerce-catalog-api.spec.ts}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md,decisions/ADR-0009-multi-provider-payment-architecture.md}`, `specs/007-adopt-phase-09/{spec.md,data-model.md,tasks.md}`.
  Shared/exclusive resource: Prisma schema/migration/seed, commerce module wiring, checkout/order route family, and this task's OpenAPI/generated-client slice.
  Do not change: accepted F09-T02 migration; `.gitignore` (user-owned); Sadad sample/PDF/credentials; payment/provider/Sadad behavior; discount eligibility; reservation/ledger/expiry/stock mutation; fulfillment/refund; and F09-T06 or later implementation.
  Required verification: PostgreSQL clean replay and baseline upgrade with the additive migration, seed idempotency and rate constraints; authorization/audit/address ownership/idempotency/immutable-snapshot integration; OpenAPI/client freshness; API/app/dashboard/client tests/builds; drift/diff/review and user-change/confidential-path preservation.
  Review gate: `PASS` — only claimed checkout/shipping/migration/API/app/dashboard/generated-client/planning paths are included. The new additive migration preserves F09-T02; `PICKUP` is server-priced at zero, `COURIER` is fail-closed with no active clinic rate, and no provider/Sadad path is activated. User-owned `.gitignore` and confidential sample/PDF paths remain unstaged.
  Evidence: [`logs/phase-09.md`](logs/phase-09.md).
  Next eligible batch: `F09-B06 / F09-T06` — do not claim or start in this task.

## آخرین batch — F09-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 20:52:27 +03:30`
Completed at: `2026-09-10 21:17 +03:30`
Phase: `09-COMMERCE-PAYMENTS`
Batch status: `DONE`
Contract baseline: F09-T01 FROZEN at `750d53f`; payment persistence at `fa1aec4`; dashboard catalog at `858246d`

- `F09-T04` — `DONE`
  Dependencies: `F09-T03` DONE at `858246d`; no active batch existed when claimed.
  Scope: authenticated patient catalog browse/search/detail plus persisted, patient-scoped wishlist and cart.
  Owned paths: `apps/api/src/modules/commerce/catalog/**`, `apps/api/src/modules/commerce/cart/**`, `apps/api/test/patient-commerce-catalog.integration.spec.ts`, `apps/api/test/patient-cart.authorization.spec.ts`, `apps/api/test/openapi-contract.spec.ts`, `apps/app/src/app/(app)/{page.tsx,store/**}`, `apps/app/src/stores/cart.ts`, `apps/app/src/stores/wishlist.ts`, `apps/app/src/lib/data/catalog.ts`, `apps/app/src/lib/commerce-catalog-api.ts`, `apps/app/src/lib/commerce-catalog-api.spec.ts`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, `specs/007-adopt-phase-09/**`.
  Contract: preserve integer TOMAN, active product plus active SKU visibility, patient isolation, and no stock reservation on cart mutation. Do not implement checkout, address/shipping, order, discount, payment, provider, or Sadad behavior.
  Verification: real-PostgreSQL catalog/cart/wishlist integration and isolation tests; API/app/client checks;
  OpenAPI/client freshness; production app build; migration-ledger drift check; diff review; preservation of
  unrelated and confidential Sadad paths — PASS.
  Review gate: `PASS` — only claimed API/app/client/generated/status/evidence/spec paths are included. Integer
  TOMAN remains string-serialized at the boundary; cart mutations do not reserve stock or write the ledger;
  no checkout/order/discount/payment/Sadad behavior, schema/migration, credential, sample/PDF or user-owned
  `.gitignore` change is included.
  Next eligible batch: `F09-B05 / F09-T05` — do not claim or start in this task.

## آخرین batch — F09-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 06:35 +03:30`
Completed at: `2026-09-10 20:05 +03:30`
Phase: `Phase 09 — Commerce, Inventory & Payments`
Batch status: `DONE`
Contract baseline: accepted `F09-T01` at `750d53f`; persistence baseline `F09-T02` at `fa1aec4`

Tasks:

- Task ID: `F09-T03`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F09-T02 DONE` — verified at `fa1aec4`
  Scope: ADMIN-only catalog/category/product/SKU/price/inventory API and audit, response DTOs/stable errors/pagination, dashboard `/store` and `/store-builder` real data states, and this endpoint slice's OpenAPI/generated client.
  Owned paths: `apps/api/{src/modules/commerce/**,src/app.module.ts,src/common/auth/authorization.policy.ts,src/common/errors/api-error.ts,test/admin-commerce-catalog.integration.spec.ts,test/openapi-contract.spec.ts}`, `apps/dashboard/{src/features/store/**,src/features/store-builder/**,src/data/store.ts,src/lib/commerce-catalog-api.ts,src/lib/commerce-catalog-api.spec.ts,src/app/(app)/store/**,src/app/(app)/store-builder/**}`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/api-client.spec.ts,README.md}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, `specs/007-adopt-phase-09/**`
  Shared/exclusive resource: commerce module wiring, task-owned OpenAPI export/generated API-client slice and dashboard commerce source of truth
  Do not change: `.gitignore` (user-owned), `apps/app/**`, Prisma schema/migrations/seed, payment/discount/order/refund/revenue/reservation/ledger behavior, non-commerce dashboard surfaces, Sadad adapter/configuration/network, or confidential Sadad PDF/.NET sample.
  Verification: PostgreSQL API integration for authorization/audit/validation/lifecycle/constraints/pagination,
  dashboard API-client loading/error/empty/retry and mutation coverage, OpenAPI runtime/checked-in freshness,
  API/dashboard/client typecheck/test/build, scope review and `git diff --check` — PASS.
  Review gate: `PASS` — only task-owned API/dashboard/client/generated/status/evidence/spec paths are included;
  no Prisma migration, app/cart/checkout/order/discount/reservation/provider/Sadad behavior, credential, sample
  or PDF path is included. The user-owned `.gitignore` remains unstaged.
  Next eligible batch: `F09-B04 / F09-T04` — do not claim or start in this task.

## آخرین batch — F09-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 04:50 +03:30`
Phase: `Phase 09 — Commerce, Inventory & Payments`
Completed at: `2026-09-10 06:20 +03:30`
Batch status: `DONE`
Contract baseline: accepted `F09-T01` commit `750d53f`; Phase 08 final schema and migration ledger

Tasks:

- Task ID: `F09-T02`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F09-T01 DONE` — verified at `750d53f`
  Scope: persist the frozen commerce/catalog/SKU/inventory/cart/wishlist/address/discount/order/payment-provider/payment/refund foundation, one coherent Phase 09 migration, non-sensitive idempotent seed and PostgreSQL-backed migration/constraint coverage only.
  Owned paths: `apps/api/{prisma/schema.prisma,prisma/seed.mjs,prisma/migrations/20260910050000_phase_09_commerce_foundation/migration.sql,test/migrations.integration.spec.ts}`, `plan/{STATUS.md,logs/phase-09.md,phases/09-COMMERCE-PAYMENTS.md}`, `specs/007-adopt-phase-09/**`
  Shared/exclusive resource: Prisma schema, Phase 09 migration ledger, seed and local PostgreSQL migration-test databases
  Do not change: `apps/api/src/**`, `apps/{app,dashboard}/**`, `packages/**`, OpenAPI/generated client, prior migrations, payment-provider implementation, credentials, network configuration, or the confidential Sadad PDF/.NET sample directory.
  Verification: Prisma validate/generate, TypeScript migration-test compile, manual SQL/constraint review, credential/plaintext and TOMAN×10 scan, `git diff --check`, a real PostgreSQL empty replay with seed twice, Phase 08→09 upgrade and a shadow-database migration/schema drift check all passed.
  Review gate: `PASS` — only owned paths changed; no credential, provider call, Sadad sample/PDF path, API/UI or generated output is included.
  Next eligible batch: `F09-B03 / F09-T03` — do not claim or start in this task.

## آخرین batch — F09-B01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-10 04:25 +03:30`
Completed at: `2026-09-10 04:36 +03:30`
Phase: `Phase 09 — Commerce, Inventory & Payments`
Batch status: `DONE`
Contract baseline: owner decisions supplied for `F09-T01`; Sadad production enablement remains fail-closed

Tasks:

- Task ID: `F09-T01`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: owner policy decisions — `DONE`
  Scope: freeze the catalog/SKU/price/tax/shipping/order/payment/refund and provider-neutral/Sadad-first contract; move unresolved Sadad acceptance facts to the explicit go-live gate; synchronize Phase 09 planning/specification documents and record task evidence only.
  Owned paths: `plan/{STATUS.md,phases/09-COMMERCE-PAYMENTS.md,contracts/commerce-payment-provider-v1.md,contracts/sadad-ipg-v1.md,decisions/ADR-0009-multi-provider-payment-architecture.md,logs/phase-09.md}`, `specs/007-adopt-phase-09/**`
  Shared/exclusive resource: Phase 09 contract baseline and lifecycle/error/authorization/endpoint/money/capability matrices
  Do not change: `apps/**`, `packages/**`, Prisma schema/migrations, OpenAPI/generated client, the confidential Sadad PDF/.NET sample directory, credentials, or callback payloads.
  Result: accepted; cross-document policy traceability, frozen-matrix completeness, no-secret/no-sample diff review, `git diff --check`, and Spec Kit/constitution review passed. Evidence: [`logs/phase-09.md`](logs/phase-09.md).

## آخرین batch — F08-MR

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 12:55 +03:30`
Completed at: `2026-09-05 13:15 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: final committed Phase 07 schema to final committed Phase 08 schema; branch-local unreleased migration history only

Tasks:

- Task ID: `F08-MR`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 through F08-T11 DONE`
  Scope: replace only the unreleased Phase 08 migration sequence with a coherent final-schema baseline; reconstruct a separate local candidate database from data-only source records; validate clean replay, ledger, constraints, Phase 08 regressions, and full integration.
  Owned paths: `apps/api/prisma/migrations/20260905*phase_08*/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: local PostgreSQL candidate/shadow databases and Phase 08 migration ledger
  Do not change: `Phase 07` or earlier migrations, existing rehearsal database/checksums, Phase 09 paths, application runtime/schema behavior, or production/shared environments.
  Result: one generated Phase 07→final-Phase-08 migration replaces the five unreleased branch-local migrations. Fresh replay, idempotent seed, schema diff, preserved-data fingerprints, full API suite, generated contract, app/dashboard, and whitespace gates passed; evidence: [`logs/phase-08.md`](logs/phase-08.md).

## آخرین batch — F08-B10R

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 12:10 +03:30`
Completed at: `2026-09-05 12:20 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: accepted F08-T06/F08-T07 outbox and reminder behavior; closure finding in `plan/logs/phase-08.md`

Tasks:

- Task ID: `F08-T10`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 through F08-T09 DONE`
  Scope: stale `PROCESSING` outbox-claim recovery, restart/idempotency regression, and deterministic affected Phase 08 verification fixtures only
  Owned paths: `apps/api/src/modules/outbox/**`, `apps/api/test/{outbox,reminders,mezaj-results,patient-appointments}.integration.spec.ts`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: outbox claim lifecycle and local PostgreSQL rehearsal database
  Expected verification: stale-claim restart delivery without duplicate notification, existing reminder/preference coverage, deterministic Mezaj/Tehran suites, API typecheck, and diff validation

## آخرین batch — F08-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:40 +03:30`
Completed at: `2026-09-05 11:50 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: accepted F08-T01 through F08-T10 contracts and verification

Tasks:

- Task ID: `F08-T11`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 through F08-T10 DONE`
  Scope: in-scope Phase 08 mock/local-state fallback removal, final Milestone C review, evidence, and Spec Kit consistency/convergence only
  Owned paths: `apps/{app,dashboard}/src/**` only for demonstrated Phase 08 mock removal, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: Phase 08 final evidence and status synchronization
  Expected verification: in-scope mock review, targeted frontend checks, contract/freshness review, and Spec Kit consistency/convergence

## آخرین batch — F08-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:30 +03:30`
Completed at: `2026-09-05 11:35 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `REWORK`
Contract baseline: accepted F08-T01 through F08-T09 API and UI slices

Tasks:

- Task ID: `F08-T10`
  Agent/Thread: `Codex /root`
  Status: `REWORK`
  Depends on: `F08-T01 through F08-T09 DONE`
  Scope: integrated restart/retry/idempotency, timezone, and browser E2E verification only; minimal in-scope repair only if a demonstrated defect requires it
  Owned paths: `apps/{api,app,dashboard}/test/**`, existing Phase 08 test paths, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: local PostgreSQL rehearsal database and browser validation
  Expected verification: focused restart/retry/idempotency/timezone APIs and local browser journey

## آخرین batch — F08-B09

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:20 +03:30`
Completed at: `2026-09-05 11:25 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: F08-T02/T04/T05 APIs and generated client

Tasks:

- Task ID: `F08-T09`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T02, F08-T04, F08-T05, F08-T08 DONE`
  Scope: dashboard health, notification, and published-content connection
  Owned paths: `apps/dashboard/**`, `apps/api/src/modules/assessments/notifications/**`, `apps/api/test/notifications.integration.spec.ts`, `packages/api-client/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: dashboard Phase 08 API adapters, notification read contract, and generated client
  Expected verification: dashboard typecheck, notification authorization integration, generated-client build, and targeted dashboard connection checks

## آخرین batch — F08-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 11:00 +03:30`
Completed at: `2026-09-05 11:15 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: F08-T02/T03/T04/T05 APIs and generated client

Tasks:

- Task ID: `F08-T08`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T02, F08-T03, F08-T04, F08-T05 DONE`
  Scope: patient-app tracker, notification, mezaj, and published-content connection
  Owned paths: `apps/app/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: patient-app Phase 08 API adapters and in-scope mock removal
  Expected verification: app typecheck and targeted patient-app connection checks

## آخرین batch — F08-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 10:05 +03:30`
Completed at: `2026-09-05 10:57 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: Phase 05 appointments, Phase 07 treatment tasks, and F08-T06 durable outbox

Tasks:

- Task ID: `F08-T07`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T06 DONE`
  Scope: idempotent appointment and treatment reminder event creation and delivery
  Owned paths: `apps/api/{src/modules/**,test/**}`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: reminder outbox consumer and existing schedule mutation hooks
  Expected verification: repeat-safe reminder integration tests and worker retry test

## آخرین batch — F08-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 09:57 +03:30`
Completed at: `2026-09-05 10:01 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: published-only patient content and metadata-only media policy

Tasks:

- Task ID: `F08-T05`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T04 DONE`
  Scope: content publication lifecycle and media policy API
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/**,test/**}`, `packages/api-client/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: content schema and API contract
  Expected verification: migration deploy, published-only authorization tests, Prisma/OpenAPI/client validation, and `git diff --check`

## آخرین batch — F08-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 09:43 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Completed at: `2026-09-05 09:47 +03:30`
Batch status: `DONE`
Contract baseline: immutable completed assessment submission and version result snapshot

Tasks:

- Task ID: `F08-T03`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T02 DONE`
  Scope: assessment-version-derived MezajResult persistence and patient read API
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/assessments/**,test/**}`, `packages/api-client/**`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: Prisma schema/migration, completed-assessment transaction and API contract
  Expected verification: migration deploy, assessment-derived result persistence/read authorization tests, Prisma/OpenAPI/client validation, and `git diff --check`

## آخرین batch — F08-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 09:33 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Completed at: `2026-09-05 09:41 +03:30`
Batch status: `DONE`
Contract baseline: `plan/contracts/health-observation-v1.md`

Tasks:

- Task ID: `F08-T02`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T01 DONE`
  Scope: health-observation persistence, tracker write/query, and dashboard health views
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/**,test/**}`, `apps/dashboard/src/{features,app,data}/health*`, `plan/{STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: Prisma schema/migration, health-observation API contract, PostgreSQL integration test
  Expected verification: migration replay, real PostgreSQL write/query and authorization tests, dashboard connection checks, Prisma validation/generation, and `git diff --check`

- فاز قبلی: `Phase 01 — Identity & Access` پس از Bugbot و Security Review مستقل بدون یافته باز تکمیل شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- regression مسیر dev API که metadata تزریق وابستگی Nest را حذف می‌کرد در `F01-R01` اصلاح شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- هدر وب برای session معتبر دکمه داشبورد نمایش می‌دهد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- تشخیص LAN: CORS و API سالم‌اند؛ session cookie بین `localhost` و IP شبکه مشترک نیست؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- رابط‌های app، dashboard و web در صورت معطل‌ماندن refresh حداکثر پس از ۱۰ ثانیه از حالت checking خارج می‌شوند؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- build dashboard دیگر فایل cache موقت `.next/dev` را typecheck نمی‌کند؛ build کامل workspace پاس شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- اجرای production هر چهار سرویس با `pnpm start` ممکن است و رابط‌ها روی شبکه bind می‌شوند؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- runtime API و Prisma Client با CommonJS صریح هم‌راستا شدند؛ اجرای واقعی API روی پورت ۳۰۰۳ تأیید شد؛ شواهد: [`logs/phase-01.md`](logs/phase-01.md)
- roadmap از Phase 02 به بعد بر اساس app + dashboard + API بازطراحی شد؛ تصمیم: [`ADR-0002`](decisions/ADR-0002-feature-first-roadmap.md).
- آزمون اصلی و booking eligibility به پیش از scheduling منتقل شدند؛ الزام آزمون از dashboard قابل خاموش/روشن‌کردن است.
- Dashboard Home تدریجی است و widget فاقد منبع داده واقعی پنهان می‌شود؛ عدد mock/صفر ساختگی مجاز نیست.
- قرارداد onboarding v1 در `F02-T01` پس از سه review مستقل freeze شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- workflow از این نقطه batch-based است: حداکثر سه task مستقل توسط subagentها اجرا و فقط پس از review یکپارچه Agent اصلی تیک می‌خورند.
- `F02-B01` با تکمیل و review مستقل `F02-T02` بسته شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B02` با review و verification یکپارچه بسته شد؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B03` با review مستقل و verification یکپارچه بسته شد؛ endpointهای self-profile، consent/intake و admin patient همراه OpenAPI freeze شدند؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B04` با review مستقل و verification کامل app/dashboard/API بسته شد؛ UIها فقط از generated client استفاده می‌کنند و mockهای همان scope حذف شده‌اند؛ شواهد: [`logs/phase-02.md`](logs/phase-02.md).
- `F02-B05` با تأیید دستی جریان واقعی، رفع blocker مرورگر، mock audit و گیت کامل بسته شد؛ `F02-T13` پذیرفته شد.
- `F03-T01` تا `F03-T08` مطابق checklist فاز تکمیل شده‌اند؛ شواهد بازسازی‌شده `F03-T03` تا `F03-T06` و verification جدید در [`logs/phase-03.md`](logs/phase-03.md) ثبت شد.
- dependency: `Phase 02` → DONE.

## prerequisite repair تکمیل‌شده — F06-R01

Coordinator/Thread: `Codex /root`
Started at: `2026-09-03 22:58 +03:30`
Completed at: `2026-09-03 23:24 +03:30`
Status: `DONE`
Scope: repository-baseline reconciliation discovered by `F07-T02`; represent the two existing `clinical_record_revisions` user foreign keys and its database-generated UUID default in the Prisma schema.
Owned paths: `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/.env.example`, `plan/STATUS.md`, `plan/logs/phase-06.md`
Excluded: all existing migration files, any 14-constraint compatibility migration, Phase 07 migration generation, local database mutation, and `F07-T03`.
Expected verification: isolated full migration replay and zero-drift diff against the corrected Phase 06 schema, Prisma validate/generate, focused Phase 06 clinical persistence/revision tests, and diff/whitespace validation.

Result: the Prisma schema now represents both existing nullable user foreign keys and the database-generated UUID default. All 18 committed migrations replayed in isolation; migration-history → corrected committed schema produced an empty diff; Prisma validate/generate, 5 focused clinical revision/reconciliation tests, and 2 empty-database migration/seed smoke tests passed. No migration was added or changed. Evidence: [`logs/phase-06.md`](logs/phase-06.md).

## آخرین batch تکمیل‌شده — F07-B02

Coordinator/Thread: `Codex /root`
Started at: `2026-09-03 22:20 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-treatment-policy-v1.md`

Tasks:

- Task ID: `F07-T02`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`
  Scope: migration prescription/treatment/task/adherence
  Owned paths: `apps/api/prisma.config.ts`, `apps/api/.env.example`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260903222000_phase_07_prescription_treatment_foundation/migration.sql`, `apps/api/test/migrations.integration.spec.ts`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{data-model.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Prisma schema, migration, migration integration test`
  Expected verification: Prisma validation/generation, empty-database migration smoke, focused migration integration assertions, `git diff --check`
  Result: a generated-only Phase 07 foundation migration was reviewed, applied to the clean reconstructed local database, and verified with isolated shadow, fresh PostgreSQL smoke, real constraint exercise, and Phase 06/API regression checks. The original database and verified backups remain rollback protection. Evidence: `plan/logs/phase-07.md`.

## وضعیت taskهای Phase 07

- `F07-T01` — `DONE`؛ approved issuance-policy baseline and verification: [`contracts/prescription-treatment-policy-v1.md`](contracts/prescription-treatment-policy-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T02` — `DONE`؛ migration prescription/treatment/task/adherence with clean local switchover verification: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T03` — `DONE`؛ prescription create/draft/issue/revision API with append-only issued history and real PostgreSQL verification: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T04` — `DONE`؛ treatment medication/session/exercise/nutrition plan API with the owner-approved persisted `TreatmentSessionPlan` boundary and fresh PostgreSQL verification: [`contracts/treatment-session-plan-v1.md`](contracts/treatment-session-plan-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T05` — `DONE`؛ one-off treatment-task scheduling, repeat-safe patient completion, and keyed medication-adherence recording with PostgreSQL verification: [`contracts/treatment-task-activity-v1.md`](contracts/treatment-task-activity-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T06` — `DONE`؛ real task-state-derived progress and append-only patient-action timeline with PostgreSQL verification: [`contracts/treatment-progress-v1.md`](contracts/treatment-progress-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T07` — `DONE`؛ selected-patient prescription builder and dashboard treatment/progress summary use accepted F07 APIs without fabricated data: [`contracts/prescription-dashboard-connection-v1.md`](contracts/prescription-dashboard-connection-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T08` — `DONE`؛ patient treatment app uses accepted plan/activity/progress APIs without fabricated treatment data: [`contracts/patient-treatment-app-connection-v1.md`](contracts/patient-treatment-app-connection-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T09` — `DONE`؛ explicit `PRESCRIPTION_ISSUE`, default `DOCTOR` mapping, tenant/resource authorization, transactional issuance audit, and owner-approved automated-safety-rule deferral: [`contracts/prescription-treatment-policy-v1.md`](contracts/prescription-treatment-policy-v1.md), evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T10` — `DONE`؛ exported accepted F07 OpenAPI, regenerated the checked-in client, and replaced the completed F07 dashboard/app transport duplication with generated-client wrappers; evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T11` — `DONE`؛ local browser journey and PostgreSQL verification confirm immutable issued revisions, revision-only amendment, ownership, audit, persisted patient activity, and real-event progress; evidence: [`logs/phase-07.md`](logs/phase-07.md).
- `F07-T12` — `DONE`؛ final Phase 07 verification, evidence reconciliation, and Spec Kit consistency/convergence review passed; evidence: [`logs/phase-07.md`](logs/phase-07.md).

## آخرین batch تکمیل‌شده — F07-B03

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 03:31 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-treatment-policy-v1.md`

Tasks:

- Task ID: `F07-T03`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`
  Scope: prescription create/draft/issue/revision API
  Owned paths: `apps/api/src/modules/clinical/{prescription*.ts,clinical.module.ts}`, `apps/api/test/prescription*.spec.ts`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,quickstart.md,tasks.md}`
  Shared/exclusive resource: `Clinical module/API contract and PostgreSQL integration test`
  Expected verification: input/response validation, PostgreSQL lifecycle/revision/constraint integration, authorization/resource-boundary regression, Prisma validation/generation, API smoke, and `git diff --check`
  Result: append-only prescription draft/revision and exact-revision issue API accepted with optimistic concurrency, immutable issued history, integrity evidence, current clinical capability/resource boundary, and real PostgreSQL coverage. The dedicated `PRESCRIPTION_ISSUE`, audit, and contraindication enforcement remains exclusively owned by `F07-T09`; generated client synchronization remains exclusively owned by `F07-T10`.

## آخرین batch تکمیل‌شده — F07-B04

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 03:45 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/treatment-session-plan-v1.md`

Tasks:

- Task ID: `F07-T04`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`
  Scope: treatment medication/session/exercise/nutrition plan API
  Owned paths: `apps/api/prisma/{schema.prisma,migrations/*_phase_07_treatment_session_plan/migration.sql}`, `apps/api/src/modules/clinical/{treatment-plan*.ts,admin-treatment-plans.controller.ts,patient-treatment-plans.controller.ts,clinical.module.ts}`, `apps/api/src/common/errors/api-error.ts`, `apps/api/test/{migrations.integration.spec.ts,treatment-plan*.spec.ts}`, `plan/contracts/treatment-session-plan-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Prisma schema/migration, Clinical module/API contract, and PostgreSQL integration test`
  Expected verification: reviewed additive migration SQL; fresh PostgreSQL migration/constraint smoke; DTO/response validation; real PostgreSQL treatment-plan persistence and clinic-resource boundary; Prisma validation/generation; focused API smoke; and `git diff --check`
  Contract: owner-approved `TreatmentSessionPlan` definition only; no schedule, recurrence, reminder, attendance, completion, appointment/encounter/task relation, media, modality, revision, or per-session exercise/diet/video persistence. F07-T05/F07-T06 retain execution and derived status.
  Result: the isolated additive migration creates only `treatment_session_plans`, its unique `(treatment_plan_id, position)` index, and a restrictive foreign key to `treatment_plans`. The API supplies validated plan and definition CRUD, patient reads, current clinic/resource authorization, and clinical audit evidence without changing F07-T02, generating the checked-in client, or adding F07-T05 scheduling/execution behavior. Evidence: `plan/logs/phase-07.md`.

## آخرین batch تکمیل‌شده — F07-B05

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 16:41 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/treatment-task-activity-v1.md`

Tasks:

- Task ID: `F07-T05`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`
  Scope: task schedule and idempotent medication/task recording
  Owned paths: `apps/api/src/modules/clinical/{treatment-activity*.ts,admin-treatment-tasks.controller.ts,patient-treatment-activity.controller.ts,clinical.module.ts}`, `apps/api/src/common/errors/api-error.ts`, `apps/api/test/treatment-activity*.spec.ts`, `plan/contracts/treatment-task-activity-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Clinical module/API contract, common error contract, and PostgreSQL integration test`
  Expected verification: task/adherence lifecycle and idempotency, patient/clinic-resource authorization, audit, runtime OpenAPI, Prisma validation/generation, focused real PostgreSQL API integration, and `git diff --check`
  Contract: each `TreatmentTask` is a one-off medication or exercise occurrence and its `scheduledFor` is the future reminder source. No session-plan relation, recurrence engine, reminder dispatch, progress-event write/calculation, frontend connection, generated-client synchronization, or Phase 08 behavior is included.
  Result: the F07-T02 persistence foundation is reused unchanged for authorized one-off task scheduling, patient-owned repeat-safe completion, and keyed medication-adherence replay. The existing clinical capability, clinic-resource boundary, patient self boundary, audit convention, and runtime OpenAPI declarations are covered by real PostgreSQL integration. No migration, session relationship, recurrence, reminder dispatch, progress event, frontend connection, checked-in client update, or Phase 08 behavior was added. Evidence: `plan/logs/phase-07.md`.

## آخرین batch تکمیل‌شده — F07-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 16:57 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/treatment-progress-v1.md`

Tasks:

- Task ID: `F07-T06`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`
  Scope: real progress calculation and treatment timeline API
  Owned paths: `apps/api/src/modules/clinical/{treatment-progress*.ts,admin-treatment-progress.controller.ts,patient-treatment-progress.controller.ts,treatment-activity.service.ts,clinical.module.ts}`, `apps/api/test/treatment-progress*.spec.ts`, `plan/contracts/treatment-progress-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Clinical module/API contract, F07-T05 activity integration, and PostgreSQL integration test`
  Expected verification: real event append-only behavior, task-state-derived progress calculation, patient/clinic-resource authorization, audit, runtime OpenAPI, Prisma validation/generation, focused real PostgreSQL API integration, and `git diff --check`
  Contract: the existing `TreatmentProgressEvent` table records only `TASK_COMPLETED` and `MEDICATION_ADHERENCE_RECORDED` actions performed through F07-T05. Progress is derived from non-cancelled task state, while timeline entries are persisted real events. No session lifecycle, scheduling, recurrence, reminder dispatch, UI connection, generated-client synchronization, or Phase 08 behavior is included.
  Result: accepted F07-T05 task completion and medication-adherence writes now append exactly one corresponding progress event in the same transaction; retry paths append none. Authorized reads return a task-state-derived percentage and paginated persisted timeline without adding a migration, session behavior, UI connection, client sync, or Phase 08 scope. Evidence: `plan/logs/phase-07.md`.

## آخرین batch تکمیل‌شده — F07-B07

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 17:14 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-dashboard-connection-v1.md`

Tasks:

- Task ID: `F07-T07`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`
  Scope: prescription builder and dashboard patient-workspace connection
  Owned paths: `apps/dashboard/src/{features/prescriptions/**,features/patients/workspace/**,lib/prescription-treatment-api.ts}`, `apps/dashboard/src/lib/**.spec.ts`, `plan/contracts/prescription-dashboard-connection-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Dashboard clinical API adapter and treatment/prescription UI`
  Expected verification: authenticated selected-patient flow, real prescription draft/revision reads/writes, real treatment/progress reads, error/empty states without fabricated patient data, dashboard type/lint tests, API regression, and `git diff --check`
  Contract: a dashboard clinical user enters `/prescriptions` with an explicit `patientId`; absent identity shows no fabricated patient. The selected patient’s prescription builder and treatment/progress summary use accepted F07 APIs. F07-T10 retains generated-client synchronization and any remaining broad mock/local-state cleanup; F07-T08 retains patient-app connection.
  Result: accepted after dashboard adapter contract tests, full dashboard tests/typecheck/lint/build, focused F07 API regression, and whitespace review. The prescription builder is reachable only from a selected real patient and the workspace renders server data/error states without fabricated patient, prescription, treatment, or progress data. Evidence: `plan/logs/phase-07.md`.

Next eligible batch: `F07-B08` — `F07-T08` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B08

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 17:17 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/patient-treatment-app-connection-v1.md`

Tasks:

- Task ID: `F07-T08`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`, `F07-T07 DONE`
  Scope: patient-app treatment, medication, session, exercise, and real-progress connection
  Owned paths: `apps/app/src/{app/(app)/treatment/**,lib/patient-treatment-api.ts}`, `apps/app/src/lib/**.spec.ts`, `plan/contracts/patient-treatment-app-connection-v1.md`, `plan/logs/phase-07.md`, `plan/STATUS.md`, `plan/phases/07-PRESCRIPTION-TREATMENT.md`, `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,quickstart.md,contracts/phase-07-adoption.md,tasks.md}`
  Shared/exclusive resource: `Patient treatment API adapter and treatment UI`
  Expected verification: authenticated patient own-resource reads, medication adherence and task completion wiring where available, real treatment/session/exercise/progress display, truthful loading/error/empty states, app type/tests/build, focused F07 API regression, and `git diff --check`
  Contract: the treatment app reads only the authenticated patient's accepted F07 APIs. It renders persisted treatment definitions, tasks, and derived progress without a fabricated plan, medication, session, exercise, diet, task, or timeline. F07-T09 retains authorization/audit/warning policy; F07-T10 retains generated-client synchronization and any remaining broad mock/local-state cleanup; F07-T11 retains browser E2E.
  Result: accepted after patient treatment adapter contract tests, full app tests/typecheck/build, focused F07 API regression, and whitespace review. The app reads patient-owned data and records only the accepted completion/adherence actions. Evidence: `plan/logs/phase-07.md`.

Next eligible batch: `F07-B10` — `F07-T10` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B10

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 19:12 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-dashboard-connection-v1.md`, `plan/contracts/patient-treatment-app-connection-v1.md`, and `plan/contracts/prescription-treatment-policy-v1.md`

Tasks:

- Task ID: `F07-T10`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`, `F07-T07 DONE`, `F07-T08 DONE`, `F07-T09 DONE`
  Scope: Phase 07 OpenAPI export/generated client synchronization and removal of the temporary typed Phase 07 dashboard/app API adapters or remaining in-scope mock/local state
  Owned paths: `apps/api/openapi.json`, `packages/api-client/{openapi.json,src/schema.generated.ts,src/index.ts,test/**}`, `apps/{app,dashboard}/src/{lib,features}/**` only where a completed F07 connection uses a temporary Phase 07 adapter, `plan/{STATUS.md,logs/phase-07.md,phases/07-PRESCRIPTION-TREATMENT.md}`, `specs/005-adopt-phase-07/**`
  Shared/exclusive resource: OpenAPI export, generated API client, and Phase 07 client-adapter integration
  Expected verification: runtime OpenAPI/export/client freshness, app/dashboard generated-client connection tests and type/build checks, focused API regression, no in-scope mock/local-state fallback, and `git diff --check`
  Contract: synchronize accepted F07 contracts only. Preserve the approved no-active-contraindication-rule boundary, existing issuance authorization/audit/revision integrity, treatment-session boundary, and all F07-T05 scheduling scope. Do not add endpoints, migrations, authorization rules, role-management UI, browser E2E, Phase 08 work, or fabricated fallback data.
  Result: accepted F07 runtime OpenAPI was exported and generated client types refreshed. Both completed F07 transport adapters now use generated operation paths/request bodies/response types with their existing error/timeout behavior, and no in-scope mock/local fallback remains. No server contract/product behavior changed. Evidence: `plan/logs/phase-07.md`.

Next eligible batch: `F07-B11` — `F07-T11` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B11

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 19:35 +03:30`
Completed at: `2026-09-04 22:56 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: `plan/contracts/prescription-treatment-policy-v1.md`, `plan/contracts/prescription-dashboard-connection-v1.md`, `plan/contracts/patient-treatment-app-connection-v1.md`, and the F07-T11 browser gate in `specs/005-adopt-phase-07/quickstart.md`

Tasks:

- Task ID: `F07-T11`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01 DONE`, `F07-T02 DONE`, `F07-T03 DONE`, `F07-T04 DONE`, `F07-T05 DONE`, `F07-T06 DONE`, `F07-T07 DONE`, `F07-T08 DONE`, `F07-T09 DONE`, `F07-T10 DONE`
  Scope: integrated immutability/amendment/ownership verification and local browser E2E for the accepted Phase 07 dashboard issue → patient app display → patient log → dashboard review journey
  Owned paths: `apps/{api,app,dashboard}/test/**` or existing F07 test paths only if a verification gap needs a focused regression, `plan/{STATUS.md,logs/phase-07.md,phases/07-PRESCRIPTION-TREATMENT.md}`, and `specs/005-adopt-phase-07/**`
  Shared/exclusive resource: local browser verification, integration test database, and F07 acceptance evidence
  Expected verification: issued-revision immutability/amendment and authorization/ownership/audit regression; fresh dashboard/app browser journey with persisted data across refresh and a second authenticated session; real derived progress; no active contraindication rule behavior; and `git diff --check`
  Contract: verification only unless a demonstrated F07 defect requires a minimal in-scope repair. Preserve F07-T01–T10 behavior and the approved no-active-contraindication-rule, TreatmentSessionPlan, task scheduling, and generated-client boundaries. Do not add role management, new product behavior, migrations, or Phase 08 work.
  Result: accepted after a local browser flow using disposable synthetic accounts, persisted patient activity across a fresh page and a second authenticated session, dashboard review, exact revision/audit inspection, focused real-PostgreSQL API tests, dashboard/app tests and typechecks, Prisma validation/status, and whitespace review. The synthetic data was removed after verification; no preserved local-development record was changed.

Next eligible batch: `F07-B12` — `F07-T12` is eligible, unclaimed, and not started.

## آخرین batch تکمیل‌شده — F07-B12

Coordinator/Thread: `Codex /root`
Started at: `2026-09-04 23:00 +03:30`
Completed at: `2026-09-04 23:09 +03:30`
Phase: `Phase 07 — Prescription & Treatment`
Batch status: `DONE`
Contract baseline: the accepted Phase 07 roadmap, contracts, and `specs/005-adopt-phase-07/` artifacts

Tasks:

- Task ID: `F07-T12`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F07-T01` through `F07-T11` `DONE`
  Scope: final Phase 07 verification, evidence, authoritative checklist/status reconciliation, and Spec Kit consistency/convergence review only
  Owned paths: `plan/{STATUS.md,logs/phase-07.md,phases/07-PRESCRIPTION-TREATMENT.md}` and `specs/005-adopt-phase-07/**`
  Shared/exclusive resource: Phase 07 final evidence and status synchronization
  Expected verification: Prisma migration/schema status, runtime OpenAPI/generated-client freshness, relevant API/frontend suites, `git diff --check`, in-scope mock/local-state and Phase 08 leakage review, and Spec Kit prerequisite/consistency/convergence analysis
  Contract: do not change product code, migrations, generated artifacts, completed F07 tasks, or Phase 08. Mark `F07-T12` done only after every gate passes; leave Phase 07 `READY_FOR_REVIEW` for an independent closure review.
  Result: all gates passed. The active clean PostgreSQL database reports all 22 committed migrations applied; Prisma validation passed; runtime OpenAPI/client regeneration created no drift; the API, generated-client, dashboard, and app suites/typechecks/builds passed; in-scope F07 sources contain no mock or browser-local-state fallback; no Phase 08 path or behavior was added; and final Spec Kit prerequisite, requirement-coverage, ordering, consistency, and convergence checks found no gap or new task. Phase 07 is `READY_FOR_REVIEW`; independent closure review remains required before any later phase is considered.

## آخرین batch بسته‌شده

`F07-CLOSE` — `DONE (CLOSED)`

- review مستقل closure تمام معیارهای `F07-T01` تا `F07-T12`، قراردادهای accepted، migration/schema،
  generated OpenAPI/client، authorization/resource scope، audit، immutable prescription revision،
  treatment/task/adherence/progress، dashboard/app behavior، browser evidence، و Spec Kit را
  مرور کرد و blocker، drift یا تغییر unrelated پیدا نکرد؛ شواهد: [`logs/phase-07.md`](logs/phase-07.md).
- `Phase 08` همچنان `NOT_STARTED` است؛ هیچ task، batch یا آماده‌سازی برای آن انجام نشده است.

## وضعیت taskهای فاز پیشین

- `F06-T01` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T02` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T03` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T04` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T05` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T06` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T07` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T08` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T09` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T10` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T11` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)
- `F06-T12` — `DONE`؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md)


### وضعیت تاریخی Phase 05

- `F05-T01` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T02` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T03` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T04` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T05` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T06` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T07` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T08` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T09` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T10` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T11` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T12` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T13` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)
- `F05-T14` — `DONE`؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md)

### وضعیت تاریخی Phase 04

- `F04-T01` — `DONE`
- `F04-T02` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T03` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T04` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T05` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T06` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T07` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T08` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T09` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T10` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T11` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md)
- `F04-T12` — `DONE`؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md)

## آخرین batch بسته‌شده

`F06-CLOSE` — `DONE (CLOSED)`

- review مستقل closure تمام معیارهای پذیرش `F06-T01` تا `F06-T12`، قرارداد policy بالینی،
  migrationهای applied، generated OpenAPI/client، revision/sign/publish، authorization/resource
  scope، audit/redaction، patient visibility، test/build و evidence مرور شد و blocker یا drift
  پیدا نشد؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- `Phase 07` همچنان `NOT_STARTED` است؛ هیچ task یا batch آن claim یا آماده‌سازی نشده است.

`F06-B12` — `DONE`

- `F06-T12` evidence، full verification و review سازگاری/همگرایی Spec Kit را پذیرفت؛ Phase 06
  اکنون `READY_FOR_REVIEW` است و هیچ task جدیدی به roadmap افزوده نشد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- next action: independent Phase 06 review; `Phase 07` remains `NOT_STARTED`.

`F06-B11` — `DONE`

- `F06-T11` OpenAPI runtime/client را با response schemaهای clinical همگام کرد، dashboard/app را
  به generated client منتقل کرد، و gateهای security/revision/browser را پذیرفت؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T12`؛ هنوز claim نشده است.

`F06-B10` — `DONE`

- `F06-T10` سه surface بیمار را به summary/history/timeline مجاز persisted وصل و mockهای visit,
  prescription, score و treatment را حذف کرد؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T11`؛ هنوز claim نشده است.

`F06-B09` — `DONE`

- `F06-T09` patient workspace dashboard را به clinical workspace مجاز، note/record revision،
  sign/publish، appointment، assessment و timeline واقعی وصل کرد؛ traditional analysis بدون
  data model Phase 06 صادقانه empty state است؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T10`؛ هنوز claim نشده است.

`F06-B08` — `DONE`

- `F06-T08` permissionهای بالینی configurable، grant صریح actor-to-clinic، guard fail-closed و
  audit تراکنشی redacted را برای readهای clinical بیمار و writeهای note/reconciliation پذیرفت؛
  export/download هنوز endpoint ندارد و بنابراین خارج از permission/audit قابل دسترسی نیست؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T09`؛ هنوز claim نشده است.

`F06-B07` — `DONE`

- `F06-T07` patient-safe timeline/history/visit-summary read model را فقط از current explicitly
  published summary روی encounter تکمیل‌شده می‌خواند؛ private/draft/signed-but-unpublished content
  و audit metadata خارج می‌مانند؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T08`؛ هنوز claim نشده است.

`F06-B06` — `DONE`

- `F06-T06` چهار نوع clinical record را فقط از provenance immutable intake و human review صریح
  ایجاد می‌کند؛ edit و signing برای revision جاری append-only، private-by-default و دارای
  optimistic-concurrency است؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T07`؛ هنوز claim نشده است.

`F06-B05` — `DONE`

- `F06-T05` revision chain private-by-default برای ClinicalNote را با optimistic concurrency،
  signing exact revision و amendment append-only پذیرفته کرد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T06`؛ هنوز claim نشده است.

`F06-B04` — `DONE`

- `F06-T04` یک Encounter جدا را هنگام start appointment معتبر و در همان transaction می‌سازد و
  هنگام complete آن را تکمیل می‌کند؛ retryهای start/call-next duplicate تولید نمی‌کنند؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T05`؛ هنوز claim نشده است.

`F06-B03` — `DONE`

- `F06-T03` persistence افزایشی encounter، clinical core، source provenance و patient access audit
  را با migration/constraint و smoke PostgreSQL واقعی پذیرفته کرد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T04`؛ هنوز claim نشده است.

`F06-B02` — `DONE`

- `F06-T02` قرارداد intake خوداظهاری به clinical record reviewed را با provenance immutable،
  human review صریح، جداسازی clinical output، visibility private-by-default و مرزبندی taskهای
  migration/reconciliation freeze کرد؛ شواهد: [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T03`؛ هنوز claim نشده است.

`F06-B01` — `DONE`

- `F06-T01` پس از freeze قرارداد policy داده بالینی، بررسی traceability با roadmap/standards/
  authorization/audit و review coordinator پذیرفته شد؛ شواهد:
  [`logs/phase-06.md`](logs/phase-06.md).
- task واجد شرایط بعدی: `F06-T02`؛ هنوز claim نشده است.

`F05-CLOSE` — `DONE (CLOSED)`

- review مستقل closure تمام taskها، migration/seed، contract/client، concurrency، browser E2E،
  buildها، mock boundary و evidence/spec synchronization را پذیرفت؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- `Phase 05` اکنون `DONE (CLOSED)` است. `Phase 06` همچنان `NOT_STARTED` و بدون claim است.

`F05-B14` — `DONE`

- `F05-T14` پذیرفته شد: تمام taskهای Phase 05، exit criteria، migration/seed smoke، suiteهای
  مرتبط، browser evidence و Spec Kit consistency/convergence review پاس شده‌اند؛ Phase 05
  اکنون `READY_FOR_REVIEW` است؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task جدیدی claim نشده است. review مستقل فاز باید پیش از `DONE` شدن و فعال‌سازی Phase 06 انجام شود.

`F05-B13` — `DONE`

- `F05-T13` پذیرفته شد: browser E2E محلیِ synthetic از register/profile/assessment تا booking و
  عملیات dashboard/queue پایان یافت؛ calendar و Home V1 با داده‌های عملیات هم‌خوان بودند و
  baseline query/load PostgreSQL ثبت شد؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T14`؛ هنوز claim نشده است.

`F05-B12` — `DONE`

- `F05-T12` پذیرفته شد: PostgreSQL واقعی ۱۰۰ درخواست هم‌زمان را با دقیقاً یک رزرو موفق و
  ۹۹ conflict پایدار کنترل می‌کند؛ idempotency، authorization و transitionهای تکراری نیز
  regression-tested هستند؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T13`؛ هنوز claim نشده است.

`F05-B11` — `DONE`

- `F05-T11` پذیرفته شد: runtime OpenAPI و generated client تمام endpointهای Phase 05 را پوشش
  می‌دهند و fixture appointment و badgeهای عملیاتی ساختگی حذف شدند؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T12`؛ هنوز claim نشده است.

`F05-B10` — `DONE`

- `F05-T10` پذیرفته شد: Dashboard Home V1 فقط KPI و برنامهٔ امروز clinic-local و activity
  واقعی رزرو را نمایش می‌دهد؛ widgetهای بیمار و assessment نیز فقط منابع زندهٔ پیشین دارند.
  integration PostgreSQL، typecheck و test dashboard پاس شدند؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T11`؛ هنوز claim نشده است. OpenAPI/generated client فقط در همین
  task هماهنگ خواهد شد.

`F05-B09` — `DONE`

- `F05-T09` پس از typecheck/build dashboard و integration واقعی PostgreSQL برای list و queue
  مرتب‌شده پذیرفته شد؛ شواهد:
  [`logs/phase-05.md`](logs/phase-05.md).
- task واجد شرایط بعدی: `F05-T10`؛ هنوز claim نشده است.
- هماهنگ‌سازی generated OpenAPI client عمداً در مالک آن، `F05-T11`، باقی مانده است؛ بنابراین
  `test/openapi-contract.spec.ts` تا آن task runtime document را با client checked-in ناسازگار گزارش می‌کند.

`F05-B01` بسته شد: `F05-T01` پس از review قرارداد lifecycle، cancellation/reschedule و price
snapshot پذیرفته شد؛ شواهد: [`logs/phase-05.md`](logs/phase-05.md).

`F04-B08` بدون تغییر implementation بسته شد: generated client مانع `F04-T08` و `F04-T09` بود. با authorization صریح مالک، `F04-B10` فقط prerequisite slice از `F04-T10` را اجرا و review کرد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B08-R1` برای `F04-T08` پس از dashboard verification و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B09` برای patient doctor detail، انتخاب doctor/service و availability مشتق‌شده پس از review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B10-R1` برای completion نهایی `F04-T10` پس از migration/seed smoke، contract drift و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B11` پس از review coordinator و گیت واقعی PostgreSQL/API/browser بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md).

`F04-B12` پس از migration/seed smoke، full API suite، frontend/client verification، evidence reconciliation و review coordinator بسته شد؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md).

`F04-CLOSE` با independent review بسته شد: تمام taskها، migration/seed، OpenAPI/generated client، تست‌های نهایی، browser evidence، mock boundary و Spec Kit consistency پذیرفته شدند؛ شواهد: [`logs/phase-04.md`](logs/phase-04.md) و [`../specs/002-adopt-phase-04/evidence.md`](../specs/002-adopt-phase-04/evidence.md).

`Phase 04` اکنون `DONE (CLOSED)` است. `F05-B01` تا `F05-B03` پس از review بسته شدند؛ شواهد:
[`logs/phase-05.md`](logs/phase-05.md). `F05-T04` در batch جاری claim شده است.

## Blockerها و تصمیم‌های باز

- [ ] متن و الزامات حقوقی consent/retention پیش از release عمومی Phase 02؛ مدل versioned consent در خود Phase 02 اجباری است.
- [ ] تعیین سرویس SMS/OTP پیش از فعال‌سازی کانال پیامکی در `Phase 08`؛ in-app notification مستقل است.
- [ ] `Phase 09`: policy تجاری `F09-T01` freeze شده است. Amount/formula، نسخه/محیط، redirect،
  callback/date transport، egress IP/domain و credential سداد `SADAD_GO_LIVE_BLOCKED` هستند؛ تا تأیید
  کتبی Sadad enabled/default یا متصل واقعی نمی‌شود و sandbox/inquiry/webhook/refund/partial-refund
  capability ندارد.
- [ ] تعیین provider و policy ویدئو پیش از قابلیت ویدئویی `Phase 10`؛ chat متنی می‌تواند مستقل اجرا شود.
- [ ] تعیین deployment provider، RPO/RTO و secret manager در release planning فاز `Phase 12`.

## یادداشت وضعیت repository در زمان ایجاد این برنامه

- فایل `apps/app/src/components/home/slider-data.ts` دارای تغییر محلی از قبل بوده و متعلق به این برنامه نیست.
- فایل `justforcheck.md` untracked و منبع تحقیق معماری کاربر است.
- Agentها نباید این دو مورد را بدون درخواست صریح کاربر تغییر، حذف یا reset کنند.
