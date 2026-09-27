# Research: Reporting & Access Control Decisions

## R1 — Reporting source and query approach

**Decision**: PostgreSQL direct, tenant/clinic-scoped queries are the initial reporting design.

**Rationale**: Existing facts and scoped indexes already support appointment operations, patient/assessment/treatment relationships, verified payments, and completed refunds. The engineering standards require query/index evidence before cache or aggregate work.

**Alternatives considered**: Redis, warehouse, BI/analytics service, materialized aggregate. Rejected now: no proven bottleneck or approved requirement; each would introduce freshness, ownership, and disclosure risk.

## R2 — Time, money, and commerce terminology

**Decision**: Reporting uses `Asia/Tehran` local calendar filters represented as UTC half-open timestamp ranges; stored timestamps stay UTC. Commerce values are integer `TOMAN` operational facts.

**Rationale**: It preserves the established clinic time zone and avoids day-boundary ambiguity. The existing Phase 09 revenue read model already uses verified payments and completed refunds with `verifiedAt`/`completedAt`.

**Alternatives considered**: browser-local time, inclusive end-of-day timestamp, floating money, or treating callback/attempt/order values as revenue. Rejected because each changes meaning or permits false financial reporting.

## R3 — Sadad status

**Decision**: Include only the Phase 09 operational revenue definition; label it `operational revenue`, never production-verified Sadad settlement.

**Rationale**: Phase 09 confirms persisted payment/refund facts but also explicitly records `SADAD_GO_LIVE_BLOCKED`; production acceptance, credentials, real transport, and settlement are deferred to Phase 12.

**Alternatives considered**: exclude commerce entirely or infer settlement from callback/attempt. The former would hide verifiable operational facts; the latter is prohibited by the Phase 09 contract.

## R4 — Release access model

**Decision**: Dashboard/admin reporting, audit viewing, and support operations are ADMIN-only. PATIENT retains existing self-service behavior; DOCTOR and STAFF are denied dashboard/admin routes. ADMIN still has tenant/clinic predicates, medical-ownership constraints, active-session enforcement, and audit requirements.

**Rationale**: This is the recorded release decision and is narrower than the existing broad dashboard admission policy.

**Alternatives considered**: retain DOCTOR/STAFF dashboard access, add an auditor role, dynamic roles, membership invitation. Rejected or deferred by the explicit release clarification and scope rules.

## R5 — Audit viewer and exports

**Decision**: A paginated, redacted audit-event view is allowed only for ADMIN; export is excluded.

**Rationale**: Existing audit metadata can contain sensitive context. A raw viewer/export would create an uncontrolled disclosure path.

**Alternatives considered**: raw JSON, unrestricted search, CSV/PDF export. Rejected absent an approved requirement defining field-level disclosure and audit boundaries.

## R6 — Conditional roadmap tasks

**Decision**: F11-T08 and F11-T10 are evidence/absence tasks in this release, not runtime features.

**Rationale**: Staff membership/invitation and CRM/segmentation lack the required confirmed need. The roadmap requires explicit treatment of those conditions.
