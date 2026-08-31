# قرارداد Assessment و Booking Eligibility v1

این سند منبع قرارداد `F03-T01` است. migration، API، کلاینت تولیدشده و UI باید با این مرز هم‌راستا بمانند.

## محدوده

- یک آزمون اصلی برای هر کلینیک با نسخه‌های مستقل و immutable پس از انتشار
- draft/resume/submit بیمار و نتیجه ثابت همان نسخه
- سیاست قابل‌تنظیم پیش‌نیاز رزرو
- eligibility بر اساس تکمیل معتبر، نه score

خارج از محدوده v1: تشخیص پزشکی خودکار، branching پیچیده، AI scoring، آزمون تطبیقی و ویرایش submission تکمیل‌شده.

## AssessmentVersion

- `assessmentKey`: شناسه منطقی پایدار؛ برای آزمون اصلی `MAIN`
- `versionNumber`: عدد مثبت و یکتا در `(clinicId, assessmentKey, locale)`
- `status`: `DRAFT | PUBLISHED | RETIRED`
- `structure`: snapshot کامل و canonical آزمون
- `contentHash`: SHA-256 از JSON canonical ساختار
- فقط یک نسخه `PUBLISHED` برای هر `(clinicId, assessmentKey, locale)` مجاز است.
- draft قابل ویرایش و حذف است.
- پس از publish، عنوان، ساختار، hash، کلید، locale و شماره نسخه immutable هستند.
- تغییر محتوایی همیشه نسخه جدید می‌سازد؛ نسخه retired دوباره publish نمی‌شود.

## ساختار canonical

```ts
type AssessmentStructureV1 = {
  schemaVersion: 1;
  sections: Array<{
    id: string;
    title: string;
    order: number;
    questions: AssessmentQuestionV1[];
  }>;
  resultBands?: Array<{
    id: string;
    title: string;
    minInclusive: number;
    maxExclusive?: number;
  }>;
};
```

`section.id` و `question.id` در همان نسخه یکتا و پایدارند. ترتیب فقط از `order` می‌آید. رشته خالی و شناسه تکراری رد می‌شود.

## نوع سؤال‌ها و پاسخ

- `SINGLE_CHOICE`: دقیقاً یک `optionId`
- `MULTIPLE_CHOICE`: آرایه بدون تکرار `optionId`
- `BOOLEAN`: مقدار boolean
- `NUMBER`: عدد finite با min/max اختیاری
- `TEXT`: متن trim‌شده با `maxLength` اجباری؛ در score شرکت نمی‌کند

هر سؤال `required` دارد. option شامل `id`، `label`، `order` و `score` عددی finite است. سؤال‌های انتخابی فقط optionهای همان snapshot را می‌پذیرند.

## scoring قطعی

- `SINGLE_CHOICE`: امتیاز option انتخاب‌شده
- `MULTIPLE_CHOICE`: مجموع optionهای یکتای انتخاب‌شده
- `BOOLEAN`: `trueScore` یا `falseScore`
- `NUMBER`: امتیاز تنها range منطبق؛ rangeها overlap ندارند
- `TEXT`: صفر
- score کل جمع امتیاز سؤال‌هاست و همراه result band در snapshot نتیجه ذخیره می‌شود.
- ورودی نامعتبر submit نمی‌شود؛ score هرگز مجوز رزرو را تعیین نمی‌کند.

## PatientAssessmentSubmission

- هر attempt به یک `assessmentVersionId` دقیق متصل است.
- lifecycle: `IN_PROGRESS -> COMPLETE` یا `IN_PROGRESS/COMPLETE -> INVALIDATED`
- completion دارای `completedAt` است؛ invalidation دارای `invalidatedAt` است.
- answers و result/score تکمیل‌شده snapshot هستند و بعد از complete ویرایش نمی‌شوند.
- submit باید idempotent باشد؛ تکرار همان payload همان نتیجه را برمی‌گرداند و payload متفاوت با همان کلید رد می‌شود.

## BookingEligibilityPolicy

- policy برای هر clinic یک رکورد دارد.
- `assessmentRequirement`: `NOT_REQUIRED | REQUIRED`
- در حالت `REQUIRED`، `requiredAssessmentVersionId` باید به نسخه `PUBLISHED` همان clinic اشاره کند.
- پیش‌فرض `validityDays = null` است؛ یعنی completion منقضی نمی‌شود.
- پیش‌فرض `requireLatestPublishedVersion = false` است؛ انتشار نسخه جدید بیمار قبلی را ناگهانی block نمی‌کند.
- خاموش‌کردن requirement هیچ submission یا نتیجه تاریخی را حذف نمی‌کند.

## eligibility

ترتیب ارزیابی:

1. پرونده اولیه ناقص → `PROFILE_INCOMPLETE`
2. requirement خاموش → eligible
3. completion معتبر نسخه policy وجود ندارد → `MAIN_ASSESSMENT_REQUIRED`
4. در صورت `validityDays` و انقضا → `ASSESSMENT_EXPIRED`
5. در صورت `requireLatestPublishedVersion` و قدیمی‌بودن نسخه → `LATEST_VERSION_REQUIRED`
6. در غیر این صورت → eligible

completion معتبر یعنی state برابر `COMPLETE`، `completedAt` موجود و `invalidatedAt` خالی باشد. score در هیچ شاخه eligibility خوانده نمی‌شود.

## authorization و audit

- فقط `ADMIN` نسخه و policy را مدیریت می‌کند.
- بیمار فقط نسخه منتشرشده و submission متعلق به خودش را می‌بیند/تغییر می‌دهد.
- create/update/publish/retire، تغییر policy، start/save/submit/invalidate و خواندن نتیجه حساس audit می‌شوند.

## معیار پذیرش

- lifecycle و immutability در DB و service تست شوند.
- question/answer validation و scoring برای تمام typeها deterministic باشد.
- policy ناقص، نسخه draft یا نسخه clinic دیگر رد شود.
- matrix الزام خاموش/روشن، انقضا و latest-version تست شود.
- تست صریح ثابت کند score صفر، null یا بالا نتیجه eligibility را تغییر نمی‌دهد.
