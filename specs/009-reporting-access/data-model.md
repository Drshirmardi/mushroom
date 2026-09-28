# Data Model: Reporting & Access Control

This phase begins as a governed read model over existing PostgreSQL records. No schema change is assumed.

| Entity / view | Authoritative fields | Reporting use | Scope and safeguards |
|---|---|---|---|
| Clinic | `id`, `timeZone`, `status` | owns all clinic-local report periods | active ADMIN + explicit clinic; UTC storage / Tehran presentation |
| PatientProfile | `id`, `userId`, `clinicId`, lifecycle timestamps | distinct-patient and onboarding population | joins to the existing `User` relation by `userId`; never return medical detail in aggregate |
| UserProfile | `userId`, `firstName`, `lastName` | canonical name-field inputs to the existing onboarding evaluator | reached only through `PatientProfile.user → User.userProfile`; names are predicate inputs and are not returned by reporting aggregates |
| Appointment | `clinicId`, `status`, `startsAt`, `confirmedAt`, `checkedInAt`, `startedAt`, `completedAt`, `cancelledAt`, `noShowAt` | lifecycle counts/rates and schedule list | clinic predicate; approved status/event rule per KPI |
| PatientAssessmentSubmission | `patientId`, `assessmentVersionId`, `state`, `startedAt`, `completedAt`, `invalidatedAt`, `score` | submission/completion reporting | join through version/patient clinic; score aggregate only if persisted scale is documented |
| TreatmentPlan / TreatmentTask | `clinicId`, `patientId`, `state`, `scheduledFor`, `completedAt` | plan/task completion and due/overdue aggregates | no treatment text/medication/instructions in reporting payload |
| Payment / Refund | `commerceAmountToman`, `verifiedAt`; `amountToman`, `status`, `completedAt` | gross, completed refunds, net operational revenue | join via order clinic; integer TOMAN only; no settlement claim |
| CRM Customer Read Model (computed) | `PatientProfile.id`, `User.status`, `UserProfile.firstName/lastName`, verified Payment, completed Refund, order-line title/quantity | read-only operational store-customer page and summary | population begins `PatientProfile.clinicId`; name only through `PatientProfile.user → User.userProfile`; no medical data, copied record, or persistence |
| ClinicalClinicAccess | `userId`, `clinicId` | existing ADMIN-to-clinic authorization predicate for CRM | resolve active clinic with actor access before every CRM read; no invitation/membership mutation in this phase |
| AuditEvent | action/actor/subject/request/time metadata | minimum-necessary support timeline | redacted projection, ADMIN only, filter/pagination after authorization |
| Authorization Matrix Entry | documented action + role + resource scope | contract/test fixture, not runtime source of truth | ADMIN allow; PATIENT/DOCTOR/STAFF deny for dashboard/admin capabilities |

## Read-model invariants

1. Each aggregate begins with tenant/clinic restriction; joins preserve the same clinic identity.
2. A local date range is `[from 00:00 Asia/Tehran, day-after-to 00:00 Asia/Tehran)` converted to UTC.
3. `null` or missing event timestamp never qualifies a time-based metric.
4. Count distinct identities explicitly where the KPI says patient/plan; count rows only where the KPI says submission/task/payment/refund.
5. Query plans, indexes, and any aggregate are separate F11-T05 evidence; a documentation model is not permission to add schema.
6. CRM segment is derived only from verified-payment count and is exactly one of `POTENTIAL` (0), `ONE_TIME` (1), `RETURNING` (2–4), or `VIP` (>=5). Its summary uses the same filtered patient population before pagination.
7. CRM payment/refund joins preserve `Payment.order.clinicId = PatientProfile.clinicId = resolved clinic`; completed refund joins only through its payment/order. A missing name, qualifying line, or payment is represented as `null`/zero as specified by the CRM contract, never invented data.
8. CRM writes no new data except the existing per-disclosed-patient `PatientAccessAudit` read event with clinic provenance and fixed non-sensitive metadata.
