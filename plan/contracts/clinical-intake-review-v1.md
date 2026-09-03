# قرارداد تبدیل intake خوداظهاری به clinical record reviewed v1

- وضعیت: `FROZEN_FOR_IMPLEMENTATION`
- مالک: مرز `patients` → `clinical`
- فاز/task: `Phase 06 / F06-T02`
- نسخه قرارداد: `1.0.0`
- آخرین به‌روزرسانی: `2026-09-03`
- قراردادهای بالادستی: [`patient-onboarding-v1.md`](patient-onboarding-v1.md) و
  [`clinical-record-policy-v1.md`](clinical-record-policy-v1.md)

این قرارداد فقط مرز تبدیل evidence خوداظهاری intake به اطلاعات بالینی reviewed را freeze
می‌کند. schema/migration clinical در `F06-T03` و reconciliation و UI مربوط به diagnosis، allergy،
condition و medication statement در `F06-T06` مالکیت دارند. این سند هیچ clinical fact، endpoint،
permission assignment یا patient publication جدیدی ایجاد نمی‌کند.

## اصل محصول

`PatientMedicalIntake` و `PatientMedicalIntakeRevision` همیشه گزارش خود بیمار باقی می‌مانند؛
`COMPLETE` شدن intake، active بودن consent، خوانده‌شدن آن در dashboard، یا داشتن نقش `ADMIN`،
`STAFF` یا `DOCTOR` آن را به diagnosis، allergy، condition، medication statement یا هر clinical
fact دیگری تبدیل نمی‌کند.

یک clinical record reviewed تنها با اقدام صریح یک actor مجاز و review انسانی بر evidence انتخابی
ساخته یا تغییر می‌شود. این اقدام باید از مسیر clinical Phase 06 انجام شود؛ copying، trigger،
job، seed، migration، dashboard read، یا patient edit حق تبدیل خودکار ندارد.

## مرز داده و provenance

### منبع intake

- source مجاز فقط یک revision موجود از `PatientMedicalIntake` همان patient و همان clinic است.
- هر reference حداقل `patientId`، `clinicId`، `intakeId`، `intakeRevisionNumber` و شناسه immutable
  revision source را نگه می‌دارد. این reference به latest intake pointer تبدیل نمی‌شود.
- snapshot منبع و provenance آن (`PATIENT_SELF_REPORTED`، reported patient، recording mode،
  recorder، revision state و زمان ثبت) evidence است، نه endorsement بالینی.
- intake revision و source reference پس از ثبت review بازنویسی یا حذف نمی‌شوند. edit بعدی بیمار یا
  admin correction، clinical record موجود را mutate، invalidate، republish یا supersede خودکار
  نمی‌کند.
- `NONE`، `UNKNOWN`، پاسخ‌نداده و itemهای declaration صرفاً معناهای self-reported قرارداد
  onboarding را حفظ می‌کنند. هیچ‌کدام به‌ترتیب clinical absence، clinical uncertainty یا clinical
  presence نیستند.

### خروجی reviewed

- خروجی review یک clinical record جداگانه است؛ intake هرگز container clinical record نیست و
  PatientMedicalIntakeRevision هرگز clinical revision نام‌گذاری یا استفاده نمی‌شود.
- نوع‌های clinical در scope Phase 06 فقط diagnosis، allergy record، condition record و medication
  statement هستند. انتخاب نوع، structured fields، coding و lifecycle هرکدام در `F06-T03` و
  `F06-T06` freeze می‌شود.
- یک reviewer می‌تواند هیچ recordی ایجاد نکند، بخشی از evidence را review کند، یا برای یک source
  بیش از یک record reviewed بسازد؛ uniqueness یا mapping one-to-one فرض نمی‌شود.
- clinical value باید از review مستقل و ثبت‌شده حاصل شود، نه از copy متن source. اگر متن intake
  برای context لازم است، فقط در data path پزشکی مجاز نگه‌داری می‌شود و به audit metadata یا log
  عملیاتی کپی نمی‌شود.

## workflow تبدیل

```text
immutable self-reported intake revision
  → authorized clinician opens a specific source revision
  → explicit human review / clinical reconciliation decision
  → separate clinical record or no record
  → later save, sign, and patient publication follow clinical-record policy separately
```

1. خواندن intake برای review باید current access/consent gate قرارداد onboarding را رعایت کند؛
   bypass privileged یا role-only وجود ندارد.
2. actor پیش از ایجاد یا تغییر clinical output، source revision را انتخاب می‌کند. system source را
   به latest revision جایگزین نمی‌کند.
3. actor صراحتاً تصمیم review را ثبت می‌کند: clinical output مشخص ایجاد/به‌روزرسانی می‌شود یا
   هیچ clinical outputی ساخته نمی‌شود. تصمیم review باید به source reference و actor متصل باشد.
4. clinical output از لحظه ایجاد مطابق lifecycle revision-based policy بالینی عمل می‌کند. save،
   sign/finalization و patient publication سه operation جدا هستند؛ review intake به معنی signing
   یا publication نیست.
5. ویرایش بعدی clinical output revision جدید آن record می‌سازد. signed revision هرگز با source
   update یا edit dashboard destructively overwrite نمی‌شود.

## authorization، concurrency و audit

- clinical conversion به permission صریح `CLINICAL_RECORD_EDIT` و tenant/resource authorization
  نیاز دارد؛ role به‌تنهایی authority نیست. signing بعدی `CLINICAL_RECORD_SIGN` و amendment
  بعدی `CLINICAL_RECORD_AMEND` می‌خواهد. assignment قابل‌پیکربندی permissionها در scope policy
  باقی می‌ماند و implementation آن در taskهای بعدی است.
- actor فقط patient و clinical resource همان clinic را می‌بیند/تغییر می‌دهد که resource-level
  policy مجاز کند. وجود dashboard access یا نقش privileged bypass نیست.
- ایجاد یا revision clinical output با expected revision/version contract همان output انجام
  می‌شود؛ conflict هرگز silent overwrite نیست. intake source immutable است، پس source reference
  در اثر conflict به revision جدید intake جابه‌جا نمی‌شود.
- read و write حساس audit می‌شوند. event conversion حداقل actor، action، `patientId`، source
  intake/revision identifiers، clinical resource/revision identifiers در صورت ایجاد، clinic/tenant،
  timestamp و request/correlation identifiers را ثبت می‌کند.
- audit metadata فقط identifierها، action/state و field/category names لازم را دارد؛ مقدار intake،
  clinical value، patient name، phone، free-text reason و محتوای پزشکی/PII در آن یا operational log
  ثبت نمی‌شود. شکست audit برای write حساس fail-closed است.

## visibility، consent و lifecycle

- patient هرگز صرف وجود intake source، review، save یا signing به internal note، evidence review یا
  metadata audit دسترسی پیدا نمی‌کند.
- patient-facing information فقط از current approved/published clinical revision طبق policy
  بالینی مشتق می‌شود. review source و clinical record جدید default private هستند تا publication
  صریح انجام شود.
- withdrawal یا stale شدن consent intake، intake history و clinical history را حذف یا clinical
  revision را خودکار تغییر نمی‌دهد. access، retention، patient rights و any override پس از آن
  باید policy بالینی و تصمیم حقوقی قابل‌اجرا را رعایت کند؛ این قرارداد هیچ legal basis جدیدی
  فرض نمی‌کند.
- intake و clinical history hard-delete نمی‌شوند. lifecycle/void/supersede برای clinical output
  تابع policy بالینی و schemaهای taskهای بعدی است، نه direct deletion از intake.

## مرزهای صریح task

| متعلق به F06-T02 | متعلق به task بعدی |
| --- | --- |
| جداسازی semantic و provenance intake از reviewed clinical record | `F06-T03`: مدل، migration، FK/constraint و audit persistence |
| explicit human-review gate، source reference و no-auto-conversion rule | `F06-T06`: فرم/endpoint/dashboard reconciliation و clinical recordهای واقعی |
| اتصال تبدیل به policy revision/sign/publish و permission concepts | `F06-T05`: clinical note revision و private note؛ `F06-T08`: enforcement authorization/audit |
| patient visibility default-private برای output review | `F06-T07` و `F06-T10`: views و patient summaries مجاز |

## تأییدهای حقوقی باز

این قرارداد یک engineering/product boundary است، نه اظهار compliance. counsel/owner باید دست‌کم
مبنای پردازش برای review و copy محدود evidence، access پس از withdrawal consent، retention و
legal-hold source/output، disclosure/export و proxy/guardian access را برای jurisdictionهای
محصول تأیید کند. تا آن زمان، defaultهای `clinical-record-policy-v1.md` و fail-closed access
onboarding اعمال می‌شوند و automatic disposition ساخته نمی‌شود.
