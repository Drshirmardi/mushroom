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
| CRM/segmentation | DENY | DENY | DENY | DENY | excluded; no route/menu/query |

## Cross-cutting denial cases

All capabilities deny: inactive/disabled user, revoked/expired session, missing ADMIN role, invalid clinic, cross-tenant/clinic request, omitted required scope, and medical detail beyond the approved aggregate/view. ADMIN operational fallback never bypasses these checks or required audit events.

## Evidence matrix

Every ALLOW and every DENY cell has a backend authorization test. Browser E2E covers ADMIN allow and PATIENT/DOCTOR/STAFF denial via direct route navigation and UI. Tests also cover disabled ADMIN, revoked ADMIN session, another clinic, and no sensitive error/empty-state disclosure.
