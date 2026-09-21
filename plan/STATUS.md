# وضعیت زنده اجرای پروژه

> این فایل فقط وضعیت فعلی، ownership، blocker و handoff کوتاه را نگه می‌دارد. شواهد taskهای
> تکمیل‌شده در [`logs/`](logs/README.md) ثبت می‌شوند؛ checklist کامل هر فاز نیز در فایل همان
> فاز منبع حقیقت است.

## وضعیت کلی

- آخرین به‌رورسانی: `2026-09-21 21:35 +03:30`
- Milestone فعال: `Milestone D — Phase 10 READY_FOR_REVIEW`
- فاز فعال: `Phase 10 — Chat & Online Consultation`
- وضعیت فاز فعال: `READY_FOR_REVIEW`
- batch فعال: `ندارد`
- task فعال: `ندارد`
- blocker فعال: `ندارد؛ Phase 10 فقط منتظر fifth independent closure review است و نباید CLOSED اعلام شود.`

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
- [ ] `Phase 10` — Chat & Online Consultation — `READY_FOR_REVIEW`
- [ ] `Phase 11` — Dashboard Reporting & Access Expansion — `NOT_STARTED`
- [ ] `Phase 12` — Production Hardening — `NOT_STARTED`
- [ ] `Deferred` — AI, Bots & Advanced Automation — خارج از roadmap اجرایی فعلی

## handoff فاز فعال

`Phase 09` is independently closed at `b5d3eda`, the closure documentation commit `984579c`, and the accepted
PR-preflight remediation `F09-CI01`. Sadad remains fail-closed: Phase 12 owns merchant onboarding, production
acceptance and any enable/default decision. Phase 10 is in serialized closure-review remediation; `F10-T03 REWORK`
برای هر دو مسیر moderation transition امن و پایدار را پذیرفته و `F10-T04 REWORK` آن را پس از commit فقط به room
مجاز منتشر کرده و `F10-T08 REWORK` cache و rendering هر دو UI را به tombstone همگام کرده است.
`F10-T09 REVALIDATION` مسیرهای متاثر را با PostgreSQL/Socket.IO بازآزمایی و `F10-T11 REVALIDATION` گیت‌های نهایی
مرتبط را پاس کرده است. Phase 10 فقط `READY_FOR_REVIEW` است و fifth independent closure review لازم دارد;
Phase 11 remains `NOT_STARTED`.

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
