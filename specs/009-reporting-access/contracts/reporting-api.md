# Reporting API Contract (Pre-Implementation)

## Common rules

- Namespace: `/v1/admin/reporting/**`; ADMIN-only backend authorization and active-session check are mandatory.
- `clinicId` is explicit where more than one permitted clinic can exist; it is validated before filters or counts. Every data query includes the resulting clinic predicate.
- `from`/`to` are ISO dates in `Asia/Tehran`, inclusive dates converted to a UTC half-open range. Default: last 30 local calendar days; maximum: 366 days.
- The appointments route's bounded list accepts an opaque `cursor` and `limit` 1–100; its aggregate/series values are not paginated. All other routes below are aggregate/series-only and reject `cursor`/`limit`.
- Responses include `clinicId`, `timeZone`, `from`, `to`, `asOf`, and source-status (`current|partial|stale`) where applicable. Money returns decimal strings of integer TOMAN amounts.
- Exports do not exist in this contract.
- Query parameters are an explicit allow-list: the common parameters plus the route-specific parameters in the table below. Any other parameter—including a list/search/state identifier not named for that route, or `cursor`/`limit` on an aggregate-only route—is rejected before a reporting data query with HTTP 400 and the existing stable `BAD_REQUEST` envelope; it is never silently ignored. Malformed UUID/date/enum/cursor values, `limit` outside 1–100, `from > to`, or a range over 366 days use the same validation response. Authorization and clinic-scope denial remain governed by the authorization contract and occur without protected result disclosure.

| Route | Purpose | Route-specific allowed filters and defaults | Pagination | Result restrictions |
|---|---|---|---|---|
| `GET /v1/admin/reporting/appointments` | KPI-04–09 and bounded appointment series/list | None beyond common `clinicId`, `from`, and `to`; absence uses the common 30-day default. `status`, `doctorId`, `patientId`, service, and free-text filters are not part of this release contract. | `cursor` optional; `limit` default 20, valid 1–100, applies only to the list member. | lifecycle fields only; no medical content |
| `GET /v1/admin/reporting/patients` | KPI-01–03 aggregates | None beyond common `clinicId`, `from`, and `to`; absence uses the common 30-day default for KPI-01, while KPI-02/KPI-03 remain current snapshots at `asOf`. Patient search, name/phone query, onboarding-state query, patient ID, `cursor`, and `limit` are unsupported here; existing separately authorized patient-management routes are unchanged. | None; aggregate-only. | no patient list, medical intake, consent detail, name, phone, or other contact disclosure |
| `GET /v1/admin/reporting/assessments` | KPI-10–12 aggregates | None beyond common `clinicId`, `from`, and `to`; absence uses the common 30-day default. Submission `state`, `assessmentVersionId`, `patientId`, score, `cursor`, and `limit` filters are unsupported in this reporting route. | None; aggregate-only. | no raw answers/result snapshots; score aggregation is not released by this contract |
| `GET /v1/admin/reporting/treatments` | KPI-13–16 aggregates | None beyond common `clinicId`, `from`, and `to`; absence uses the common 30-day default for range KPIs, while KPI-13 remains a current snapshot at `asOf`. Plan/task state, patient ID, plan ID, task ID, `cursor`, and `limit` filters are unsupported. | None; aggregate-only. | no plan title/instructions, medication, nutrition, exercise text, or task content |
| `GET /v1/admin/commerce/revenue` | Existing KPI-17–20 revenue series | `granularity` is the only route-specific filter: enum `DAY|WEEK|MONTH`, default `DAY`. No payment/refund/order/provider/status identifier or `cursor`/`limit` is supported. | None; aggregate/series-only. | retains `TOMAN`, verified payment/completed refund definition, and operational-not-settlement label |

Forbidden response paths: cross-clinic rows, unscoped counts, raw audit metadata, patient medical detail by aggregation, payment provider secrets/payloads, and any export token/URL.
