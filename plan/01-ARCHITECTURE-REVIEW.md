# نتیجه بررسی پیشنهاد معماری

این سند خلاصه تصمیم‌هایی است که پس از تطبیق پیشنهادهای `justforcheck.md` با وضعیت واقعی repository گرفته شده‌اند.

## تصمیم‌های پذیرفته‌شده

- حفظ Monorepo با pnpm و Turborepo
- استقلال deployment اپ‌های `web`، `app`، `dashboard` و `api`
- NestJS به‌عنوان backend اصلی
- Modular Monolith به‌جای Microservice در شروع
- PostgreSQL به‌عنوان دیتابیس تراکنشی اصلی
- REST API با versioning و OpenAPI
- جداسازی داده پزشکی از حساب کاربری
- کنترل double booking در سطح PostgreSQL
- احراز هویت امن، session management و refresh rotation
- RBAC به‌همراه resource-level authorization
- Object Storage برای فایل‌ها
- Audit trail برای دسترسی و تغییر داده‌های حساس
- Stateless بودن API برای horizontal scaling

## تصمیم‌های پذیرفته‌شده با اجرای مرحله‌ای

### Redis

در معماری هدف وجود دارد، اما از فاز ۰۰ یا صرفاً بر اساس شماره فاز اضافه نمی‌شود. اولین زمان منطقی استفاده:

- background job واقعی
- rate limit توزیع‌شده با چند API replica
- WebSocket adapter با چند realtime instance

### Worker

worker یک runtime role است، نه الزاماً bounded context جدا. هنگام ایجاد اولین reminder/job واقعی اضافه می‌شود.

### Domain Event

رویدادهای دامنه ابتدا داخل Modular Monolith استفاده می‌شوند. برای side effectهای قابل retry از transactional outbox استفاده خواهد شد. انتخاب broker مستقل به آینده موکول شده است.

### Object Storage

هنگام اولین قابلیت فایل پزشکی یا چت وارد می‌شود، نه در foundation بدون مصرف‌کننده.

## تصمیم‌های فعلاً ردشده یا موکول‌شده

### NATS JetStream

از ابتدا اضافه نمی‌شود. Redis/BullMQ برای jobهای اولیه کافی است. NATS زمانی بازبینی می‌شود که چند consumer مستقل، replay، retention و deployment مستقل واقعاً لازم باشند.

### Kubernetes

در شروع استفاده نمی‌شود. Docker و یک محیط container-based ساده برای توسعه و deployment اولیه کافی است. Kubernetes وقتی توجیه دارد که تعداد سرویس‌ها، deploymentهای مستقل و نیاز autoscaling عملیاتی افزایش یابد.

### CQRS کامل

برای تمام سیستم اجرا نمی‌شود. تفکیک command/query در application code ممکن است، اما read model و pipeline مستقل فقط برای bottleneck اثبات‌شده ساخته می‌شود.

### ClickHouse، OpenSearch و Data Warehouse

تا وقتی PostgreSQL با index، aggregate table، full-text search یا materialized view پاسخ‌گو است اضافه نمی‌شوند.

### Read Replica، Sharding و Partitioning سراسری

از قبل اعمال نمی‌شوند. هرکدام نیازمند metric و bottleneck مشخص هستند.

### ساخت تمام packageهای مشترک

پوشه‌های `ui`، `design-system`، `auth` و `utils` صرفاً برای کامل‌بودن درخت ساخته نمی‌شوند. package فقط با مصرف واقعی حداقل دو app ایجاد می‌شود.

## اصلاح فرض مقیاس

عبارت «یک میلیون کاربر» به‌تنهایی capacity requirement نیست. برنامه ظرفیت باید بر اساس این موارد بازنویسی شود:

- Daily/Monthly Active Users
- peak concurrent sessions
- booking requests per second در ساعات اوج
- messages per second
- notification jobs per minute
- order/payment webhook rate
- حجم فایل روزانه و retention
- SLOهای latency، error rate و availability

معماری باید امکان scale داشته باشد، ولی زیرساخت باید با تست بار و metric واقعی رشد کند.

## نتیجه نهایی

مسیر مصوب پروژه:

```text
Modular Monolith + PostgreSQL + REST/OpenAPI
  → Redis/Worker هنگام نیاز async
  → WebSocket هنگام تکمیل chat
  → scale و تفکیک سرویس فقط بر اساس metric و ownership واقعی
```
