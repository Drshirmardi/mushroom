# Phase 11 — Dashboard Reporting & Access Expansion

- وضعیت فعلی: `IN_PROGRESS`
- Milestone: `E — عملیات و انتشار`
- پیش‌نیاز: داده واقعی featureهای هدف release
- خروجی اصلی: Dashboard Home و گزارش‌ها کامل و تعریف‌شده‌اند؛ دسترسی‌ها در صورت نیاز از تک‌ادمین گسترش می‌یابند.

## Taskها

- [x] `F11-T01` — inventory نهایی widgetها و تعریف formula/timezone/data owner هر KPI
- [x] `F11-T02` — appointment/patient/assessment/treatment reports
- [x] `F11-T03` — commerce/revenue reports در صورت تکمیل Phase 09
- [x] `F11-T04` — Dashboard Home نهایی بدون widget mock
- [x] `F11-T05` — query/index review و aggregate فقط برای bottleneck اثبات‌شده
- [ ] `F11-T06` — audit viewer و ابزار عملیات پشتیبانی لازم
- [ ] `F11-T07` — تصمیم نقش‌های واقعی release و permission matrix
- [ ] `F11-T08` — staff membership/invitation و منوی capability-based فقط در صورت نیاز release
- [ ] `F11-T09` — authorization matrix و browser E2E نقش‌ها
- [ ] `F11-T10` — CRM/segmentation پایه فقط با requirement تأییدشده
- [ ] `F11-T11` — evidence

## قواعد

- KPI بدون formula و source ساخته نمی‌شود.
- ADMIN در تمام مدت fallback دسترسی کامل دارد، ولی ownership داده پزشکی حفظ می‌شود.
- UI role builder پویا فقط با requirement واقعی ساخته می‌شود.
- PostgreSQL گزینه اول reporting است.
