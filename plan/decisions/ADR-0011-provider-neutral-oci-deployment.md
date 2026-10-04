# ADR-0011 — Provider-neutral OCI deployment artifacts

- وضعیت: `ACCEPTED`
- تاریخ: `2026-10-02`
- تصمیم‌گیرندگان: مالک پروژه
- فاز/task مرتبط: `F12-T02 corrective extension`
- جایگزین ADR قبلی: `ندارد`

## Context

Liara اولین provider هدف باقی می‌ماند، اما release artifact نباید به SDK، API یا lifecycle یک provider وابسته باشد.
یک digest آزمایش‌شده باید بدون rebuild میان staging و production و میان میزبان‌های Linux/OCI-compatible جابه‌جا شود.

## Decision

API، web، app و dashboard به imageهای OCI چندمرحله‌ای و non-root تبدیل می‌شوند. envelope پشتیبانی‌شده عبارت است از
OCI/Linux، PostgreSQL 16+ خارجی، HTTPS reverse proxy، WebSocket، `PORT`/`HOSTNAME` runtime، env یا فایل-secret و
outbound HTTPS. Liara فقط profile مستندسازی‌شدهٔ port/health/domain/secret injection/static-egress است؛ runtime آن
هیچ مفهوم Liara ندارد. Next public configuration از فایل runtime عمومی خوانده می‌شود، نه `NEXT_PUBLIC_*` build-time.

لایهٔ نهایی هر چهار image دقیقاً از `gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e`
است. stageهای build می‌توانند از Node 24 slim رسمی استفاده کنند، اما runner نه shell و نه package manager سراسری
ندارد و با UID/GID عددی `65532:65532` اجرا می‌شود. entrypointهای کوچک Node مسئول خواندن امن secret-fileهای API،
نوشتن runtime-config عمومی Next و سپس اجرای process اصلی هستند.

## Alternatives Considered

- artifact یا SDK ویژهٔ Liara: رد شد؛ promotion digest و portability را می‌شکند.
- rebuild جدا برای هر environment: رد شد؛ تنظیمات عمومی را با artifact مخلوط می‌کند.
- Redis/Kubernetes از ابتدا: رد شد؛ نیاز و bottleneck اثبات‌شده وجود ندارد.

## Consequences

- migration از command یک‌بارهٔ همان API image با
  `node_modules/prisma/build/index.js migrate deploy` اجرا می‌شود و به startup عادی متصل نیست.
- realtime فقط single-instance پشتیبانی می‌شود. پیش از adapter توزیع‌شدهٔ Socket.IO/session، اجرای چند replica blocked/fail-closed است.
- static outbound egress Liara و پذیرش Sadad همچنان gate خارجی F12-T13 هستند.

## Validation

Build و smoke imageهای چهار سرویس، readiness/health، command migration روی PostgreSQL disposable و container scan.

## Revisit Trigger

نیاز به بیش از یک API/realtime replica یا adapter توزیع‌شدهٔ تأییدشده.
