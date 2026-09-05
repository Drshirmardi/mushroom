# وضعیت زنده اجرای پروژه

> این فایل فقط وضعیت فعلی، ownership، blocker و handoff کوتاه را نگه می‌دارد. شواهد taskهای
> تکمیل‌شده در [`logs/`](logs/README.md) ثبت می‌شوند؛ checklist کامل هر فاز نیز در فایل همان
> فاز منبع حقیقت است.

## وضعیت کلی

- آخرین به‌رورسانی: `2026-09-05 10:01 +03:30`
- Milestone فعال: `Milestone C — IN_PROGRESS`
- فاز فعال: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
- وضعیت فاز فعال: `IN_PROGRESS`
- batch فعال: `F08-B06`
- task فعال: `F08-T06`
- blocker فعال: ندارد

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
- [ ] چت واقعی شده است.
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
- [ ] `Phase 08` — Follow-up, Health Tracking, Notifications & Content — `IN_PROGRESS`
- [ ] `Phase 09` — Commerce, Inventory & Payments — `NOT_STARTED`
- [ ] `Phase 10` — Chat & Online Consultation — `NOT_STARTED`
- [ ] `Phase 11` — Dashboard Reporting & Access Expansion — `NOT_STARTED`
- [ ] `Phase 12` — Production Hardening — `NOT_STARTED`
- [ ] `Deferred` — AI, Bots & Advanced Automation — خارج از roadmap اجرایی فعلی

## handoff فاز فعال

`F08-B06` — `DONE`: F08-T06 added the durable outbox bootstrap; clean-database migration replay passed.

## batch فعال — F08-B06

Coordinator/Thread: `Codex /root`
Started at: `2026-09-05 10:05 +03:30`
Phase: `Phase 08 — Follow-up, Health Tracking, Notifications & Content`
Batch status: `DONE`
Contract baseline: durable PostgreSQL outbox; T07 alone owns reminder scheduling and delivery behavior

Tasks:

- Task ID: `F08-T06`
  Agent/Thread: `Codex /root`
  Status: `DONE`
  Depends on: `F08-T05 DONE`
  Scope: ADR and bootstrap durable outbox worker for real reminders
  Owned paths: `apps/api/{prisma,schema/migrations,src/modules/**,test/**}`, `plan/{decisions,STATUS.md,logs/phase-08.md,phases/08-FOLLOWUP-CONTENT.md}`, `specs/006-adopt-phase-08/**`
  Shared/exclusive resource: outbox schema, worker process boundary
  Expected verification: migration deploy, claim/retry transaction tests, Prisma validation, and `git diff --check`

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
- [ ] تعیین درگاه پرداخت و قرارداد webhook/تسویه پیش از شروع `Phase 09`.
- [ ] تعیین provider و policy ویدئو پیش از قابلیت ویدئویی `Phase 10`؛ chat متنی می‌تواند مستقل اجرا شود.
- [ ] تعیین deployment provider، RPO/RTO و secret manager در release planning فاز `Phase 12`.

## یادداشت وضعیت repository در زمان ایجاد این برنامه

- فایل `apps/app/src/components/home/slider-data.ts` دارای تغییر محلی از قبل بوده و متعلق به این برنامه نیست.
- فایل `justforcheck.md` untracked و منبع تحقیق معماری کاربر است.
- Agentها نباید این دو مورد را بدون درخواست صریح کاربر تغییر، حذف یا reset کنند.
