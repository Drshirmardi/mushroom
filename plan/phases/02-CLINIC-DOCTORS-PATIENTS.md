# Phase 02 — Clinic, Doctors & Patients

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `A`
- پیش‌نیاز: `Phase 01 DONE`
- خروجی اصلی: مدل واقعی کلینیک، پزشک و بیمار و اتصال صفحات پروفایل

## مدل‌های داده

- `Clinic`
- `UserProfile`
- `PatientProfile`
- `DoctorProfile`
- `Specialty`
- `Service`
- `DoctorService`
- `DoctorClinic`

## Taskها

- [ ] `F02-T01` — تعیین فیلدهای canonical از روی UI و حذف فیلدهای صرفاً نمایشی
- [ ] `F02-T02` — migration کلینیک، پروفایل‌ها، تخصص‌ها و خدمات
- [ ] `F02-T03` — seed کلینیک، پزشک، تخصص و خدمت development
- [ ] `F02-T04` — public doctor/service queries با pagination/filter
- [ ] `F02-T05` — patient self-profile query/update
- [ ] `F02-T06` — admin patient list/detail/update
- [ ] `F02-T07` — admin doctor create/update و service assignment
- [ ] `F02-T08` — resource-level policy پایه برای patient data
- [ ] `F02-T09` — OpenAPI/client و integration صفحات doctor/profile در app
- [ ] `F02-T10` — integration لیست و workspace پایه بیمار در dashboard
- [ ] `F02-T11` — حذف mockهای مربوط به doctor/patient profile
- [ ] `F02-T12` — تست، performance query و evidence

## Endpointها

```text
GET   /v1/doctors
GET   /v1/doctors/:id
GET   /v1/services
GET   /v1/patients/me
PATCH /v1/patients/me

GET   /v1/admin/patients
GET   /v1/admin/patients/:id
PATCH /v1/admin/patients/:id
POST  /v1/admin/doctors
PATCH /v1/admin/doctors/:id
```

## قواعد داده

- `User` فقط identity است.
- height، weight، blood type و medical metadata در User قرار نمی‌گیرند.
- سن ذخیره نمی‌شود؛ تاریخ تولد ذخیره و سن محاسبه می‌شود.
- `revenue` و `visits` فیلد Patient نیستند؛ query/report محاسبه‌شده‌اند.
- متن فارسی عدد یا تاریخ در دیتابیس canonical ذخیره نمی‌شود.
- وجود یک Clinic فعلی به معنی پیاده‌سازی multi-tenancy کامل نیست.

## تست‌های اجباری

- public doctor visibility
- patient self update
- patient cannot read another patient
- staff/admin list access
- doctor profile validation
- pagination/filter query plan

## معیار خروج

- doctor list و detail در app از API می‌آید.
- profile بیمار واقعی و persist شده است.
- patients dashboard از API می‌آید.
- هیچ اطلاعات پزشکی در جدول identity اضافه نشده است.
