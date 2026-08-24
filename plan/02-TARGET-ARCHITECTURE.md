# معماری هدف بک‌اند

## نمای کلان

```text
apps/web ──────────┐
apps/app ──────────┼──── HTTP/REST ──── apps/api ───── PostgreSQL
apps/dashboard ────┘                         │
                                             ├──── Object Storage (first real file consumer)
                                             └──── Redis + Worker (first real async job)
```

`apps/api` تا زمان اثبات نیاز به تفکیک، یک Modular Monolith باقی می‌ماند. مرزهای داخلی باید به‌اندازه‌ای روشن باشند که تفکیک آینده ممکن باشد، ولی نباید هزینه microservice از روز اول پرداخت شود.

## Stack مصوب

- NestJS
- Fastify adapter
- PostgreSQL
- Prisma ORM و Prisma Migrate
- REST API
- OpenAPI/Swagger
- Redis و BullMQ فقط هنگام اولین reminder/job واقعی
- S3-compatible Object Storage فقط هنگام اولین فایل پزشکی/چت واقعی
- TypeScript در تمام workspace

نسخه‌های دقیق dependency هنگام اجرای `F00-T01` بر اساس lockfile و نسخه‌های رسمی پایدار انتخاب و ثبت می‌شوند.

## ساختار پیشنهادی apps/api

```text
apps/api/
  src/
    main.ts
    app.module.ts
    config/
    common/
      auth/
      errors/
      guards/
      logging/
      pagination/
      validation/
    database/
      prisma/
    modules/
      identity/
      directory/
      patients/
      scheduling/
      clinical/
      assessments/
      communications/
      content/
      commerce/
      reporting/
      automation/
      ai/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  test/
```

## مرز ماژول‌ها

### identity

مالک این مفاهیم است:

- User
- Credential
- Session
- Role/Permission
- LoginAttempt
- authentication و authorization پایه

مالک PatientProfile، DoctorProfile یا داده پزشکی نیست.

### directory

- Clinic
- DoctorProfile
- Specialty
- Service
- DoctorService
- DoctorClinic

### patients

- UserProfile
- PatientProfile
- اطلاعات جمعیت‌شناختی و تنظیمات بیمار
- ارتباط بیمار با کلینیک
- medical onboarding self-reported، consent و وضعیت تکمیل

داده‌های encounter، diagnosis و prescription متعلق به clinical هستند.

### scheduling

- AvailabilityRule
- AvailabilityException
- Appointment
- AppointmentHold
- AppointmentStatusHistory
- QueueEntry

### clinical

- Encounter
- ClinicalNote و revisionها
- Diagnosis
- Prescription و revisionها
- TreatmentPlan
- Medication/Exercise/Nutrition Plan
- MedicalFile metadata

### assessments

- AssessmentDefinition/Version
- Question/Option
- Submission/Answer/Result
- HealthObservation
- MezajResult
- ClinicPatientPolicy و booking eligibility مبتنی بر main assessment

### communications

- Notification
- NotificationDelivery
- NotificationPreference
- Conversation
- Message
- Receipt
- background delivery jobs

### content

- Article
- ArticleCategory
- Banner
- publication lifecycle

### commerce

- Product/Category
- InventoryLedger
- Cart
- Order
- Discount
- Payment/Refund
- WalletLedger در صورت نیاز قطعی محصول

### reporting

- read modelهای داشبورد
- materialized viewها
- aggregate tableها
- KPI queries

### automation

- trigger/action ruleهای محدود
- campaign audience
- job scheduling

### ai

- bot configuration
- knowledge documents
- prompt/model version
- AI conversation metadata
- human handoff

## ساختار داخلی یک ماژول پیچیده

برای ماژول‌های هسته مثل scheduling، clinical و commerce:

```text
modules/scheduling/
  domain/
    entities/
    value-objects/
    policies/
    events/
  application/
    commands/
    queries/
    ports/
  infrastructure/
    persistence/
    integrations/
  presentation/
    http/
    dto/
  scheduling.module.ts
```

برای ماژول CRUD ساده، ساخت پوشه‌های خالی و abstraction بدون مصرف ممنوع است. ساختار باید با پیچیدگی واقعی همان ماژول رشد کند.

## قواعد وابستگی

- `presentation` می‌تواند `application` را صدا بزند.
- `application` می‌تواند `domain` و portها را صدا بزند.
- `infrastructure` portهای application را پیاده‌سازی می‌کند.
- `domain` به NestJS، Prisma، HTTP، Redis یا provider خارجی وابسته نیست.
- هیچ ماژولی مستقیماً جدول‌های خصوصی ماژول دیگر را تغییر نمی‌دهد.
- ارتباط sync از public application service و ارتباط async از domain/application event انجام می‌شود.
- Prisma type نباید به response API یا frontend نشت کند.

## قرارداد API

- prefix تمام endpointها: `/v1`
- JSON برای request/response معمولی
- OpenAPI منبع تولید client فرانت
- cursor pagination برای timeline، پیام و داده حجیم
- page pagination برای لیست‌های مدیریتی محدود
- error code پایدار و مستقل از متن فارسی
- `Idempotency-Key` برای booking، order، payment و عملیات حساس create
- timestampها در ISO 8601 و UTC
- مبلغ با amount و currency صریح
- onboarding/eligibility دارای blocker code و `nextAction` پایدار است.
- create/reschedule booking eligibility را server-side enforce می‌کنند.

## فرض دسترسی MVP

- dashboard فعلاً توسط یک `ADMIN` اصلی کنترل می‌شود.
- permissionهای عملیاتی ثابت از ابتدا روی endpointها قرار می‌گیرند و فعلاً همگی به ADMIN نگاشت می‌شوند.
- UI role builder، staff invitation و multi-clinic switching تا requirement واقعی ساخته نمی‌شوند.
- `clinicId` در داده‌های دامنه حفظ می‌شود، اما tenant context پویا در MVP وجود ندارد.

نمونه خطا:

```json
{
  "code": "APPOINTMENT_SLOT_CONFLICT",
  "message": "این بازه زمانی دیگر در دسترس نیست.",
  "requestId": "...",
  "details": {}
}
```

## packages مشترک

packageهای اولیه فقط هنگام وجود مصرف‌کننده ایجاد می‌شوند:

```text
packages/contracts/   # typeها یا schemaهای تولیدشده از OpenAPI
packages/api-client/  # client تولیدشده یا wrapper استاندارد fetch
```

قواعد:

- domain entity بک‌اند داخل contracts قرار نمی‌گیرد.
- Prisma model داخل contracts قرار نمی‌گیرد.
- business logic احراز هویت داخل frontend package مشترک نمی‌رود.
- UI app موبایل و dashboard فقط در صورت اشتراک واقعی component به package مشترک منتقل می‌شود.

## مسیر رشد مقیاس

### مرحله اول

- یک API deployment
- یک PostgreSQL primary
- connection pool محدود
- Object Storage managed

### مرحله دوم

- چند API replica
- Redis برای rate limit توزیع‌شده، queue و WebSocket adapter
- worker مستقل
- CDN برای assetهای عمومی

### مرحله سوم، فقط با شواهد

- read replica
- partitioning انتخابی
- broker مستقل مانند NATS
- search/analytics datastore
- Kubernetes
- استخراج ماژول به service مستقل

استخراج یک ماژول فقط وقتی مجاز است که حداقل یکی از این شرایط وجود داشته باشد:

- الگوی scale آن به‌وضوح متفاوت باشد.
- مالک تیمی مستقل داشته باشد.
- چرخه release مستقل لازم داشته باشد.
- failure isolation آن ارزش عملیاتی قابل‌اندازه‌گیری داشته باشد.
