# قرارداد Patient Onboarding v1

- وضعیت: `FROZEN_FOR_IMPLEMENTATION`
- مالک: `patients` module
- فاز/task: `Phase 02 / F02-T01`
- نسخه قرارداد: `1.0.0`
- آخرین به‌روزرسانی: `2026-08-24`

این سند قرارداد محصول و داده برای taskهای `F02-T02` تا `F02-T13` است. migration، DTO،
OpenAPI، app و dashboard باید از همین نام‌ها و معناها استفاده کنند. تغییر معنای required field،
چرخه consent یا مرز self-reported/clinical پس از شروع migration نیازمند بازکردن دوباره
`F02-T01` و ثبت اثر آن در لاگ فاز است.

## محدوده و موارد خارج از محدوده

این نسخه فقط این موارد را تثبیت می‌کند:

- پروفایل پایه بیمار؛
- intake پزشکی اولیه که تماماً گزارش خود بیمار است؛
- ذخیره draft، revision و complete؛
- consent نسخه‌دار برای persist و پردازش intake؛
- وضعیت onboarding، blocker و next action؛
- نمایش همان داده persist‌شده در app و dashboard.

این موارد متعلق به Phase 02 نیستند:

- diagnosis، clinical fact، allergy/condition/medication تأییدشده پزشک؛
- assessment، mezaj، scoring یا booking eligibility نهایی؛
- فایل پزشکی، clinical note، نسخه و درمان؛
- UI انتشار policy حقوقی، export/delete و policy نهایی retention؛
- تفسیر BMI یا تبدیل پاسخ‌ها به هشدار قطعی درمانی.

## قرارداد عمومی canonicalization

- همه شناسه‌های عمومی UUID هستند. `userId`، `patientId`، `clinicId` و `intakeId` مفاهیم
  جدا دارند و قابل جایگزینی با یکدیگر نیستند.
- self endpointها هیچ `patientId` ورودی نمی‌پذیرند؛ patient از access-token subject و
  ownership دیتابیس resolve می‌شود.
- timestampها ISO 8601 و UTC هستند. تاریخ تولد با `YYYY-MM-DD` میلادی persist و در UI
  در صورت نیاز به شمسی تبدیل می‌شود؛ سن و سال تولد جداگانه ذخیره نمی‌شوند.
- اعداد فارسی/عربی در ورودی structured پیش از validation به رقم ASCII تبدیل می‌شوند.
- enumها در API و دیتابیس با مقدار پایدار انگلیسی uppercase جابه‌جا می‌شوند؛ label فارسی
  فقط presentation است.
- متن کوتاه کاربر با pipeline ثابت `NFC → trim → collapse whitespace → ی/ک فارسی` canonical
  می‌شود؛ `ي` به `ی` و `ك` به `ک` تبدیل می‌شوند. یکتایی itemها پس از همین pipeline و برای متن
  لاتین به‌شکل case-insensitive محاسبه می‌شود. مقدار خالی به `null`/omitted تبدیل می‌شود و `""`
  مقدار معتبر نیست.
- محتوای policy consent از canonicalization عمومی مستثناست. `contentHash` برابر SHA-256 با خروجی
  lowercase hexadecimal (`CHAR(64)`) روی UTF-8 bytes فیلد immutable `body` است. `body` باید تمام
  متن حقوقی نمایش‌داده‌شده، از جمله heading لازم، را در خود داشته باشد و UI آن را بدون normalization
  پس از publish نمایش دهد؛ `title` فقط metadata رابط است و داخل proof نیست.
- مقدارهای خام intake، نام کامل، تلفن و متن policy در operational log یا audit metadata
  قرار نمی‌گیرند.

## ownership داده

### Identity/User

- `User.phone` همان شماره canonical Phase 01 با شکل `+989XXXXXXXXX` است.
- شماره در response پروفایل read-only است و فقط از جریان امن تغییر شماره Phase 01 تغییر می‌کند.
- password، session و role داخل patients module کپی نمی‌شوند.

### UserProfile

فیلدهای پایه غیرپزشکی:

- `firstName`: required، متن trim‌شده، ۱ تا ۸۰ نویسه.
- `lastName`: required، متن trim‌شده، ۱ تا ۱۰۰ نویسه.
- `email`: optional/nullable، حداکثر ۲۵۴ نویسه؛ برای مقایسه trim و lowercase می‌شود، اما
  در Phase 02 شناسه ورود یا unique سراسری نیست.
- `cityName`: optional/nullable، متن trim‌شده، حداکثر ۱۰۰ نویسه. catalog شهر خارج از این فاز است.
- `displayName`: فقط response مشتق‌شده از نام و نام خانوادگی است و persist نمی‌شود.

`name` یک رشته مبهم API نیست و app باید آن را به `firstName` و `lastName` تبدیل کند. `age`
ورودی یا فیلد قابل ویرایش نیست. avatar/upload خارج از Phase 02 باقی می‌ماند.

### Clinic

- `id`: شناسه UUID.
- `name`: نام نمایشی غیرخالی.
- `timeZone`: شناسه IANA با مقدار MVP برابر `Asia/Tehran`.
- `status`: در MVP فقط یک clinic با وضعیت `ACTIVE` وجود دارد.

`timeZone` فقط برای مرز روز تقویمی گزارش dashboard استفاده می‌شود؛ timestamp دیتابیس همچنان UTC است.

### PatientProfile

- `id`: شناسه `patientId` مستقل.
- `userId`: در MVP یک‌به‌یک و unique؛ همان کاربر identity.
- `clinicId`: کلینیک فعال MVP؛ patient به‌صورت صریح به آن متصل است.
- `createdAt` و `updatedAt`: UTC.

رکورد PatientProfile برای هر registration با نقش `PATIENT` به‌شکل idempotent ساخته می‌شود و
migration فاز باید کاربران PATIENT موجود Phase 01 را backfill کند. بنابراین بیمار شروع‌نکرده نیز
در status و آمار incomplete دیده می‌شود. boolean قابل ویرایش مانند `profileComplete` در این رکورد
منبع حقیقت نیست.

## قرارداد PatientMedicalIntake

تمام فیلدهای این بخش self-reported هستند، حتی وقتی admin اشتباه تایپی بیمار را اصلاح کرده باشد.

### پاسخ‌های required برای complete

- `birthDate`: تاریخ کامل میلادی `YYYY-MM-DD`، معتبر و نه در آینده. محدودیت سنی محصول در این
  نسخه تعریف نشده است.
- `sexAtBirth`: یکی از `FEMALE`، `MALE`، `INTERSEX`، `UNKNOWN` یا
  `PREFER_NOT_TO_SAY`. این فیلد gender identity نیست.
- `allergyReport`: declaration مطابق قرارداد زیر.
- `chronicConditionReport`: declaration مطابق قرارداد زیر.
- `currentMedicationReport`: declaration مطابق قرارداد زیر.

required بودن این پاسخ‌ها حداقل داده لازم برای شناسایی profile، محاسبه age بدون ذخیره age و ثبت
صریح سه assertion ایمنی است. `PREFER_NOT_TO_SAY` برای `sexAtBirth` پاسخ کامل معتبر است و بیمار را
به افشای مقدار وادار نمی‌کند.

### پاسخ‌های اختیاری این نسخه

- `heightCm`: optional؛ عدد صحیح بین ۲۰ و ۳۰۰ سانتی‌متر.
- `weightKg`: optional؛ در JSON/OpenAPI از نوع `number` با `multipleOf: 0.01` و بین ۰٫۵ تا ۱۰۰۰؛
  در PostgreSQL از `NUMERIC` استفاده می‌شود و Prisma Decimal به API نشت نمی‌کند.
- `bloodType`: optional؛ در صورت پاسخ یکی از `A_POSITIVE`، `A_NEGATIVE`، `B_POSITIVE`،
  `B_NEGATIVE`، `AB_POSITIVE`، `AB_NEGATIVE`، `O_POSITIVE`، `O_NEGATIVE` یا `UNKNOWN`.
- `sleepDurationBand`: یکی از `LESS_THAN_5_HOURS`، `FROM_5_TO_LESS_THAN_7_HOURS`،
  `FROM_7_TO_9_HOURS`، `MORE_THAN_9_HOURS` یا `UNKNOWN`؛ optional.
- `exerciseFrequency`: یکی از `NONE`، `ONCE_OR_TWICE_WEEKLY`،
  `THREE_OR_FOUR_TIMES_WEEKLY`، `DAILY` یا `UNKNOWN`؛ optional.
- `stressLevel`: یکی از `LOW`، `MODERATE`، `HIGH`، `VERY_HIGH` یا `UNKNOWN`؛ optional.
- `tobaccoUse`: optional؛ در صورت پاسخ یکی از `NEVER`، `FORMER`، `CURRENT` یا `UNKNOWN`.
  نبود آن completeness را کم نمی‌کند؛ dashboard نباید نبود آن را «خیر» نمایش دهد.

قد، وزن، گروه خونی و lifestyle برای نمایش baseline خوداظهاری پذیرفته می‌شوند، اما چون ضرورت بالینی
آن‌ها در Phase 02 تصویب نشده است completeness را block نمی‌کنند. required کردن آینده آن‌ها schema
version جدید و تصمیم product/privacy صریح می‌خواهد.

فیلدهایی مانند BMI و age فقط از مقادیر فعلی مشتق می‌شوند و persist نمی‌شوند. UI Phase 02 حق
نمایش برچسب تفسیری مانند «BMI نرمال» یا diagnosis ساخته‌شده از این مقادیر را ندارد.

### declarationهای چندمقداری

`allergyReport`، `chronicConditionReport` و `currentMedicationReport` هر کدام این shape را دارند:

```json
{
  "status": "NONE | UNKNOWN | PRESENT",
  "items": ["متن گزارش بیمار"]
}
```

قواعد:

- `null` یا نبود declaration یعنی unanswered و با `NONE`/`UNKNOWN` فرق دارد.
- `NONE` معادل پاسخ صریح «ندارم» و `UNKNOWN` معادل «نمی‌دانم» است؛ در هر دو حالت `items`
  باید آرایه خالی باشد.
- `PRESENT` حداقل یک item لازم دارد.
- هر item پس از normalization بین ۱ تا ۲۰۰ نویسه است؛ حداکثر ۵۰ item یکتا در هر declaration.
- انتخاب `NONE` یا `UNKNOWN` هم‌زمان با item معتبر نیست و با
  `INVALID_MEDICAL_DECLARATION` رد می‌شود.
- item متن self-reported است، code تشخیصی یا شناسه clinical record نیست.

## required fields و completeness

schema version این قرارداد برابر `1` است و required field set نسخه `1` برابر است با:

```text
firstName
lastName
birthDate
sexAtBirth
allergyReport
chronicConditionReport
currentMedicationReport
activeCurrentConsent
```

قواعد محاسبه:

- `isComplete`، `missingFields`، `answeredRequiredCount` و `requiredCount` responseهای مشتق‌شده‌اند؛
  client و boolean دیتابیس اجازه تعیین آن‌ها را ندارند.
- `activeCurrentConsent` یک پاسخ فرم نیست؛ از policy و consent grant جاری resolve می‌شود.
- phone به‌دلیل تضمین Phase 01 در شمارنده نیست. فیلد optional نیز در شمارنده نیست.
- اگر required field بعداً unanswered شود، policy جدید نیازمند re-consent شود یا consent پس گرفته
  شود، وضعیت جاری دیگر complete نیست؛ completion/revision تاریخی حذف نمی‌شود.
- هر intake یک `assignedSchemaVersion` دارد که هنگام ساخت در v1 برابر `1` می‌شود. هر revision و
  completion همان نسخه assigned را کپی می‌کند. deploy نسخه جدید assignment موجود را تغییر نمی‌دهد.
- تغییر required field set
  نسخه جدید schema می‌سازد و نسخه `1` را بازنویسی نمی‌کند.
- فعال‌کردن schema version جدید برای بیمارانی که قبلاً complete شده‌اند تصمیم migration/product
  و audit صریح می‌خواهد؛ صرف deploy نسخه جدید completion تاریخی را invalidate نمی‌کند.
- مسیر booking در Phase 03 هر وضعیت ناقص Phase 02 را با blocker عمومی
  `PROFILE_INCOMPLETE` enforce می‌کند، حتی اگر onboarding endpoint دلیل جزئی‌تری برگرداند.

## revision و هم‌زمانی

- نبود intake با `revision=0` نمایش داده می‌شود. اولین save موفق revision `1` می‌سازد.
- هر save تغییردهنده یک `PatientMedicalIntakeRevision` immutable با snapshot کامل canonical،
  `assignedSchemaVersion` و provenance می‌سازد و pointer aggregate را اتمیک جلو می‌برد.
- provenance در همه revisionهای Phase 02 دارای `dataOrigin=PATIENT_SELF_REPORTED` و
  `reportedPatientId` برابر owner است. `recordingMode` یکی از `PATIENT_ENTRY` یا
  `ADMIN_ON_BEHALF_CORRECTION` و `recordedByUserId` actor واقعی است. فیلد reviewed/verified وجود ندارد.
- همه writeها `expectedRevision` می‌فرستند. اختلاف با `MEDICAL_INTAKE_REVISION_CONFLICT` و HTTP
  `409` رد می‌شود، مگر PUT draft که snapshot canonical آن دقیقاً با revision جاری یکسان است؛ آن retry
  طبیعی PUT محسوب و همان response جاری را برمی‌گرداند.
- admin correction و `POST .../complete` علاوه بر revision، `Idempotency-Key` اجباری دارند. استفاده
  مجدد از key با operation/payload متفاوت با `IDEMPOTENCY_KEY_REUSED` رد می‌شود.
- PUT draft با snapshot canonical یکسان no-op است و revision تازه نمی‌سازد.
- `POST .../complete` revision قبلی را mutate نمی‌کند. در transaction، required fieldها،
  `expectedRevision`، policy active و consent grant active دوباره بررسی می‌شوند؛ سپس revision جدید
  `N+1` با همان snapshot، `revisionState=COMPLETE`، `completedAt` و
  `completedConsentRecordId` ساخته و pointerهای current/completed جلو می‌روند.
- replay همان complete key همان completion revision را برمی‌گرداند. complete با key جدید و
  `expectedRevision` جاری یک completion revision جدید می‌سازد؛ client retry باید key را reuse کند.
- edit محتوایی پس از completion revision جدید با `revisionState=DRAFT` می‌سازد؛ completion revision
  قبلی immutable و قابل audit می‌ماند.
- اصلاح admin revision قبلی را بازنویسی نمی‌کند و `correctionReason` اجباری با طول ۱ تا ۵۰۰
  نویسه روی revision ذخیره می‌شود. محتوای دلیل نباید در operational log یا audit metadata کپی شود.
- hard delete intake/revision در Phase 02 وجود ندارد.

## consent versioning

### ConsentPolicyVersion

policy key این نسخه `MEDICAL_INTAKE_PROCESSING` است. هر نسخه این داده‌ها را دارد:

- `id`، `clinicId` و `policyKey`؛
- `versionNumber` صعودی و immutable در محدوده clinic/policy key؛
- `locale` با مقدار اولیه `fa-IR`؛
- snapshot دقیق `title` و `body`؛
- `contentHash` مطابق الگوریتم ثابت بخش canonicalization؛
- `status` از نوع `DRAFT`، `ACTIVE` یا `RETIRED`؛
- `activatedAt` و `retiredAt` nullable؛ scheduling آینده خارج از v1 است؛
- actor انتشار و timestamp ساخت.

فقط نسخه `ACTIVE` policy جاری است. partial unique constraint حداکثر یک `ACTIVE` را برای
`clinicId + policyKey + locale` enforce می‌کند. activation نسخه جدید در یک transaction نسخه ACTIVE
قبلی را `RETIRED` و نسخه جدید را `ACTIVE` می‌کند و timestampها را با یک boundary می‌نویسد. نسخه
ACTIVE/RETIRED و body/hash آن بازنویسی یا حذف نمی‌شود؛ اصلاح متن نسخه جدید DRAFT می‌سازد.

UI مدیریت انتشار policy در این فاز ساخته نمی‌شود. داده reference باید با مسیر versioned و
قابل review انتشار داده شود؛ seed نمایشی یا متن placeholder برای production policy مجاز نیست.

### PatientConsentRecord

`PatientConsentRecord` یک acceptance grant نسخه‌دار است، نه boolean روی patient. هر رکورد شامل:

- `id`، `patientId`، `policyVersionId` و hash پذیرفته‌شده؛
- `acceptedAt`، `acceptedByUserId`، `acceptedBySessionId` و source برابر `PATIENT_APP`؛
- tuple nullable و یک‌بارقابل‌تنظیم `withdrawnAt`، `withdrawnByUserId` و `withdrawnBySessionId`؛
- idempotency keyهای acceptance/withdrawal و requestIdهای audit متناظر.

قواعد lifecycle:

- accept فقط برای policy جاری و با `policyVersionId + contentHash` مطابق server مجاز است؛ نسخه
  stale با `CONSENT_POLICY_STALE` و HTTP `409` رد می‌شود.
- activation، accept، withdraw و complete ترتیب lock ثابت دارند:
  `ConsentPolicyVersion row(s) → PatientConsentRecord grant → PatientMedicalIntake` (هرجا resource
  مربوط وجود دارد). accept ابتدا policy ACTIVE را `FOR UPDATE` می‌گیرد، id/hash را دوباره بررسی،
  grant را insert/resolve و AuditEvent را در همان transaction ثبت می‌کند؛ شکست audit کل write را rollback می‌کند.
- partial unique constraint فقط یک grant بدون withdrawal برای هر `patientId + policyVersionId`
  اجازه می‌دهد. تکرار accept همان grant/key را برمی‌گرداند؛ re-consent پس از withdrawal رکورد جدید است.
- `activeCurrentConsent` فقط وقتی true است که policy جاری وجود داشته و grant بدون withdrawal برای
  دقیقاً همان policy version موجود باشد. انتشار نسخه جدید grant قدیمی را حذف نمی‌کند ولی آن را current
  محسوب نمی‌کند.
- withdrawal ابتدا policy ACTIVE را با همان lock order و سپس grant هدف را `FOR UPDATE` می‌گیرد،
  current بودن/ownership را دوباره بررسی و tuple withdrawal + AuditEvent را اتمیک می‌نویسد. replay
  همان key idempotent است؛ target تاریخی/غیرمتعلق با `CONSENT_RECORD_NOT_ACTIVE` و HTTP `409` رد می‌شود.
- withdrawal داده و audit گذشته را حذف نمی‌کند. patient همچنان حق خواندن داده خودش را دارد،
  اما save/complete جدید تا re-consent با `CONSENT_REQUIRED` رد می‌شود.
- admin در MVP consent را به‌جای بیمار قبول نمی‌کند. create-on-behalf فقط UserProfile و
  PatientProfile غیرپزشکی را می‌سازد؛ intake draft غیرحساس در این قرارداد وجود ندارد.
- تا تصویب legal-basis/retention access policy، بعد از withdrawal یا stale consent همه read/writeهای
  medical intake توسط admin با `CONSENT_REQUIRED` fail-closed می‌شوند و privileged override ندارند.
  داده retained و self-read بیمار مجاز می‌ماند.
- accept/withdraw عملیات حساس create و دارای `Idempotency-Key` هستند.
- complete، policy ACTIVE و grant را `FOR UPDATE` lock می‌کند. race activation/withdrawal/complete
  ترتیب commit قطعی دارد و completion هرگز به grantی که پیش از commit withdraw شده متصل نمی‌شود.
- accept/withdrawal evidence در `AuditEvent` append-only ثبت می‌شود؛ withdrawal فقط tuple grant را
  می‌بندد و acceptance fields را بازنویسی نمی‌کند.

متن نهایی حقوقی، retention duration، مبنای قانونی دسترسی پس از withdrawal، حداقل سن و جریان
guardian/delegated consent هنوز blocker انتشار عمومی‌اند. تا تصمیم سن/guardian، production onboarding
minor فعال نمی‌شود و fixtureهای داخلی adult هستند. این ابهام مانع مدل versioned و تست داخلی نیست،
اما متن موقت نباید به‌عنوان تأیید انطباق حقوقی معرفی شود.

## persistence gate

- ذخیره `UserProfile` غیرپزشکی پیش از consent مجاز است.
- API نباید payload حساس intake را پیش از وجود consent جاری persist کند. UI می‌تواند پاسخ‌ها را
  تا مرحله consent فقط در state موقت همان فرم نگه دارد.
- پس از accept، draft در PostgreSQL persist می‌شود و refresh/دستگاه دیگر آن را resume می‌کند.
- withdrawal یا stale شدن policy، read-self و نمایش تاریخچه consent را حفظ می‌کند ولی write و
  complete intake را تا consent جاری متوقف می‌کند.

## onboarding status contract

`GET /v1/patients/me/onboarding-status` حداقل این shape معنایی را برمی‌گرداند:

```json
{
  "onboardingState": "IN_PROGRESS",
  "submissionState": "DRAFT",
  "isComplete": false,
  "requiredCount": 8,
  "answeredRequiredCount": 6,
  "missingFields": ["birthDate", "activeCurrentConsent"],
  "blockerCodes": ["CONSENT_REQUIRED", "MEDICAL_INTAKE_INCOMPLETE"],
  "nextAction": "REVIEW_CONSENT",
  "assignedSchemaVersion": 1,
  "evaluatedSchemaVersion": 1,
  "currentRevision": 1,
  "completedRevision": null,
  "currentPolicyVersionId": "00000000-0000-0000-0000-000000000001",
  "activeConsentRecordId": null,
  "updatedAt": "2026-08-24T12:00:00.000Z"
}
```

`submissionState` وضعیت pointer aggregate است و history را توصیف می‌کند؛ `onboardingState/isComplete`
فقط response مشتق‌شده‌اند. `isComplete=true` فقط وقتی است که profile required کامل، revision جاری
همان completed revision، required fieldهای assigned schema حاضر، و
`completedConsentRecordId=activeConsentRecordId` برای policy جاری باشد.

`submissionState` پیش از ساخت `PatientMedicalIntake` برابر `null` است؛ پس از اولین save فقط
`DRAFT | COMPLETE` دارد. در حالت بدون intake، `assignedSchemaVersion=null`،
`evaluatedSchemaVersion=1` و `currentRevision=0` است؛ required/missing با evaluated version محاسبه
می‌شوند. پس از اولین save، evaluated version همان assigned version است. `NOT_STARTED` فقط مقدار
onboarding مشتق‌شده است.

- `NOT_STARTED`: PatientProfile provision شده، ولی هیچ فیلد profile، consent decision یا intake
  revision ثبت نشده است.
- `IN_PROGRESS`: هر حالت شروع‌شده‌ای که predicate کامل بالا را پاس نمی‌کند.
- `COMPLETE`: فقط predicate کامل بالا.
- withdrawal یا فعال‌شدن policy جدید revision تاریخی و `submissionState` را mutate نمی‌کند، اما
  onboarding مشتق‌شده را تا re-consent و complete مجدد `IN_PROGRESS` می‌کند.
- `updatedAt` تا پیش از ساخت UserProfile/intake می‌تواند `null` باشد.

ترتیب priority برای `nextAction`:

1. `COMPLETE_PROFILE`
2. `CONSENT_UNAVAILABLE` وقتی policy ACTIVE وجود ندارد
3. `REVIEW_CONSENT`
4. `START_MEDICAL_INTAKE`
5. `CONTINUE_MEDICAL_INTAKE`
6. `COMPLETE_ONBOARDING` وقتی requirements حاضرند اما completion current نیست
7. `NONE` برای onboarding کامل

blockerهای جزئی Phase 02:

- `PROFILE_FIELDS_INCOMPLETE`
- `CONSENT_POLICY_NOT_AVAILABLE`
- `CONSENT_REQUIRED`
- `MEDICAL_INTAKE_INCOMPLETE`

`missingFields` فقط key پایدار می‌دهد و مقدار PII/medical را بازتاب نمی‌دهد. ترتیب آرایه‌ها باید
طبق required field set ثابت باشد تا UI و test deterministic بمانند. نبود policy در status پاسخ `200`
با `currentPolicyVersionId=null` و `CONSENT_UNAVAILABLE` است؛ GET policy همان حالت را `503` می‌دهد.

## endpointهای consent لازم برای vertical slice

علاوه بر endpointهای Phase 02، endpointهای زیر برای consent و Dashboard Home اجباری‌اند:

```text
GET  /v1/patients/me/consent-policy
POST /v1/patients/me/consents
POST /v1/patients/me/consents/:consentRecordId/withdraw
GET  /v1/admin/patients/onboarding-summary
```

اولی snapshot دقیق policy جاری و status پذیرش بیمار را می‌دهد. دومی policy version/hash را با
`Idempotency-Key` قبول می‌کند. سومی فقط acceptance متعلق به همان patient را idempotent withdraw
می‌کند. endpoint چهارم aggregateهای Phase 02 Dashboard Home را مستقیم از PostgreSQL می‌دهد؛ محاسبه
آن‌ها از page فعلی لیست paginated مجاز نیست. endpoint عمومی یا admin برای پذیرش به‌جای بیمار وجود ندارد.

## error contract پایدار Phase 02

Taskهای API باید این codeها را به error union موجود اضافه کنند:

- `PATIENT_PROFILE_NOT_FOUND` — `404` فقط در جریان‌های admin؛ self flow می‌تواند idempotent بسازد.
- `PROFILE_FIELDS_INCOMPLETE` — `422`.
- `MEDICAL_INTAKE_INCOMPLETE` — `422`؛ details فقط `missingFields` دارد.
- `INVALID_MEDICAL_DECLARATION` — `422`.
- `CONSENT_REQUIRED` — `403` برای persist/complete intake بدون consent جاری.
- `CONSENT_POLICY_NOT_AVAILABLE` — `503` وقتی policy جاری release نشده است.
- `CONSENT_POLICY_STALE` — `409`.
- `CONSENT_RECORD_NOT_ACTIVE` — `409`.
- `MEDICAL_INTAKE_REVISION_CONFLICT` — `409`؛ details فقط revision جاری را دارد.
- `IDEMPOTENCY_KEY_REUSED` — `409`.

error message قابل ترجمه است، اما client فقط بر code تصمیم می‌گیرد. stack، payload، متن پزشکی و
داده داخلی دیتابیس در error response قرار نمی‌گیرند.

## قرارداد relational برای F02-T02

نام دقیق Prisma می‌تواند با convention repository تنظیم شود، اما معنا و constraintهای زیر frozen است:

- `Clinic`: id، name، timeZone، status، createdAt/updatedAt؛ در MVP یک رکورد ACTIVE reference و
  partial unique constraint برای single-active invariant.
- `UserProfile`: id، userId unique، firstName/lastName/email/cityName nullable برای حالت incomplete،
  createdAt/updatedAt. requiredness منبع application completeness است، نه NOT NULL زودهنگام.
- `PatientProfile`: id، userId unique، clinicId، createdAt/updatedAt. registration آینده آن را
  idempotent provision می‌کند و migration کاربران PATIENT Phase 01 را با `createdAt=User.createdAt`
  به clinic فعال backfill می‌کند.
- `PatientMedicalIntake`: id، patientId unique، clinicId، assignedSchemaVersion،
  currentRevisionNumber با default صفر، completedRevisionNumber nullable، submissionState،
  createdAt/updatedAt.
- `PatientMedicalIntakeRevision`: id، intakeId، revisionNumber، assignedSchemaVersion،
  revisionState، تمام snapshot fields، dataOrigin، recordingMode، reportedPatientId،
  recordedByUserId، correctionReason nullable، completedAt nullable، completedConsentRecordId nullable،
  mutationOperation nullable، mutationKey nullable، payloadHash و createdAt.
- revision constraintها: unique `(intakeId, revisionNumber)`؛ unique
  `(intakeId, mutationOperation, mutationKey)`؛ correctionReason فقط و حتماً برای
  `ADMIN_ON_BEHALF_CORRECTION`؛ completion fields فقط و حتماً برای `revisionState=COMPLETE`.
  mutationOperation/key برای admin correction و completion اجباری و برای patient PUT draft nullable است.
- `ConsentPolicyVersion`: فیلدهای lifecycle بخش consent، unique روی
  `(clinicId, policyKey, locale, versionNumber)` و partial unique نسخه ACTIVE.
- `PatientConsentRecord`: acceptance/withdrawal fields بخش consent؛ partial unique grant بدون
  withdrawal روی `(patientId, policyVersionId)` و idempotency uniqueness در scope patient/operation.

روابط حذف:

- `UserProfile.userId → User`: `ON DELETE RESTRICT`.
- `PatientProfile.userId → User`: `ON DELETE RESTRICT`.
- `PatientProfile.clinicId → Clinic`: `ON DELETE RESTRICT`.
- `PatientMedicalIntake.patientId → PatientProfile`: `ON DELETE RESTRICT`.
- `PatientMedicalIntake.clinicId → Clinic`: `ON DELETE RESTRICT`.
- `PatientMedicalIntakeRevision.intakeId → PatientMedicalIntake`: `ON DELETE RESTRICT`.
- `PatientMedicalIntakeRevision.reportedPatientId → PatientProfile`: `ON DELETE RESTRICT`.
- `PatientMedicalIntakeRevision.recordedByUserId → User`: `ON DELETE SET NULL`.
- `PatientMedicalIntakeRevision.completedConsentRecordId → PatientConsentRecord`:
  `ON DELETE RESTRICT`؛ تطابق patient/intake/consent در transaction application enforce می‌شود.
- `PatientConsentRecord.patientId → PatientProfile`: `ON DELETE RESTRICT`.
- `PatientConsentRecord.policyVersionId → ConsentPolicyVersion`: `ON DELETE RESTRICT`.
- `ConsentPolicyVersion.clinicId → Clinic`: `ON DELETE RESTRICT`.
- actor/session referenceهای عملیاتی می‌توانند `ON DELETE SET NULL` باشند؛ subject/revision/policy
  identifier و audit event حذف نمی‌شوند.

تا تصویب retention هیچ endpoint/job purge برای patient intake، revision، consent یا audit وجود ندارد.
upgrade migration هم روی schema خالی و هم روی خروجی Phase 01 اجرا می‌شود و required fieldهای بی‌پاسخ
را با sentinel جعلی backfill نمی‌کند.

## authorization و audit contract

- patient فقط profile، intake، revision مجاز و consent خود را می‌خواند/می‌نویسد.
- ADMIN بودن جایگزین lookup و scope صریح patient/clinic نیست؛ endpoint admin باید patient هدف را
  resolve کند. permissionهای دقیق در `F02-T08` اضافه می‌شوند.
- read و write intake، complete، اصلاح admin، accept و withdraw consent audit می‌شوند.
- actionهای پایدار پیشنهادی: `PATIENT_MEDICAL_INTAKE_READ`،
  `PATIENT_MEDICAL_INTAKE_UPDATED`، `PATIENT_MEDICAL_INTAKE_COMPLETED`،
  `ADMIN_PATIENT_MEDICAL_INTAKE_READ`، `ADMIN_PATIENT_MEDICAL_INTAKE_CORRECTED`،
  `PATIENT_CONSENT_READ`، `PATIENT_CONSENT_ACCEPTED` و `PATIENT_CONSENT_WITHDRAWN`.
- audit metadata فقط شناسه‌ها، revision، policy version، action/recordingMode و requestId را دارد؛
  مقدار فیلد پزشکی، نام، phone، email و correctionReason در metadata کپی نمی‌شود.
- write و audit مربوط به آن در یک transaction انجام می‌شوند. endpoint خواندن intake باید audit
  موفق را پیش از ارسال payload ثبت کند؛ شکست audit، response پزشکی را fail-closed با 5xx متوقف می‌کند.
  query و audit read ترجیحاً در یک transaction هستند.

## مرز self-reported و clinical

- هر پاسخ Phase 02 در app و dashboard با label روشن «خوداظهاری بیمار» نمایش داده می‌شود.
- `allergyReport` هشدار آلرژی تأییدشده نیست؛ `chronicConditionReport` diagnosis نیست و
  `currentMedicationReport` medication statement تأییدشده پزشک نیست.
- ویرایش admin فقط correction همان گزارش است و آن را reviewed/verified نمی‌کند.
- Phase 02 هیچ `diagnosis`، `clinicalStatus`، `verifiedBy`، `verifiedAt` یا clinical identifier
  تولید نمی‌کند.
- تبدیل انتخابی یک report به `AllergyRecord`، `ConditionRecord` یا `MedicationStatement` فقط در
  workflow reconciliation فاز `F06-T02/F06-T06` و با actor بالینی انجام می‌شود.
- dashboard نباید از intake، «بیماری شایع»، مزاج، risk، eligibility، clinical alert یا KPI
  درمانی بسازد. widget Phase 02 فقط تعداد بیمار جدید و وضعیت مشتق‌شده onboarding را نشان می‌دهد.

## mapping UI موجود به قرارداد

- app `name` → `firstName + lastName`؛ UI باید دو ورودی روشن داشته باشد.
- app `email` → `UserProfile.email` و app `city` → `UserProfile.cityName`.
- app `phone` → `User.phone` read-only؛ تغییر آن از جریان امنیت حساب است.
- account status نمایشی → `User.status`؛ status پزشکی جدا در Phase 02 ساخته نمی‌شود.
- app `birth` و dashboard `age` → `birthDate`؛ date picker می‌تواند شمسی باشد ولی payload میلادی است.
- app `gender` → `sexAtBirth` با همه گزینه‌های قرارداد، نه فقط زن/مرد.
- app `height` / dashboard string height → `heightCm` number.
- app `weight` / dashboard string weight → `weightKg` number در wire و NUMERIC در DB.
- app `blood` / dashboard `bloodType` → `bloodType` enum.
- app `allergies` → `allergyReport`.
- app `diseases` → `chronicConditionReport` و هرگز dashboard `diagnosis` نیست.
- app medical medications → `currentMedicationReport`.
- app `sleep`، `exercise` و `stress` → enumهای lifestyle بالا.
- avatar upload خارج از Phase 02 است؛ حرف avatar از `displayName` مشتق می‌شود.
- age و BMI فقط derived هستند؛ label تفسیری BMI حذف می‌شود.
- `tobaccoUse` پاسخ‌داده‌نشده `null` است، نه «خیر». مقدار hardcoded جنسیت/دخانیات حذف می‌شود.
- previous surgery و مقدار `—` در v1 وجود ندارند و تا قرارداد مستقل نمایش داده نمی‌شوند.
- تفاوت mock داروی app/dashboard با اتصال هر دو به یک `currentMedicationReport` رفع می‌شود؛ هیچ مقدار
  hardcoded در response باقی نمی‌ماند.
- dashboard `constitution`، visits، lastVisit، revenue، diagnosis، counts جلسه/نسخه/سفارش، mezaj و
  clinical tabs از این قرارداد تغذیه نمی‌شوند و تا فاز مالک hidden هستند.

## read modelهای admin Phase 02

آیتم حداقلی `GET /v1/admin/patients`:

```text
patientId, displayName|null, phone, ageYears|null, accountStatus,
onboardingState, createdAt
```

`patientId` UUID است؛ `ageYears` از birthDate مشتق می‌شود. list هیچ diagnosis، intake values، revenue،
visits یا count فازهای بعد ندارد و pagination آن منبع محاسبه aggregate نیست.

`GET /v1/admin/patients/:patientId` حداقل profile غیرپزشکی، current intake مجاز،
`currentRevision`، `assignedSchemaVersion`، consent status و provenance `PATIENT_SELF_REPORTED` را
برمی‌گرداند. بخش medical فقط با consent جاری و audit موفق برمی‌گردد؛ در غیر این صورت profile قابل
نمایش است ولی medical section با error/status fail-closed مشخص می‌شود. response diagnosis یا clinical
record تولید نمی‌کند.

## قرارداد read model اولیه Dashboard Home

- `newPatientsToday`: تعداد `PatientProfile.createdAt` از شروع روز جاری clinic تا زمان query؛
  مرز روز با `Clinic.timeZone` محاسبه و query روی timestamp UTC اجرا می‌شود.
- `onboardingCompletePatients`: تعداد patientهای clinic که status مشتق‌شده جاری آن‌ها `COMPLETE` است.
- `onboardingIncompletePatients`: تعداد سایر patientهای clinic؛ patient غیرفعال فقط وقتی در این
  metric می‌آید که filter وضعیت صریحاً آن را شامل کند.
- trend، درصد رشد و مقایسه دوره‌ای تا زمانی که فرمول و دوره مقایسه جداگانه تعریف نشده‌اند نمایش
  داده نمی‌شوند. dashboard حق استفاده از عدد mock یا صفر ساختگی ندارد.

response aggregate شامل `asOf` UTC، `timeZone`، `newPatientsToday`،
`onboardingCompletePatients` و `onboardingIncompletePatients` است. صفر فقط نتیجه واقعی query موفق
است؛ timeout/error به صفر تبدیل نمی‌شود.

## معیار پذیرش قرارداد

- هر فیلد موجود onboarding/profile/medical در app و dashboard mapping یا دلیل defer صریح دارد.
- required field set و تفاوت unanswered/none/unknown بدون تفسیر client تعریف شده است.
- complete فقط server-side و از profile + intake + consent جاری مشتق می‌شود.
- consent version/hash، accept، stale version، withdrawal، re-consent و audit رفتار مشخص دارند.
- intake draft روی refresh/دستگاه دیگر پس از consent قابل resume و دارای revision conflict است.
- هیچ self-reported field خودکار clinical fact، diagnosis، alert یا KPI نمی‌شود.
- قرارداد endpoint/error/authorization برای شروع migration و API کافی است.
- مسئله حقوقی متن/retention به‌عنوان release blocker باقی می‌ماند و با placeholder پنهان نمی‌شود.
