# ADR-0012 — GitHub Free boundary for test-VPS delivery

- وضعیت: `ACCEPTED`
- تاریخ: `2026-10-08`
- تصمیم‌گیرندگان: `Product owner`, `Codex /root`
- فاز/task مرتبط: `F12-T02`
- جایگزین ADR قبلی: `ندارد`

## Context

Repository خصوصی سازمان روی GitHub Free قرار دارد. GitHub Environment و Environment secret برای private repository
روی این plan قابل تنظیم نیستند. هدف فعلی فقط rehearsal روی یک VPS غیرپروداکشن است که دو Compose project مستقل
`staging` و `production-sim` دارد. هر دو target از همان host و deployment identity استفاده می‌کنند.

## Decision

ورودی‌های SSH این rehearsal به‌صورت repository secret نگهداری می‌شوند و workflowها GitHub Environment را reference
نمی‌کنند. staging پس از release موفق و فقط با `VPS_CD_ENABLED=true` خودکار اجرا می‌شود. promotion و rollback
`production-sim` همچنان manual هستند و پیش از دسترسی remote، `github.actor` را با repository variable
`RELEASE_APPROVER` تطبیق می‌دهند. جداسازی database، volume، secret، port و release state روی VPS بدون تغییر می‌ماند.

این تصمیم فقط برای test VPS مشترک معتبر است. real production اجازهٔ reuse همین credential scope را ندارد.

## Alternatives Considered

- ارتقای Organization به GitHub Team: قابلیت Environment private را فراهم می‌کند، اما برای rehearsal فعلی الزامی نیست.
- عمومی‌کردن repository: با requirement خصوصی‌بودن repository ناسازگار است.
- نگه‌داشتن referenceهای Environment بدون قابلیت تنظیم آن‌ها: job deployment را در plan فعلی غیرقابل‌اجرا می‌کند.

## Consequences

### پیامدهای مثبت

- CD آزمایشی بدون تغییر visibility یا خرید plan قابل اجراست.
- کلید SSH همچنان encrypted-at-rest در GitHub Actions است و روی VPS ذخیره نمی‌شود.
- owner gate، digest-only promotion و محیط‌های جدا روی VPS حفظ می‌شوند.

### هزینه‌ها و trade-offها

- staging و production-sim یک repository-scoped deployment identity دارند.
- approval native مربوط به GitHub Environment در دسترس نیست.

### ریسک‌ها

- هر workflow قابل‌اعتماد روی protected main که این secretها را reference کند می‌تواند به VPS آزمایشی متصل شود؛ branch
  protection و review تغییرهای workflow بخشی از مرز امنیتی هستند.

## Implementation Impact

- `release.yml`، `promote.yml` و `rollback.yml` از repository secrets استفاده می‌کنند.
- مستند bootstrap و contract tests نبود dependency به Environment را enforce می‌کنند.
- application، database schema، image artifact و runtime provider-neutral تغییری ندارند.

## Validation

- parse/actionlint هر سه workflow؛ contract test release pipeline؛ بررسی owner gate و least-privilege permissions؛
  سپس baseline و دو update و rollback کنترل‌شده روی VPS آزمایشی.

## Revisit Trigger

- انتخاب provider واقعی production، جداشدن hostهای staging/production، نیاز به reviewer مستقل، یا ارتقای GitHub plan.
