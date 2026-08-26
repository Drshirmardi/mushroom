# Phase 03 Contract Adoption

This document maps the existing interfaces used by the remaining Phase 03 work. It does not
replace [`plan/contracts/assessment-booking-v1.md`](../../../plan/contracts/assessment-booking-v1.md)
or the generated OpenAPI client.

## Administrator Interfaces

| Capability | Existing interface | Required behavior |
|---|---|---|
| List versions | `GET /v1/admin/assessments` | Clinic-scoped versions and truthful pagination/state |
| Create draft | `POST /v1/admin/assessments` | Valid canonical draft only |
| Preview version | `GET /v1/admin/assessments/{id}` | Exact stored snapshot |
| Update draft | `PATCH /v1/admin/assessments/{id}` | Draft-only mutation |
| Duplicate version | `POST /v1/admin/assessments/{id}/duplicate` | New draft identity and version |
| Publish/archive | `POST .../{id}/publish|archive` | Enforce lifecycle and immutability |
| Read/update policy | `GET|PATCH /v1/admin/clinic/patient-policy` | Same-clinic published main version when required |
| List results | `GET /v1/admin/assessment-submissions` | Filter by patient, version, state, and pagination |
| Read result | `GET /v1/admin/assessment-submissions/{id}` | Clinic-scoped immutable result snapshot |

All administrator operations require the existing assessment-management permission. Sensitive
reads and writes remain audited by the API.

## Patient Interfaces

| Capability | Existing interface | Required behavior |
|---|---|---|
| List assessments | `GET /v1/assessments` | Published versions for the patient's clinic |
| Start/resume | `POST /v1/assessments/{assessmentVersionId}/submissions` | Reuse active attempt or create next attempt |
| Read/save attempt | `GET|PUT /v1/assessment-submissions/{id}` | Patient ownership and in-progress mutation only |
| Complete attempt | `POST /v1/assessment-submissions/{id}/submit` | Require `Idempotency-Key`; immutable exact result |
| Read result | `GET /v1/assessment-submissions/{id}/result` | Completed result owned by patient |
| Check booking | `GET /v1/patients/me/booking-eligibility` | Stable eligibility reason and next action |

The booking response reasons remain `ELIGIBLE`, `PROFILE_INCOMPLETE`,
`MAIN_ASSESSMENT_REQUIRED`, `ASSESSMENT_EXPIRED`, and `LATEST_VERSION_REQUIRED`. The frontend maps
these values to navigation and copy; it does not recalculate policy or use score.

## Contract Ownership

- API DTO metadata and exported OpenAPI are the request/response source.
- `packages/api-client/src/schema.generated.ts` is generated and must not be hand-edited.
- Frontends must not introduce duplicate public request or response types.
- Any demonstrated request-schema metadata defect is repaired at the API DTO and followed by one
  generated-client refresh and drift check.
