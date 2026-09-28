# Authorization Matrix Contract

`ALLOW` means backend permission, active session, tenant/clinic predicate, and resource rule all pass. `DENY` means no protected data, aggregate count, metadata, or export capability is disclosed. UI hiding is supplemental only.

| Capability | ADMIN | PATIENT | DOCTOR | STAFF | Additional resource rule / audit |
|---|---:|---:|---:|---:|---|
| Dashboard admission | ALLOW | DENY | DENY | DENY | active session; dashboard admission denial is backend-enforced |
| Domain report aggregates/lists | ALLOW | DENY | DENY | DENY | explicit tenant/clinic predicate; medical minimization |
| Commerce operational revenue | ALLOW | DENY | DENY | DENY | clinic-scoped; operational, not settlement certification |
| Audit viewer | ALLOW | DENY | DENY | DENY | redacted projection, scoped filter/pagination; sensitive access audit |
| Support operation | ALLOW | DENY | DENY | DENY | minimum-necessary approved action only; audit where sensitive |
| Report/audit export | DENY | DENY | DENY | DENY | excluded from release |
| Staff membership/invitation | DENY | DENY | DENY | DENY | excluded; no mutation route/menu |
| Operational store CRM | ALLOW | DENY | DENY | DENY | active, unrevoked, unexpired ADMIN session plus existing `ClinicalClinicAccess` for explicit active `clinicId`; non-medical projection only; audit each disclosed patient |
| CRM export, saved segment, audience, campaign/marketing, bulk messaging | DENY | DENY | DENY | DENY | excluded; no route, query, UI action, or data export |

## Cross-cutting denial cases

All capabilities deny: inactive/disabled user, revoked/expired session, missing ADMIN role, invalid clinic, omitted CRM clinic scope, a clinic lacking the actor's existing `ClinicalClinicAccess`, cross-tenant/clinic request, and medical detail beyond the approved aggregate/view. ADMIN operational fallback never bypasses these checks or required audit events.

## Evidence matrix

Every ALLOW and every DENY cell has a backend authorization test. Browser E2E covers ADMIN allow and PATIENT/DOCTOR/STAFF denial via direct route navigation and UI. CRM evidence additionally covers disabled, revoked, and expired ADMIN sessions; an active foreign clinic with a crafted identifier; unsupported parameters; and no sensitive error/empty-state disclosure.
