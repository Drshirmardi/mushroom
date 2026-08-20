# وضعیت زنده اجرای پروژه

> این فایل فقط وضعیت فعلی، ownership، blocker و handoff کوتاه را نگه می‌دارد. شواهد taskهای
> تکمیل‌شده در [`logs/`](logs/README.md) ثبت می‌شوند؛ checklist کامل هر فاز نیز در فایل همان
> فاز منبع حقیقت است.

## وضعیت کلی

- آخرین به‌روزرسانی: `2026-08-20 15:08 +03:30`
- Milestone فعال: `Milestone A — اولین نسخه عملیاتی کلینیک`
- فاز فعال: `Phase 00 — Foundation`
- وضعیت فاز فعال: `BLOCKED`
- task فعال: `ندارد`
- مسئول/Agent: `تعیین نشده`
- blocker فعال: نخستین اجرای CI در PR شماره ۱ روی `pnpm lint` شکست خورد؛ `apps/dashboard` هنوز از `next lint` نامعتبر استفاده می‌کند.

## پیشرفت کلان

- [x] Monorepo با pnpm workspace و Turborepo ایجاد شده است.
- [x] سایت عمومی `apps/web` پیاده‌سازی ظاهری شده است.
- [x] اپ کاربر `apps/app` پیاده‌سازی ظاهری و mock شده است.
- [x] داشبورد `apps/dashboard` پیاده‌سازی ظاهری و mock شده است.
- [x] بک‌اند NestJS پایه ایجاد شده است.
- [x] PostgreSQL و migration پایه ایجاد شده‌اند.
- [ ] احراز هویت واقعی جایگزین mock شده است.
- [ ] اولین جریان end-to-end رزرو نوبت کامل شده است.
- [ ] اطلاعات بالینی واقعی شده‌اند.
- [ ] فروشگاه و پرداخت واقعی شده‌اند.
- [ ] چت واقعی شده است.
- [ ] production readiness تأیید شده است.

## وضعیت فازها

- [ ] `Phase 00` — Foundation — `BLOCKED` — checklist: [`phases/00-FOUNDATION.md`](phases/00-FOUNDATION.md)
- [ ] `Phase 01` — Identity & Access — `NOT_STARTED`
- [ ] `Phase 02` — Clinic, Doctors & Patients — `NOT_STARTED`
- [ ] `Phase 03` — Scheduling & Appointments — `NOT_STARTED`
- [ ] `Phase 04` — Clinical Records & Treatment — `NOT_STARTED`
- [ ] `Phase 05` — Assessments & Health Tracking — `NOT_STARTED`
- [ ] `Phase 06` — Notifications, Content & Jobs — `NOT_STARTED`
- [ ] `Phase 07` — Commerce & Payments — `NOT_STARTED`
- [ ] `Phase 08` — Chat & Online Consultation — `NOT_STARTED`
- [ ] `Phase 09` — Reporting, CRM & Automation — `NOT_STARTED`
- [ ] `Phase 10` — AI & Bots — `NOT_STARTED`
- [ ] `Phase 11` — Scale & Production Hardening — `NOT_STARTED`

## handoff فاز فعال

- آخرین task تکمیل‌شده: `F00-T16` — لاگ: [`logs/phase-00.md`](logs/phase-00.md)
- Task بعدی واجد شرایط: اصلاح `F00-T13` برای جایگزینی `next lint` و اجرای دوبارهٔ CI
- نتیجهٔ review مستقل: [CI run #1](https://github.com/Drshirmardi/mushroom/actions/runs/32364670878) در PR شمارهٔ ۱ هنگام `pnpm lint` شکست خورد؛ جزئیات در [`logs/phase-00.md`](logs/phase-00.md) ثبت شده است.

## task در حال اجرا

قبل از شروع، Agent فقط این بخش را تکمیل می‌کند:

```text
Task ID: —
Agent/Thread: —
Started at: —
Scope: —
Expected files: —
```

پس از تکمیل، Agent باید claim را پاک کند، `Task بعدی واجد شرایط` را به‌روز کند و شواهد کامل
را با قالب [`logs/README.md`](logs/README.md) در فایل لاگ همان فاز ثبت کند. entry تکمیل‌شده
نباید در این فایل باقی بماند.

## Blockerها و تصمیم‌های باز

- [ ] تعیین provider نهایی deployment پیش از ورود به production؛ این تصمیم مانع فازهای ۰۰ تا ۰۸ نیست.
- [ ] تعیین درگاه پرداخت و قرارداد webhook پیش از شروع `Phase 07`.
- [ ] تعیین سرویس SMS/OTP پیش از فعال‌سازی OTP یا notification پیامکی در `Phase 06`.
- [ ] تعیین الزامات حقوقی نگهداری پرونده، نسخه و رضایت بیمار پیش از release عمومی `Phase 04`.
- [ ] تعیین provider مشاوره ویدئویی پیش از تکمیل `Phase 08`.

## یادداشت وضعیت repository در زمان ایجاد این برنامه

- فایل `apps/app/src/components/home/slider-data.ts` دارای تغییر محلی از قبل بوده و متعلق به این برنامه نیست.
- فایل `justforcheck.md` untracked و منبع تحقیق معماری کاربر است.
- Agentها نباید این دو مورد را بدون درخواست صریح کاربر تغییر، حذف یا reset کنند.
