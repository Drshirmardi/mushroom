# ADR-0014 — ورود passwordless با OTP و مرز provider پیامک

- وضعیت: `ACCEPTED`
- تاریخ: `2026-10-11`
- تصمیم‌گیرندگان: `Repository owner, Codex /root`
- فاز/task مرتبط: `F01-R06`
- جایگزین ADR قبلی: `ADR-0001` را جایگزین نمی‌کند.

## Context

ورود نخست محصول باید با کد یک‌بارمصرف باشد، بدون آن‌که قرارداد امن session مرورگر یا وابستگی domain OTP به یک سرویس پیامکی شکسته شود.

## Decision

OTP پس از verify موفق همان session، access-token، refresh cookie، Origin validation و RBAC در ADR-0001 را صادر می‌کند. کاربر جدید بدون Credential ساخته می‌شود. OTP فقط به port delivery متکی است و FarazSMS اولین adapter واقعی آن است؛ credentialها در revision مستقل و AES-256-GCM با keyring مستقل می‌مانند. transport پیش‌فرض `disabled` و فعال‌سازی واقعی فقط با ADMIN و runtime `live` است.

## Consequences

- endpointهای password موجود سازگار باقی می‌مانند.
- provider یا credential هرگز به browser یا OTP engine نشت نمی‌کند.
- migrationهای جدید برای policy، challenge، delivery و config/revision لازم است.

## Validation

تست migration، OTP concurrency/idempotency، authorization مدیریت provider، contract OpenAPI و browser flow اجرا می‌شود.

## Revisit Trigger

افزودن provider دوم، MFA یا کاربرد OTP غیر از authentication.
