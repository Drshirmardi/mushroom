# Phase 10 — Chat & Online Consultation

- وضعیت اولیه: `NOT_STARTED`
- وضعیت فعلی: `REWORK` — JWT با session revoke‌شده در REST چت و invalidate شدن همهٔ مسیرهای revoke تا remediationهای F10-T03/F10-T04 و revalidationهای F10-T09/F10-T11 باز است. closure رسمی و Phase 11 شروع یا claim نشده است.
- Milestone: `D — تجارت و ارتباط`
- پیش‌نیاز: `Phase 05 DONE`، `Phase 06 DONE` و job infrastructure
- blocker: ندارد برای contract/persistence؛ attachment و video آگاهانه `DEFERRED / NOT_APPLICABLE FOR MVP` هستند. مقیاس چند-instance/Redis فقط با evidence Phase 12 بازبینی می‌شود.
- خروجی اصلی: پیام پایدار و waiting room متصل به appointment واقعی است.

## محدوده UI

- app: `/chat` و `/appointments/waiting-room`
- dashboard: `/messages` و conversation در patient workspace

## Taskها

- [x] `F10-T01` — retention، participant، edit/delete، report/block و attachment policy
- [x] `F10-T02` — migration conversation/message/receipt
- [x] `F10-T03` — REST list/history و create message deduplicated
- [x] `F10-T04` — WebSocket authentication/authorization و reconnect sync
- [x] `F10-T05` — delivery/read receipt و notification
- [x] `F10-T06` — DEFERRED / NOT_APPLICABLE FOR MVP — attachment
- [x] `F10-T07` — appointment waiting room و presence
- [x] `F10-T08` — app/dashboard integration و حذف mock
- [x] `F10-T09` — ordering، reconnect، abuse، authorization و load tests
- [x] `F10-T10` — DEFERRED / NOT_APPLICABLE FOR MVP — video adapter فقط با requirement تأییدشده
- [x] `F10-T11` — evidence Milestone D

## Security rework tracking

- [x] `F10-T03 REWORK` — durable authorized visibility reconciliation and send-only block policy
- [x] `F10-T03 REWORK (persisted session authorization)` — reject revoked-session JWTs on every chat REST access path
- [x] `F10-T04 REWORK` — revoke room membership immediately after current authorization loss
- [x] `F10-T04 REWORK (immediate session/user invalidation)` — disconnect joined sockets on server-side revoke without a client follow-up
- [x] `F10-T04 REWORK (revoked JWT handshake)` — reject a fresh Socket.IO handshake when its persisted session is revoked or inactive
- [x] `F10-T04 REWORK (durable revocation fence)` — serialize handshake admission with session revocation and evict sockets after every persisted revocation path
- [x] `F10-T09 REVALIDATION (durable revocation fence)` — rerun PostgreSQL/Socket.IO boundary suite after persisted-session and revocation fixes
- [x] `F10-T04 REWORK (disabled user socket invalidation)` — reject disabled users before Socket.IO admission and disconnect their existing sockets after durable deactivation
- [x] `F10-T08 REWORK` — bounded app/dashboard long-history, visibility reconciliation, and reconnect-gap pagination
- [x] `F10-T09 REVALIDATION` — PostgreSQL/Socket.IO security and reconnect proof
- [x] `F10-T09 REVALIDATION (revoked JWT handshake)` — revalidate Socket.IO middleware admission with the persisted-session boundary
- [x] `F10-T09 REVALIDATION (disabled user socket invalidation)` — revalidate durable ACTIVE-user admission, deactivation eviction and reconnect safety
- [x] `F10-T11 REVALIDATION` — final build/E2E/freshness gates after authenticated bootstrap proof
- [x] `F10-T11 REVALIDATION (revoked JWT handshake)` — final build, browser and freshness gates after persisted-session handshake enforcement
- [x] `F10-T11 REVALIDATION (disabled user socket invalidation)` — final build, browser and freshness gates after durable active-user admission and deactivation eviction

## قرارداد اجرایی freeze‌شده

- سیاست محصول و security در [`chat-consultation-v1.md`](../contracts/chat-consultation-v1.md) و تصمیم realtime در
  [`ADR-0010`](../decisions/ADR-0010-chat-consultation-realtime.md) authoritative هستند.
- PostgreSQL و REST history source of truth هستند؛ REST تنها مسیر create message committed و `clientMessageId`
  idempotent است. Socket.IO فقط publish-after-commit، presence و connection management با semantics `at-least-once` است.
- conversation فقط به یک Appointment با `visitMode=ONLINE` وصل می‌شود. authorization هر عمل server-side و appointment/clinic/resource scoped است؛ `STAFF` هیچ access MVP ندارد و DoctorProfile بدون User participant زنده نیست.
- window: UTC، از `startsAt - 15m` تا `endsAt + 60m` برای stateهای مجاز؛ hard cap عملیاتی `endsAt + 4h`؛ terminal stateها
  read-only هستند. reconnect/history همچنان authorization و cursor/sequence را server-side بررسی می‌کنند.
- attachment/F10-T06 و video/F10-T10 هیچ storage/provider/SDK/token/room/UI نمی‌سازند و فقط absence آن‌ها را evidence می‌کنند.

## وابستگی و batch map

```text
F10-T01 → F10-T02 → F10-T03 → F10-T04 → F10-T05 → F10-T06 → F10-T07 → F10-T08 → F10-T09 → F10-T10 → F10-T11
```

- هر batch فقط یک task دارد. Prisma/migration/seed فقط `F10-T02`؛ REST/common authorization/OpenAPI slice فقط `F10-T03`؛
  Socket.IO dependency/lockfile/module wiring فقط `F10-T04`؛ outbox/notification handler فقط `F10-T05`؛ final client/evidence
  freshness فقط `F10-T11` writer دارند.
- `F10-T09` تنها owner اجرای serialized PostgreSQL/gateway/load environment است. تا evidence کامل همان task، ظرفیت production یا
  distributed topology ادعا نمی‌شود.

## معیار خروج

- پیام قبل از delivery persist می‌شود.
- reconnect پیام را گم یا duplicate نمی‌کند.
- participant خارج conversation metadata دریافت نمی‌کند.
- waiting room فقط برای appointment آنلاین معتبر فعال است.

## Closure

- همهٔ `F10-T01` تا `F10-T11` و remediation/revalidationهای پس از آن پذیرفته شده‌اند؛ فاز فقط `READY_FOR_REVIEW` است.
- PostgreSQL/Socket.IO correctness، capacity، restore pagination، app/dashboard، Chrome E2E، deferred-media absence و
  commit isolation در [`logs/phase-10.md`](../logs/phase-10.md) ثبت شده‌اند.
- `.gitignore` و `plan/phases/12-PRODUCTION-HARDENING.md` خارج از تمام commitهای Phase 10 باقی مانده‌اند.
- Phase 11 فقط next eligible work است و با این closure شروع یا claim نشده است.
