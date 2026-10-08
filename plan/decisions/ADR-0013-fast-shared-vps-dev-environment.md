# ADR-0013 — Fast shared development environment on the release VPS

- وضعیت: `ACCEPTED`
- تاریخ: `2026-10-08`
- تصمیم‌گیرندگان: `Product owner`, `Codex /root`
- فاز/task مرتبط: `F12-T02-R9`
- جایگزین ADR قبلی: `ندارد`

## Context

مسیر فعلی `main` عمداً CI کامل، build/scan چهار image و CD مبتنی بر digest را اجرا می‌کند. این مسیر برای release
صحیح است اما feedback روزمرهٔ توسعه روی سرور را کند می‌کند. مالک محصول یک محیط مشترک و سریع روی همان VPS می‌خواهد
که هر update توسعه بدون تضعیف قرارداد production قابل مشاهده باشد.

## Decision

یک branch داخلی ثابت به نام `dev` و یک Compose project ثابت به نام `mushroom-dev` ایجاد می‌شود. push این branch،
در صورت فعال‌بودن `VPS_DEV_CD_ENABLED`، checkout همان SHA را با `rsync` و SSH دارای host key ثابت به workspace dev
می‌فرستد. containerهای Nest و سه Next app watcher توسعه را به‌صورت persistent اجرا می‌کنند. bootstrap فقط هنگام
تغییر dependency نصب را تکرار می‌کند، همیشه client/Prisma generation و forward migration را اجرا می‌کند و seed را
فقط بار اول انجام می‌دهد.

dev دارای root، Compose project، PostgreSQL volume، file secrets، cache/state، loopback ports، public origins و
resource limit مستقل است. اسکریپت پیش از اجرا این مرزها و collision با `staging` و `production-sim` را کنترل می‌کند.
Sadad غیرفعال و استفاده از داده یا credential واقعی ممنوع است. workflow dev به GHCR token یا package-write دسترسی
ندارد و هیچ فایل release را تغییر نمی‌دهد.

## Alternatives Considered

- ساخت immutable image برای هر push: مرز artifact قوی‌تری دارد، اما latency و مصرف registry دقیقاً همان مشکلی است
  که محیط dev باید حل کند.
- `git pull` مستقیم روی VPS: نیازمند نگهداری credential خواندن repository روی host است و provenance checkout را
  مبهم می‌کند؛ sync از checkout کوتاه‌عمر Actions انتخاب شد.
- preview environment برای هر branch: isolation بیشتری دارد، ولی روی یک VPS منابع و پیچیدگی proxy/database را زیاد
  می‌کند. در حال حاضر یک dev مشترک برای تیم کافی است.
- تغییر release workflow فعلی: رد شد، چون dev نباید assurance مسیر `main` را کاهش دهد.

## Consequences

### پیامدهای مثبت

- تغییر سورس عادی بدون build image یا restart کامل، پس از sync توسط watcher دیده می‌شود.
- release production بدون تغییر می‌ماند و dev از secret/database/port/state آن جدا است.
- migration و dependency change همچنان bootstrap قابل تکرار و health verification دارند.

### هزینه‌ها و trade-offها

- dev مشترک فقط آخرین push را نشان می‌دهد و برای branchهای هم‌زمان preview مستقل ندارد.
- اجرای watcher و PostgreSQL dev بخشی از CPU/RAM همان VPS را مصرف می‌کند.
- کد dev ممکن است پیش از CI کامل اجرا شود؛ بنابراین این محیط release evidence نیست.

### ریسک‌ها و کنترل‌ها

- contention با staging: resource limit، بررسی ظرفیت اولیه و امکان انتقال dev به host دوم.
- exposure کد/دادهٔ توسعه: loopback-only ports، TLS reverse proxy و VPN/IP allowlist/authentication تیم.
- overlap deploymentها: concurrency با cancel و lock سمت سرور.
- sync ناقص: rsync delay/delete semantics، bootstrap idempotent و health check پیش از ثبت source SHA.

## Implementation Impact

- workflow جدید فقط branch `dev` را پوشش می‌دهد.
- Compose و scriptهای dev مستقل اضافه می‌شوند؛ `compose.yaml` و workflow release موجود تغییر نمی‌کنند.
- schema، OpenAPI، application feature و production secrets تغییری ندارند.

## Validation

- contract test workflow و Compose؛ شبیه‌سازی first sync، source-only sync و dependency change؛ collision rejection؛
  shell/Node syntax؛ production release regression؛ و سپس اولین sync واقعی و بررسی چهار endpoint روی VPS.

## Revisit Trigger

- نیاز به چند محیط هم‌زمان، contention قابل مشاهده با staging، ورود دادهٔ حساس، یا انتقال production به همین host.
