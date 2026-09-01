# Phase 04 — Clinic, Doctors, Services & Availability

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `B — کلینیک قابل رزرو`
- پیش‌نیاز: `Phase 02 DONE`؛ قرارداد eligibility از `Phase 03`
- خروجی اصلی: ادمین بدون seed یا تغییر DB پزشک، خدمت، تعرفه و ظرفیت رزرو را مدیریت می‌کند.

## محدوده UI

- app: `/doctors/[id]` و داده پزشک/خدمت در مراحل رزرو
- dashboard: بخش‌های پروفایل پزشک، ساعات کاری، برنامه کلینیک و تعرفه در `/settings`
- Dashboard Home: readiness برنامه کاری و برنامه روز آینده

## مدل‌های داده

- `DoctorProfile`
- `Specialty`
- `Service`
- `DoctorService`
- `AvailabilityRule`
- `ClinicClosure`
- `DoctorAvailabilityException`

## Taskها

- [x] `F04-T01` — قرارداد فیلد پزشک/خدمت، نوع ویزیت، مدت، فاصله و تعرفه
- [x] `F04-T02` — migration directory، doctor-service و availability
- [x] `F04-T03` — admin clinic/doctor/specialty/service CRUD
- [x] `F04-T04` — admin doctor-service assignment با mode/duration/price
- [x] `F04-T05` — admin working-hours، closures، leave و exceptions CRUD
- [x] `F04-T06` — slot generation on demand و public doctor/service/availability query
- [x] `F04-T07` — permission/audit تغییر برنامه، تعرفه و publication
- [x] `F04-T08` — فرم‌های واقعی تنظیمات dashboard
- [ ] `F04-T09` — doctor detail و انتخاب پزشک/خدمت در app
- [ ] `F04-T10` — OpenAPI/client، seed development و حذف mock scope
- [ ] `F04-T11` — overlap، timezone، query plan و browser E2E
- [ ] `F04-T12` — evidence و readiness برای appointment

> **Execution adjustment (2026-09-01):** `F04-T08` and `F04-T09` require the generated Phase 04
> client but cannot create it themselves. With explicit owner approval, the OpenAPI/client
> synchronization portion of `F04-T10` may execute first as a controlled prerequisite slice.
> `F04-T10` remains incomplete until its later deterministic seed-data and Phase 04 mock-removal
> deliverables are completed after `F04-T09`; this adjustment does not move dashboard or app
> implementation into another task.

## قواعد دامنه

- MVP یک clinic فعال دارد، اما رکوردهای دامنه `clinicId` صریح دارند.
- DoctorProfile می‌تواند پیش از داشتن login account ساخته شود.
- price integer با currency و duration دقیقه‌ای است.
- slot entity مستقل و منبع حقیقت نیست.
- خدمت، پزشک یا mode غیرفعال قابل رزرو نیست.
- تعطیلی و مرخصی روی availability اثر فوری دارد.
- overlap rule و exception نامعتبر در API و DB تا حد ممکن رد می‌شوند.

## معیار خروج

- ادمین تمام داده قابل مشاهده بیمار را از dashboard مدیریت می‌کند.
- app فقط doctor/service منتشرشده و slot واقعی را می‌بیند.
- تغییر schedule بدون دستکاری DB در availability منعکس می‌شود.
- هیچ کارت بی‌عمل مربوط به این scope در settings باقی نمانده است.
