# ADR-0002 — Roadmap feature-first و دروازه قابل تنظیم رزرو

- وضعیت: Accepted
- تاریخ: 2026-08-24
- فاز/task مرتبط: بازطراحی Phase 02+

## Context

دموی محصول دو رابط اصلی دارد: اپ بیمار و داشبورد. جریان محصول مقرر می‌کند بیمار پس از ثبت‌نام
پرونده پزشکی اولیه را تکمیل کند و، در صورت فعال‌بودن policy، آزمون اصلی ساخته‌شده توسط داشبورد را
پاسخ دهد؛ سپس اجازه رزرو دارد. roadmap قبلی assessment را بعد از scheduling قرار می‌داد و با این
جریان سازگار نبود.

## Decision

- Phase 00 و 01 و شواهد تکمیل آن‌ها حفظ می‌شوند.
- از Phase 02 به بعد roadmap بر اساس vertical slice میان app، dashboard و API اجرا می‌شود.
- ترتیب هسته: onboarding → assessment/eligibility → directory/availability → appointment → encounter → treatment.
- تکمیل medical onboarding همیشه شرط رزرو است.
- الزام main assessment در policy کلینیک قابل روشن/خاموش‌کردن است.
- submit آزمون معتبر شرط رزرو است؛ score شرط قبولی برای رزرو نیست.
- رزرو و reschedule eligibility را server-side enforce می‌کنند.
- داشبورد فعلاً یک ADMIN دارد؛ permissionهای عملیاتی ثابت برای توسعه آینده استفاده می‌شوند.
- AI/Bots، dynamic roles و زیرساخت سنگین از roadmap اجرایی خارج می‌شوند.

## Consequences

- Assessment Engine پیش از Appointment ساخته می‌شود.
- app می‌تواند next action را از onboarding/eligibility API بگیرد.
- Dashboard Home به‌صورت تدریجی با داده واقعی تکمیل می‌شود.
- policy یا publish آزمون باید audit شود.
- تغییر policy، نوبت یا نتیجه تاریخی را حذف نمی‌کند.
- taskهای Phase 02+ قبلی چون اجرا نشده بودند با taskهای roadmap جدید جایگزین می‌شوند.

## Alternatives rejected

- الزام ثابت آزمون در frontend: با درخواست مستقیم API دور زده می‌شود و قابل تنظیم نیست.
- وابسته‌کردن رزرو به score: نتیجه rule-based را به تصمیم درمانی قطعی تبدیل می‌کند.
- ساخت همه نقش‌ها از ابتدا: پیچیدگی بدون مصرف‌کنندهٔ فعلی ایجاد می‌کند.
- حفظ ترتیب قدیمی phaseها: assessment نمی‌تواند پیش‌نیاز booking باشد.
