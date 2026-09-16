# Phase 12 — Production Hardening

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `E — عملیات و انتشار`
- پیش‌نیاز: featureهای target release تکمیل شده باشند
- خروجی اصلی: release قابل استقرار، مشاهده، rollback و بازیابی است.

## Taskها

- [ ] `F12-T01` — target release، SLO، traffic profile و environment strategy
- [ ] `F12-T02` — deployment provider، container/IaC و staging pipeline
- [ ] `F12-T03` — load test auth/onboarding/assessment/booking/encounter و featureهای release
- [ ] `F12-T04` — query/index، pool و timeout tuning
- [ ] `F12-T05` — backup policy، RPO/RTO و restore drill PostgreSQL
- [ ] `F12-T06` — object storage retention/restore در صورت استفاده
- [ ] `F12-T07` — secrets management و key rotation drill
- [ ] `F12-T08` — dependency/container/security scan و abuse scenarios
- [ ] `F12-T09` — observability dashboard، frontend error tracking و alert runbook
- [ ] `F12-T10` — low-downtime migration و rollback exercise
- [ ] `F12-T11` — incident response و breach workflow exercise
- [ ] `F12-T12` — browser/device/accessibility release matrix
- [ ] `F12-T13` — production readiness review و sign-off

## Sadad production acceptance gate

پیش از هر enable/default یا اتصال واقعی سداد، Phase 12 باید evidence غیرمحرمانهٔ موارد زیر را ثبت کند:

- environment و endpoint/redirect profile جاری;
- static egress IP و HTTPS callback domain/path ثبت‌شده;
- merchant/test credentials فقط در secret manager خارج از Git;
- controlled acceptance transaction با test plan;
- مشاهدهٔ واقعی callback Content-Type و field casing;
- validation عملی Amount/redirect/Verify، از جمله `TransactionDate` اختیاری و tolerant;
- monitoring و alert برای create، Verify retry، reconciliation و clock skew;
- production enable/default و merchant/product-owner sign-off.

تا این gate، `SADAD_GO_LIVE_BLOCKED` برای activation/runtime باقی می‌ماند؛ اما completion نرم‌افزاری Phase 09
و taskهای بعدی آن را مسدود نمی‌کند.

## معیار خروج

- SLO/capacity با evidence ثبت شده است.
- restore و rollback موفق ثبت شده‌اند.
- alertها owner و runbook دارند.
- هر datastore یا زیرساخت اضافی با bottleneck واقعی توجیه شده است.
