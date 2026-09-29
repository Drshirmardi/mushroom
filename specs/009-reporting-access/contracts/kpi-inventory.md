# KPI and Widget Inventory Contract

All values below are ADMIN-only, tenant/clinic-scoped, read from PostgreSQL or an API preserving the same source lineage, and use UTC persistence with `Asia/Tehran` half-open local-period conversion. `Owner` is the domain accountable for data semantics. `0` is a real zero; `partial` means a named source range/entity is unavailable or incomplete; `stale` means the response has an `asOf` older than its documented request completion. Neither partial nor stale may be replaced with an estimate.

## Canonical patient-onboarding predicate

For KPI-02 and KPI-03, the eligible population `P` is the set of distinct `PatientProfile.id` rows whose `clinicId` equals the selected authorized clinic at response `asOf`. For each member of `P`, `onboardingComplete(patient)` is exactly the current result of `evaluateOnboarding()` in `apps/api/src/modules/patients/domain/onboarding.ts`; it is true only when all of the following hold:

1. `UserProfile.firstName` and `UserProfile.lastName`, reached through the existing canonical relation `PatientProfile.user → User.userProfile`, are non-blank.
2. The latest `PatientMedicalIntakeRevision` by `revisionNumber` has answered values for `birthDate`, `sexAtBirth`, `allergyReport`, `chronicConditionReport`, and `currentMedicationReport`, using the canonical evaluator's answered-value rule.
3. The patient has a non-withdrawn `PatientConsentRecord` linked to an `ACTIVE` `ConsentPolicyVersion` for the selected clinic, and the latest intake revision's `completedConsentRecordId` equals that active consent record ID.
4. `PatientMedicalIntake.submissionState = COMPLETE`, `currentRevisionNumber > 0`, and `currentRevisionNumber = completedRevisionNumber`.

This predicate uses only the existing patient, intake-revision, consent-record, and consent-policy fields. A missing profile field, intake/revision, qualifying current consent, or completion marker makes the existing evaluator return incomplete; no additional onboarding state or inferred completion is permitted. The canonical code paths are `apps/api/src/modules/patients/domain/onboarding.ts` and `apps/api/src/modules/patients/admin/admin-patients.service.ts`.

| ID | Final widget / report KPI | Exact formula and event time | Source of truth and owner | Money/rounding and zero rule |
|---|---|---|---|---|
| KPI-01 | New patients | `count(distinct PatientProfile.id)` created in range | `PatientProfile.createdAt`; Patients | count; zero when no rows |
| KPI-02 | Onboarding complete | `count(patient in P where onboardingComplete(patient) = true)` at response `asOf` | `PatientProfile` joined through `PatientProfile.user → User.userProfile` for `UserProfile.firstName/lastName`, plus latest `PatientMedicalIntakeRevision`, `PatientMedicalIntake`, `PatientConsentRecord`, and clinic-scoped `ConsentPolicyVersion`; Patients | snapshot count; never infer from missing rows |
| KPI-03 | Onboarding incomplete | `count(patient in P where onboardingComplete(patient) = false)`, equivalently `count(P) - KPI-02`, at the same `asOf` | same population and predicate as KPI-02; Patients | snapshot count; zero only if `P` is empty or every member is complete |
| KPI-04 | Appointments scheduled | `count(Appointment.id)` with `startsAt` in range and `status in {PENDING, CONFIRMED, CHECKED_IN, QUEUED, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED}` | `Appointment.startsAt/status`; Appointments | count; status set is explicit |
| KPI-05 | Appointments completed | `count(Appointment.id)` with `completedAt` in range and `status=COMPLETED` | `Appointment.completedAt/status`; Appointments | count; zero if none |
| KPI-06 | Appointments cancelled | `count(Appointment.id)` with `cancelledAt` in range and `status=CANCELLED` | `Appointment.cancelledAt/status`; Appointments | count; zero if none |
| KPI-07 | No-shows | `count(Appointment.id)` with `noShowAt` in range and `status=NO_SHOW` | `Appointment.noShowAt/status`; Appointments | count; zero if none |
| KPI-08 | Completion rate | `KPI-05 / count(appointments whose terminal event in range is COMPLETED, CANCELLED, or NO_SHOW) × 100` | Appointment lifecycle; Appointments | one decimal percentage; denominator 0 → `not-applicable`, never `0%` |
| KPI-09 | Average wait minutes | `round-half-up(sum(startedAt - checkedInAt in whole minutes) / count(rows with both timestamps), 0)` | `Appointment.checkedInAt/startedAt`; Appointments | minutes; no qualifying rows → `not-applicable` |
| KPI-10 | Assessment submissions started | `count(PatientAssessmentSubmission.id)` with `startedAt` in range | submission/assessment-version joined to clinic; Assessments | count; zero if none |
| KPI-11 | Assessments completed | `count(submission.id)` where `state=COMPLETE` and `completedAt` in range | `PatientAssessmentSubmission.state/completedAt`; Assessments | count; `INVALIDATED` and `IN_PROGRESS` excluded |
| KPI-12 | Assessment completion rate | At response `asOf`, let `A = submissions with startedAt in range and state in {IN_PROGRESS, COMPLETE}`; `count(submission in A where state=COMPLETE and completedAt <= asOf) / count(A) × 100` | `PatientAssessmentSubmission.startedAt/state/completedAt`, joined through assessment version to selected clinic; Assessments | one decimal; numerator is an explicit subset of `A`; denominator 0 → `not-applicable`, never `0%` |
| KPI-13 | Treatment plans active | `count(TreatmentPlan.id)` where `TreatmentPlan.state = ACTIVE` in the current snapshot at response `asOf` | `TreatmentPlan.state`; Clinical | count; `DRAFT`, `COMPLETED`, and `VOIDED` are excluded; this is a current snapshot, not a historical range reconstruction |
| KPI-14 | Treatment tasks due | `count(TreatmentTask.id)` with `scheduledFor` in range and `state=SCHEDULED` | task joined through plan clinic; Clinical | count; no task description/content returned |
| KPI-15 | Treatment tasks completed | `count(TreatmentTask.id)` with `completedAt` in range and `state=COMPLETED` | `TreatmentTask.completedAt/state`; Clinical | count; zero if none |
| KPI-16 | Treatment task completion rate | At response `asOf`, let `T = tasks with scheduledFor in range and state in {SCHEDULED, COMPLETED}`; `count(task in T where state=COMPLETED and completedAt <= asOf) / count(T) × 100` | `TreatmentTask.scheduledFor/state/completedAt`, joined through treatment plan to selected clinic; Clinical | one decimal; numerator is an explicit subset of `T`; denominator 0 → `not-applicable`, never `0%` |
| KPI-17 | Gross captured | `sum(Payment.commerceAmountToman)` where `Payment.verifiedAt` in range | Payment joined through order clinic; Commerce | integer TOMAN; zero if no verified payment |
| KPI-18 | Completed refunds | `sum(Refund.amountToman)` where `Refund.status=COMPLETED` and `completedAt` in range | Refund → Payment → Order clinic; Commerce | integer TOMAN; zero if none |
| KPI-19 | Operational net revenue | `KPI-17 - KPI-18` per whole range and per time bucket | verified Payment/completed Refund; Commerce | integer TOMAN; label exactly `operational revenue`; may be negative; not Sadad settlement |
| KPI-20 | Successful payment count | `count(Payment.id)` with `verifiedAt` in range | Payment → Order clinic; Commerce | count; callback/attempt/order are excluded |
| KPI-21 | Refund pending | `count(Refund.id)` where `status in {REQUESTED, APPROVED}` at `asOf` | Refund → Payment → Order clinic; Commerce | count; no monetary projection |

## Final dashboard composition

Dashboard Home contains only KPI-01–03, KPI-04–05, KPI-09, KPI-11, KPI-14–15, KPI-19, and KPI-21 plus: (a) a paginated/limited today appointment list sourced from `Appointment.startsAt`, and (b) a limited recent operational activity list sourced from existing `OperationalActivity`. List widgets are not KPI values and must show explicit empty/loading/error/partial/stale states. KPI-06–08, KPI-10, KPI-12–13, KPI-16–18, and KPI-20 belong to their domain report pages/series, not duplicate Home cards.

## Common status contract

- `loading`: request not completed; no prior number is relabelled current.
- `error`: authorized request failed; no substitute number/list.
- `empty`: list query had zero authorized rows.
- `zero`: aggregate formula evaluated with a numeric result of zero.
- `not-applicable`: formula denominator/qualifying population is zero.
- `partial`: named source dimension or requested historical extent is unavailable; response identifies affected component.
- `stale`: `asOf` exists but exceeds the feature’s accepted freshness bound; initial direct-query responses are expected current-at-response and must not claim stale without an actual retained snapshot.
