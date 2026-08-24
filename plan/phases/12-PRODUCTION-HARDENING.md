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

## معیار خروج

- SLO/capacity با evidence ثبت شده است.
- restore و rollback موفق ثبت شده‌اند.
- alertها owner و runbook دارند.
- هر datastore یا زیرساخت اضافی با bottleneck واقعی توجیه شده است.
