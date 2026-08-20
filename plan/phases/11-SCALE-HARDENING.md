# Phase 11 — Scale & Production Hardening

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `D`
- پیش‌نیاز: featureهای هدف release تکمیل شده باشند
- خروجی اصلی: ظرفیت اندازه‌گیری‌شده، بازیابی تست‌شده و release قابل اتکا

این فاز جایگزین کیفیت مستمر نیست؛ hardening پایه از Phase 00 شروع می‌شود.

## Taskها

- [ ] `F11-T01` — تعریف SLO، traffic profile و capacity assumptions واقعی
- [ ] `F11-T02` — load test سناریوهای auth، browse، booking، chat و checkout
- [ ] `F11-T03` — query/index review با slow query evidence
- [ ] `F11-T04` — connection pool و timeout tuning
- [ ] `F11-T05` — horizontal API replica test
- [ ] `F11-T06` — cache فقط برای bottleneckهای اثبات‌شده
- [ ] `F11-T07` — backup policy و restore drill مستند
- [ ] `F11-T08` — object storage backup/version/retention verification
- [ ] `F11-T09` — secrets management و key rotation drill
- [ ] `F11-T10` — security review و dependency/container scan
- [ ] `F11-T11` — rate limit و abuse scenarios
- [ ] `F11-T12` — observability dashboard و alert runbook
- [ ] `F11-T13` — zero/low-downtime migration strategy
- [ ] `F11-T14` — rollback و incident response exercise
- [ ] `F11-T15` — ارزیابی triggerهای Redis/NATS/replica/partition/Kubernetes
- [ ] `F11-T16` — production readiness review و sign-off

## Baseline اولیه پیشنهادی

این‌ها promise ظرفیت نیستند و باید با داده واقعی بازتنظیم شوند:

- p95 read endpoint معمولی کمتر از ۳۰۰ms در staging
- p95 booking کمتر از ۸۰۰ms
- error rate کمتر از ۱٪ در تست نماینده
- ۱۰۰ تلاش هم‌زمان برای یک slot با یک booking موفق
- عدم وجود N+1 شناخته‌شده
- تمام list endpointها دارای limit
- dependency timeout و retry policy مستند

## Triggerهای ارتقای زیرساخت

### Redis گسترده‌تر

- چند API replica و نیاز rate limit مشترک
- cache برای query مشخص با hit-rate مفید
- queue workload واقعی

### NATS یا broker مستقل

- چند consumer مستقل
- نیاز replay/retention واقعی
- deployment و ownership مستقل
- Redis/BullMQ دیگر semantics لازم را تأمین نکند

### Read Replica

- فشار خواندن پایدار پس از رفع query/index
- consistency requirement مشخص
- replication lag قابل مانیتور

### Partitioning

- اندازه جدول یا maintenance روی SLO اثر دارد
- retention/delete/index maintenance دشوار شده است
- partition key با access pattern واقعی منطبق است

### OpenSearch/ClickHouse

- PostgreSQL بهینه‌شده نیاز جستجو/تحلیل را پاسخ نمی‌دهد
- datastore جدید owner، backup، security و monitoring مشخص دارد

### Kubernetes

- چند سرویس مستقل
- deployment پرتکرار و autoscaling چندنودی
- نیاز operational واقعی به scheduler/rollout/network policy
- تیم توان نگهداری آن را دارد

## معیار خروج

- SLO و capacity با evidence ثبت شده‌اند.
- load test قابل تکرار است.
- backup restore موفق ثبت شده است.
- alertها runbook دارند.
- incident/rollback exercise انجام شده است.
- هر ارتقای زیرساخت با bottleneck واقعی توجیه شده است.
