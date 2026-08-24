# استانداردهای مهندسی اجباری

این قواعد برای تمام فازها الزامی‌اند. تغییر آن‌ها نیازمند ADR و به‌روزرسانی این سند است.

## داده و دیتابیس

- PostgreSQL منبع اصلی حقیقت است.
- schema فقط از طریق migration versioned تغییر می‌کند.
- `db push` برای محیط مشترک، staging و production ممنوع است.
- migration اعمال‌شده نباید بازنویسی یا حذف شود؛ اصلاح با migration جدید انجام می‌شود.
- تمام timestampها UTC و از نوع timezone-aware هستند.
- تاریخ شمسی در دیتابیس ذخیره نمی‌شود.
- شماره موبایل canonical و قابل unique-index شدن است.
- مبلغ با integer/BigInt و currency صریح ذخیره می‌شود.
- `float` برای مبلغ ممنوع است.
- soft delete به‌صورت سراسری ممنوع است؛ فقط برای entityهایی که requirement واقعی دارند.
- clinical و financial history نباید hard delete شوند مگر طبق policy حقوقی مصوب.
- foreign key، unique، check و exclusion constraint در سطح دیتابیس اعمال می‌شوند.
- queryهای لیستی pagination اجباری دارند.
- index باید با query واقعی و `EXPLAIN` توجیه شود.

## API

- prefix نسخه: `/v1`
- Controller فاقد business rule است.
- DTO ورودی validate می‌شود.
- response نباید Prisma object خام باشد.
- errorها code پایدار انگلیسی و message قابل ترجمه دارند.
- جزئیات داخلی exception، SQL و stack trace به client نشت نمی‌کند.
- endpointهای create حساس idempotent هستند.
- APIهای admin با namespace و authorization روشن ارائه می‌شوند.
- OpenAPI با هر تغییر endpoint به‌روز می‌شود.
- client frontend از contract تولیدشده استفاده می‌کند؛ typeهای API دستی و تکراری محدود شوند.

## Authentication و Authorization

- password با Argon2id hash می‌شود.
- access token کوتاه‌مدت است.
- refresh token خام در دیتابیس ذخیره نمی‌شود.
- refresh rotation و reuse detection الزامی است.
- token، password، cookie و authorization header در log ممنوع‌اند.
- هر endpoint غیرعمومی authentication دارد.
- هر endpoint حساس authorization در سطح action و resource دارد.
- نقش `ADMIN` جایگزین بررسی ownership نیست.
- تغییر نقش، logout-all، read/write داده پزشکی و عملیات مالی audit می‌شوند.
- CORS فقط originهای مشخص را می‌پذیرد.
- rate limit برای login، refresh، OTP، upload و endpointهای عمومی اعمال می‌شود.

## داده پزشکی

- داده پزشکی از UserProfile جدا است.
- read و write حساس audit می‌شود.
- نسخه صادرشده immutable است و اصلاح با revision/amendment انجام می‌شود.
- clinical note دارای version یا optimistic concurrency است.
- AI اجازه ثبت مستقیم تشخیص یا نسخه تأییدشده ندارد.
- متن پزشکی، فایل، شماره تماس و نام کامل در logهای عملیاتی ثبت نمی‌شود.
- export و download پرونده permission و audit مستقل دارد.
- medical onboarding بیمار self-reported است و بدون review به diagnosis/clinical fact تبدیل نمی‌شود.
- نسخه consent و پذیرش/پس‌گرفتن آن پیش از ذخیره نهایی intake حساس ثبت می‌شود.

## فایل

- فایل binary در PostgreSQL ذخیره نمی‌شود.
- upload با presigned URL یا مسیر stream کنترل‌شده انجام می‌شود.
- content type، size و extension validate می‌شوند.
- فایل تا پایان validation/quarantine قابل استفاده نهایی نیست.
- object key قابل حدس و شامل نام واقعی بیمار نیست.
- دسترسی فایل private و زمان‌دار است.

## Transaction و هم‌زمانی

- transaction boundary در application use case تعریف می‌شود.
- double booking فقط با check application کنترل نمی‌شود؛ constraint دیتابیس الزامی است.
- موجودی فروشگاه ledger یا update اتمیک دارد.
- payment webhook idempotent است.
- consumerهای queue idempotent هستند.
- side effect بیرونی قبل از commit تراکنش اصلی اجرا نمی‌شود.
- برای side effect قابل retry از outbox استفاده می‌شود.

## Testing

هر feature باید متناسب با ریسک این لایه‌ها را داشته باشد:

- unit test برای ruleهای دامنه
- integration test با PostgreSQL واقعی
- API/e2e test برای جریان اصلی
- authorization matrix test
- concurrency test برای booking، inventory و payment
- migration smoke test روی دیتابیس خالی
- regression test برای bugهای رفع‌شده
- browser E2E برای مسیر کامل میان web/app/dashboard در خروج هر Milestone

mock کردن PostgreSQL در integration test پذیرفته نیست.

برای رزرو، route gate frontend تست کافی نیست؛ create و reschedule باید eligibility را در use case
authoritative دوباره بررسی کنند.

## Observability

- logها structured هستند.
- هر request یک request/correlation ID دارد.
- secret و PII redaction اجباری است.
- latency، status code، error rate و DB dependency metric ثبت می‌شوند.
- health endpoint با readiness تفاوت دارد.
- jobها success/failure/retry/dead-letter metric دارند.
- alert فقط بر metric قابل اقدام تعریف می‌شود.

## Performance

- ابتدا query و index بهینه می‌شود، سپس cache اضافه می‌شود.
- cache منبع حقیقت نیست.
- cache key، TTL و invalidation باید مستند باشند.
- N+1 query پذیرفته نیست.
- responseهای لیستی محدودیت اندازه دارند.
- compression در production ترجیحاً در reverse proxy/CDN انجام می‌شود.
- connection pool باید محدود و متناسب با تعداد replicaها باشد.

## Git و تحویل

- هر PR یک تغییر reviewable و atomic است.
- migration، code و test مربوط به یک تغییر باید هماهنگ تحویل شوند.
- تغییر unrelated وارد PR نمی‌شود.
- فایل‌های کاربر یا تغییرهای موجود reset نمی‌شوند.
- task فقط با ثبت test evidence در فایل لاگ همان فاز تیک می‌خورد؛ `STATUS.md` فقط باید
  handoff و Task بعدی را نشان دهد.

## Definition of Done عمومی

- acceptance criteria پاس شده است.
- migration و seed لازم وجود دارد.
- OpenAPI و client به‌روز هستند.
- تست‌های لازم پاس شده‌اند.
- frontend مربوطه به API متصل شده یا دلیل عدم اتصال ثبت شده است.
- logging/metrics لازم وجود دارد.
- خطای شناخته‌شده و blocker در status ثبت شده است.
- مستندات فاز به‌روز شده‌اند.
