# Phase 10 — AI & Bots

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `D`
- پیش‌نیاز: `Phase 08 DONE` و policy امنیت/حریم خصوصی مصوب
- خروجی اصلی: قابلیت AI محدود، قابل audit و دارای human handoff

## مدل‌های پیشنهادی

- `BotDefinition`
- `BotVersion`
- `PromptVersion`
- `KnowledgeDocument`
- `KnowledgeChunkMetadata`
- `BotConversation`
- `BotMessage`
- `HumanHandoff`
- `ModelUsage`
- `BotCampaign`

## Taskها

- [ ] `F10-T01` — تعریف use caseهای مجاز و ممنوع AI
- [ ] `F10-T02` — data classification، consent و provider review
- [ ] `F10-T03` — AI provider port و adapter بدون coupling مستقیم domain
- [ ] `F10-T04` — bot/prompt versioning
- [ ] `F10-T05` — knowledge ingestion با access policy
- [ ] `F10-T06` — retrieval و citation metadata
- [ ] `F10-T07` — bot conversation و usage/cost tracking
- [ ] `F10-T08` — moderation/guardrail و timeout/fallback
- [ ] `F10-T09` — human handoff
- [ ] `F10-T10` — assessment assistance فقط غیر-authoritative
- [ ] `F10-T11` — bot campaign با consent و preference
- [ ] `F10-T12` — اتصال تمام bot dashboard pages
- [ ] `F10-T13` — prompt injection، data leakage و authorization tests
- [ ] `F10-T14` — quality evaluation dataset و regression eval
- [ ] `F10-T15` — evidence و review

## خطوط قرمز

- AI تشخیص نهایی ثبت نمی‌کند.
- AI نسخه signed/issued ایجاد نمی‌کند.
- AI permission کاربر را دور نمی‌زند.
- فایل یا پرونده بیمار بدون necessity و consent به provider ارسال نمی‌شود.
- prompt و output خام حاوی PII در log عمومی ثبت نمی‌شود.
- پاسخ بالینی حساس باید برچسب و human review داشته باشد.
- knowledge عمومی و پزشکی خصوصی index یکسان بدون ACL ندارند.

## معیار خروج

- هر پاسخ به bot/prompt/model version قابل انتساب است.
- handoff به انسان عملی است.
- eval قابل تکرار وجود دارد.
- data leakage و prompt injection scenarioها تست شده‌اند.
- AI به مسیرهای authoritative بالینی دسترسی مستقیم ندارد.
