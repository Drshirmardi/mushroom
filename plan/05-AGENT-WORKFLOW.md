# راهنمای اجرای کار توسط Agentها

## هدف

این workflow از اجرای موازی ناسازگار، تیک‌زدن زودهنگام و گم‌شدن context جلوگیری می‌کند.

## مدل اجرا

- واحد هماهنگی یک `batch` شامل حداکثر سه task مستقل است.
- Agent اصلی coordinator، مالک contract مشترک، ادغام‌کننده و reviewer نهایی است.
- هر subagent دقیقاً یک task و write-set مشخص دارد و task دوم را در همان batch شروع نمی‌کند.
- عدد سه سقف ظرفیت است، نه الزام؛ وابستگی، هم‌پوشانی فایل، ریسک یا تست مشترک batch را به یک یا دو task کاهش می‌دهد.
- هیچ batch بعدی پیش از بسته‌شدن review gate فعلی شروع نمی‌شود.

## قبل از شروع هر batch

Agent اصلی باید:

1. `plan/README.md` را بخواند.
2. `plan/STATUS.md` را بخواند.
3. فایل فاز فعال را کامل بخواند.
4. `plan/04-ENGINEERING-STANDARDS.md` را بخواند.
5. `git status --short` را بررسی و تغییرهای موجود کاربر را حفظ کند.
6. dependency و blocker همه taskهای کاندید را بررسی کند.
7. contract ورودی/خروجی را freeze و write-setها را بدون overlap تعریف کند.
8. یک batch یک تا سه‌تسکی قابل verify را claim کند.

## انتخاب taskهای batch

هر task فقط وقتی وارد batch می‌شود که:

- تمام `Depends on`های آن تیک خورده باشند.
- blocker باز نداشته باشد و contract لازم freeze شده باشد.
- task دیگری در همان batch به خروجی آن وابسته نباشد.
- مسیرهای قابل ویرایش آن با taskهای sibling هم‌پوشانی نداشته باشد.
- فرمان تست آن با DB، port و build output مستقل قابل اجرا باشد؛ در غیر این صورت تست مشترک برای review نهایی serialize شود.

برای پرکردن ظرفیت، task مصنوعی یا task وابسته به batch اضافه نمی‌شود.

## Claim کردن batch

قبل از تغییر کد، Agent اصلی باید در `STATUS.md` این موارد را ثبت کند:

```text
Batch ID: Fxx-Bnn
Coordinator/Thread: شناسه Agent اصلی
Started at: YYYY-MM-DD HH:mm TZ
Phase: Phase xx
Batch status: IN_PROGRESS
Contract baseline: سند یا task قرارداد freeze‌شده
Coordinator-only files: plan/STATUS.md، checklist فاز، phase log و فایل‌های shared مشخص
Tasks:
  - Task ID: Fxx-Tyy
    Agent/Thread: شناسه subagent
    Status: CLAIMED
    Depends on: ...
    Scope: خروجی دقیق task
    Owned paths: فایل‌ها یا پوشه‌های قابل ویرایش
    Shared/exclusive resource: none | Prisma | OpenAPI client | common/auth | test DB
    Expected verification: ...
```

همچنین وضعیت فاز از `NOT_STARTED` به `IN_PROGRESS` تغییر می‌کند.

اگر task یا مسیر آن از قبل claim شده، Agent دوم نباید همان scope را شروع کند. workerها حق ویرایش
`STATUS.md`، checklist فاز یا phase log را ندارند.

## ترتیب اجرای batch

1. Agent اصلی baseline تغییرهای موجود و ownership هر lane را ثبت می‌کند.
2. subagentها taskهای مستقل خود را در مسیرهای واگذارشده اجرا می‌کنند.
3. هر subagent تست task-level را اجرا و handoff ساختاریافته ارسال می‌کند.
4. Agent اصلی پس از `READY_FOR_REVIEW` شدن همه laneها، combined diff را review می‌کند.
5. تغییرهای مشترک، wiring، Prisma generate و OpenAPI generation فقط توسط owner تعیین‌شده انجام می‌شوند.
6. Agent اصلی تست یکپارچه متناسب را به‌صورت کنترل‌شده اجرا می‌کند.
7. فقط پس از عبور review gate، evidence، checkbox و status را به‌روزرسانی می‌کند.

## اجرای feature slice سه‌لایه

برای taskهایی که app، dashboard و API را درگیر می‌کنند:

1. product rule و response/error contract ابتدا freeze می‌شود.
2. schema/migration و OpenAPI یک owner واحد دارند.
3. پس از contract freeze، app و dashboard می‌توانند با file ownership جدا موازی شوند.
4. agent مستقل می‌تواند authorization، browser E2E و review را اجرا کند.
5. هیچ دو agent هم‌زمان Prisma schema، migration یا generated API client را تغییر نمی‌دهند.
6. task فقط وقتی کامل است که mock همان scope در هر دو رابط حذف شده باشد.

فایل‌های Prisma و migration، generated OpenAPI client، `common/auth`، error contract، lockfile و
module wiring مشترک در هر batch فقط یک writer دارند. هر تغییر خارج از owned paths باید متوقف و
برای reassignment به coordinator گزارش شود.

## خروجی الزامی subagent

worker پس از پایان، checkbox یا plan را تغییر نمی‌دهد و این handoff را برای Agent اصلی می‌فرستد:

```text
Task ID:
Status: READY_FOR_REVIEW | BLOCKED
Summary:
Files touched:
Tests run and results:
Acceptance criteria evidence:
Remaining/TODO:
Risks or conflicts:
```

## Review gate توسط Agent اصلی

پس از آماده‌شدن تمام taskهای batch، Agent اصلی باید این موارد را تأیید کند:

1. فایل‌های تغییرکرده با owned paths هر task مطابق‌اند و تغییر unrelated وجود ندارد.
2. acceptance criteria، authorization/ownership، audit و قراردادهای داده/API رعایت شده‌اند.
3. TODO، mock یا bypass لازم برای همان scope باقی نمانده است.
4. migration و OpenAPI/client در صورت ارتباط، تازه و دارای یک owner بوده‌اند.
5. تست task-level قابل استناد است و تست یکپارچه لازم نیز پاس شده است.
6. ترکیب سه خروجی با هم regression یا conflict ایجاد نکرده است.

اگر gate شکست بخورد، batch به `REWORK` می‌رود، taskهای affected تیک نمی‌خورند و batch بعدی شروع
نمی‌شود. task مستقل و کاملاً پذیرفته‌شده فقط با evidence جدا می‌تواند تیک بخورد، اما batch تا رفع
تمام موارد باز `COMPLETE` نیست.

## قانون تیک‌زدن

checkbox فقط توسط Agent اصلی و پس از review gate زمانی `[x]` می‌شود که:

- خروجی task در repository وجود داشته باشد.
- تست مرتبط اجرا و نتیجه ثبت شده باشد.
- acceptance criteria task پاس شده باشد.
- blocker پنهان یا TODO لازم برای همان task باقی نمانده باشد.

اگر بخشی ناقص است:

- checkbox `[ ]` باقی می‌ماند.
- وضعیت و بخش انجام‌شده در handoff نوشته می‌شود.
- در صورت مانع واقعی، task `BLOCKED` ثبت می‌شود.

## ثبت شواهد و handoff

پس از پذیرش task در review gate، Agent اصلی یک entry کامل در `plan/logs/phase-XX.md` اضافه می‌کند. قالب و
نام‌گذاری فایل‌ها در [`logs/README.md`](logs/README.md) منبع حقیقت هستند:

```text
## F03-T07 — عنوان task

Task ID: F03-T07
Completed at: 2026-..-..
Agent/Thread: ...
Batch ID: Fxx-Bnn
Reviewed by: Codex /root
Changed files:
  - ...
Migrations:
  - ...
Tests run:
  - command → PASS/FAIL
Result:
  - acceptance criterion 1 → PASS
  - acceptance criterion 2 → PASS
Known limitations:
  - ...
Next task:
  - F03-T08
```

سپس Agent اصلی باید در `STATUS.md` فقط این موارد را به‌روز کند:

1. claim بخش «batch در حال اجرا» را پاک کند.
2. `Batch بعدی واجد شرایط` را با حداکثر سه task مستقل و بدون blocker تنظیم کند.
3. در صورت وجود blocker یا handoff ضروری، یک خلاصهٔ کوتاه و link به entry لاگ ثبت کند.

شواهد کامل task تکمیل‌شده نباید در `STATUS.md` نگه‌داری یا کپی شود.

## پایان فاز

فاز فقط زمانی `READY_FOR_REVIEW` می‌شود که:

- تمام taskهای اجباری تیک خورده باشند.
- تمام exit criteria پاس شده باشند.
- migration از صفر تست شده باشد.
- تست‌های فاز پاس شده باشند.
- frontend integration تعیین‌شده انجام شده باشد.
- هیچ blocker بحرانی باز نباشد.

پس از review مستقل:

- فاز `DONE` می‌شود.
- checkbox فاز در `STATUS.md` تیک می‌خورد.
- فاز بعدی فعال می‌شود.
- `STATUS.md` به فایل checklist فاز بعدی و اولین Task واجد شرایط آن اشاره می‌کند.

## Handoff در batch ناقص

اگر یک worker نتوانست task را تمام کند، coordinator باید پیش از توقف وضعیت batch و task را ثبت کند:

```text
Task ID:
Batch ID:
Status: IN_PROGRESS | BLOCKED
Completed:
Remaining:
Files touched:
Commands/tests run:
Failure or blocker:
Safe next action:
Do not change:
```

## برخورد با تصمیم جدید

اگر پیاده‌سازی نیازمند تغییر معماری است:

1. Agent تغییر را پنهانی اعمال نمی‌کند.
2. یک ADR کوتاه در `plan/decisions/` پیشنهاد می‌دهد.
3. trade-off و اثر بر فازها را ثبت می‌کند.
4. `STATUS.md` را با blocker یا decision pending به‌روز می‌کند.
5. در صورت تغییر material، تأیید کاربر/مالک پروژه گرفته می‌شود.

قالب نام ADR:

```text
plan/decisions/ADR-0001-short-title.md
```

## قواعد کار موازی

- فقط sliceهایی که contract و ownership فایل مستقل دارند می‌توانند موازی شوند.
- schema/migration/backfill و تست upgrade یک lane انحصاری و serialize هستند.
- OpenAPI export/generation پس از تثبیت همه endpointهای batch و فقط توسط یک owner اجرا می‌شود.
- build/test هم‌زمان یک package یا integration test روی DB مشترک ممنوع است، مگر محیط‌ها کاملاً ایزوله باشند.
- تغییر در `common/auth`، error contract یا API client نیازمند اطلاع به تمام taskهای فعال است.
- یک Agent مسئول merge conflict یا cleanup تغییر Agent دیگر نیست مگر صریحاً واگذار شود.
- Agent اصلی یکی از چهار slot را برای coordination، review و integration نگه می‌دارد؛ سه slot دیگر سقف workerها هستند.

## ممنوعیت‌ها

- تیک‌زدن بر اساس «کد نوشته شد» بدون تست ممنوع است.
- تیک‌زدن توسط subagent یا پیش از review نهایی batch ممنوع است.
- ساخت package، service یا abstraction خالی برای آینده ممنوع است.
- حذف mock قبل از آماده‌شدن API feature ممنوع است.
- اجرای destructive reset روی تغییرهای محلی ممنوع است.
- تغییر فاز فعال بدون به‌روزرسانی `STATUS.md` ممنوع است.
- ذخیره secret واقعی در repository ممنوع است.
