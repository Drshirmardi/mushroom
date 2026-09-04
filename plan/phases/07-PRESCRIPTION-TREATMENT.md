# Phase 07 — Prescription & Treatment

- وضعیت اولیه: `NOT_STARTED`
- Milestone: `C — هسته درمان`
- پیش‌نیاز: `Phase 06 DONE`
- خروجی اصلی: نسخه و برنامه درمان در dashboard صادر و در app پیگیری می‌شود.

## محدوده UI

- app: تمام `/treatment/**`
- dashboard: `/prescriptions` و تب‌های prescriptions، treatment، diet و exercise در patient workspace
- Dashboard Home: برنامه‌های فعال و تکمیل درمان فقط از داده واقعی

## مدل‌ها

- `Prescription`، `PrescriptionItem` و `PrescriptionRevision`
- `TreatmentPlan`
- `TreatmentSessionPlan`
- `TreatmentMedication`
- `ExercisePlan`
- `NutritionPlan`
- `TreatmentTask`
- `MedicationAdherenceLog`
- `TreatmentProgressEvent`

## Taskها

- [x] `F07-T01` — lifecycle draft/issue/amend و قواعد ایمنی نسخه
- [x] `F07-T02` — migration prescription/treatment/task/adherence
- [x] `F07-T03` — prescription create/draft/issue/revision API
- [x] `F07-T04` — treatment medication/session/exercise/nutrition plan API
- [x] `F07-T05` — task schedule و ثبت مصرف/انجام با idempotency
- [x] `F07-T06` — progress calculation و timeline واقعی
- [x] `F07-T07` — اتصال prescription builder و patient workspace dashboard
- [x] `F07-T08` — اتصال treatment/med/session/exercise/progress در app
- [x] `F07-T09` — permission، audit، contraindication warning contract
- [x] `F07-T10` — OpenAPI/client و حذف mock/local state scope
- [x] `F07-T11` — immutability، amendment، ownership و browser E2E
- [ ] `F07-T12` — evidence

## قواعد و معیار خروج

- نسخه صادرشده immutable و اصلاح آن revision است.
- schedule دارو/تمرین منبع reminder آینده است.
- task و adherence پس از refresh و دستگاه دیگر باقی می‌ماند.
- درصد پیشرفت از event واقعی محاسبه می‌شود، نه مقدار ثابت UI.
- مسیر dashboard issue → app display → patient log → dashboard review پاس است.
