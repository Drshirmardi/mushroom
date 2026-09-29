# Feature Specification: Phase 11 Reporting & Access Control

**Feature Branch**: `codex/phase-11-reporting-access`
**Created**: 2026-09-27
**Status**: Frozen — owner-approved CRM change-control baseline; Phase 11 is in progress through `F11-T09`, while `F11-T10` remains unclaimed and unimplemented.
**Input**: Phase 11 roadmap tasks `F11-T01` through `F11-T11` and the approved reporting/access-control scope.

## Context and Scope

This phase makes the release dashboard operationally trustworthy: every displayed KPI is derived from an authorized source record, has a documented formula, owner, time basis, and display rule, and never substitutes invented data. It also freezes the release access-control boundary for reporting, clinical data, audit support, and any confirmed staff operation.

The scope covers reporting for appointments, patients, assessments, treatment, the already-persisted Phase 09 commerce facts, and a clinic-scoped operational store-customer CRM. Commerce figures distinguish operationally recorded payments/refunds from a production-verified Sadad settlement; no production assertion is permitted while Sadad acceptance or real settlement remains unavailable. PostgreSQL and authorized application APIs remain the sole sources of truth.

**Out of scope unless separately confirmed**: dynamic role building; CRM marketing, campaigns, saved segments, audiences, bulk messaging, export, medical profiling, and retention/copy tables; a data warehouse, analytics/BI service, Redis/caching infrastructure, new aggregation infrastructure, fictitious dashboard fallbacks, and production Sadad acceptance/settlement certification.

## Clarifications

### Session 2026-09-27

- Q: Is a staff membership/invitation capability required in this release? → A: No; `F11-T08` records the exclusion and evidence of no release need.
- Q: Should release roles remain the four existing roles with no role builder? → A: No; only ADMIN may access dashboard, reporting, audit, and support operations in this release. DOCTOR and STAFF have no dashboard/admin capability. ADMIN has the release’s full operational access, subject to explicit tenant/clinic scope, medical confidentiality/ownership, and audit requirements.

### Session 2026-09-28 — owner-approved change control

- Q: Is `F11-T10` still an exclusion-only task? → A: No; deliver real, read-only, clinic-scoped operational store-customer CRM in this release. Marketing, campaigns, saved segments, audiences, bulk messaging, export, medical profiling, and retention/copy tables remain excluded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use trustworthy operational reporting (Priority: P1)

An authorized clinic operator opens Dashboard Home and reporting views to understand appointment, patient, assessment, treatment, and eligible commerce activity for an explicit clinic and period, without mock values or unsupported conclusions.

**Why this priority**: This is the phase’s core operational value and establishes the KPI contract before any report or dashboard change.

**Independent Test**: An authorized actor can select a permitted clinic and period, receive only KPI/report values defined by the inventory, and distinguish zero, partial, stale, loading, and error conditions without seeing synthetic data.

**Acceptance Scenarios**:

1. **Given** an authorized actor and a permitted clinic, **When** the actor views a KPI or report for a stated period, **Then** the result identifies the formula, source-record basis, time zone, currency/rounding rule where applicable, and applied clinic scope.
2. **Given** no qualifying source records, **When** a report is requested, **Then** it communicates an explicit zero or empty result rather than an invented fallback.
3. **Given** a commerce payment/refund record exists but Sadad production acceptance or settlement is not verified, **When** the actor views commerce reporting, **Then** the operational fact may be reported with its status while no production-verified settlement claim is displayed.

---

### User Story 2 - Protect reporting and medical information (Priority: P1)

An authorized release role can use only the reporting, audit, and support capabilities assigned to that role and permitted clinic; clinical detail remains constrained by medical ownership even when an ADMIN uses an administrative fallback.

**Why this priority**: Reporting expands data visibility and must preserve tenant, clinic, session, and medical confidentiality boundaries.

**Independent Test**: A matrix of patient, doctor, staff, and ADMIN identities demonstrates permitted and denied API/UI/export paths, including disabled or revoked identities and cross-clinic/cross-patient attempts.

**Acceptance Scenarios**:

1. **Given** a user without the required permission, **When** the user requests a protected report, audit event, or export, **Then** the backend denies it without disclosing protected fields or count-derived sensitive details.
2. **Given** a doctor with access to one clinic, **When** the doctor requests another clinic’s report or a medical record without an authorized care relationship, **Then** the request is denied by backend authorization.
3. **Given** an ADMIN, **When** the ADMIN uses a release-approved fallback, **Then** the action remains tenant/clinic-scoped, preserves medical-ownership rules, and creates the required audit evidence.

---

### User Story 3 - Investigate support activity safely (Priority: P2)

An authorized support operator can find the audit evidence needed to investigate an allowed operational event without exposing sensitive medical content, secrets, session credentials, or unrelated tenant/clinic data.

**Why this priority**: Safe support operations require a traceable path that does not turn audit data into a disclosure channel.

**Independent Test**: Authorized users can find an eligible event using documented filters/pagination while forbidden actors and unapproved export paths receive no sensitive event data.

**Acceptance Scenarios**:

1. **Given** an authorized audit reviewer, **When** the reviewer filters audit events by an allowed scope and time period, **Then** results are paginated, redacted to the approved event representation, and auditable.
2. **Given** a disabled or revoked user, **When** that identity attempts the same operation, **Then** the backend rejects it and returns no event detail.

---

### User Story 4 - Manage operational store customers safely (Priority: P1)

An active ADMIN with an active, unrevoked, unexpired session reviews only the customers of an explicitly authorized clinic to understand actual store purchasing activity, without obtaining medical content or marketing capabilities.

**Why this priority**: The owner has approved a real operational CRM release slice, so the former exclusion must become an auditable, privacy-bounded workflow rather than a mock dashboard.

**Independent Test**: An authorized ADMIN with existing clinic access can page, search, segment-filter, and sort the canonical clinic customer population; all other roles, invalid sessions, invalid parameters, and another clinic’s identifier receive no CRM data.

**Acceptance Scenarios**:

1. **Given** an authorized ADMIN and one permitted clinic, **When** the ADMIN requests the CRM, **Then** each row is derived from that clinic’s canonical patient and commerce records and contains only the approved non-medical projection.
2. **Given** a customer with 0, 1, 2–4, or at least 5 verified payments, **When** the CRM computes the row, **Then** it returns respectively `POTENTIAL`, `ONE_TIME`, `RETURNING`, or `VIP`, and net spend is verified-payment gross minus completed refunds in integer `TOMAN`.
3. **Given** any PATIENT, DOCTOR, STAFF, disabled ADMIN, revoked/expired session, unsupported filter/sort, or foreign clinic identifier, **When** it requests the CRM, **Then** the backend denies or rejects it before customer data, summary totals, or audit metadata are disclosed.

### Edge Cases

- A zero count, empty report, incomplete historical range, or stale source record must be represented distinctly; none may be rendered as a positive result or substituted mock value.
- All report filters have an explicit default, maximum range, validated clinic scope, pagination rule for lists, and error/loading/empty behavior. Export is absent unless a requirement explicitly authorizes its data set, format, permission, audit event, and disclosure boundary.
- Boundaries that cross a local day/month/year use `Asia/Tehran`; persisted timestamps remain UTC and are converted only for period selection/presentation.
- Money figures use persisted integer amounts and explicit `TOMAN`; display rounding is integer-only and must not turn an unavailable settlement into revenue.
- A user disabled, logged out, or session-revoked after UI display but before a request is processed is denied by the backend; hiding a menu is never sufficient authorization.
- A query that lacks an explicit tenant/clinic predicate, relies on an unbounded list, or cannot prove an index need is rejected from the feature contract.
- CRM uses an explicit existing clinic-access relationship for the requesting ADMIN; a customer identifier, crafted filter, or foreign clinic identifier cannot widen that clinic predicate.
- CRM has no medical response field. An empty population produces an empty page and zero summary; a malformed or omitted clinic identifier, invalid page, page size, search, segment, sort, or direction produces the standard `BAD_REQUEST` response rather than silent fallback. A syntactically valid but foreign or unassigned clinic identifier is a scope denial with no disclosure.

## Requirements *(mandatory)*

### Functional Requirements

#### Reporting inventory and data lineage

- **FR-001**: The phase MUST maintain a final, versioned KPI/widget inventory that gives every KPI a stable identifier, title, formula, numerator/denominator where applicable, source entities/fields, data owner, tenant and clinic predicate, time zone, period boundary, currency, rounding, freshness meaning, and zero/partial/stale rule.
- **FR-002**: The inventory MUST include every Dashboard Home widget and every appointment, patient, assessment, treatment, and eligible commerce report; a widget absent from the inventory MUST NOT ship.
- **FR-003**: Each KPI and report MUST read only PostgreSQL source records or an authorized API response that preserves the same recorded source-of-truth lineage; UI mock, hard-coded fallback, sample data, and client-only inference are prohibited.
- **FR-004**: All stored timestamps remain UTC; reporting periods and labels use `Asia/Tehran`, with inclusive start and exclusive end boundaries derived from the selected local calendar period.
- **FR-005**: Monetary reporting MUST use persisted integer amounts in `TOMAN`, identify the monetary event timestamp, and use integer-only display rounding. Payment attempts, callbacks, unpaid orders, catalog prices, and unsupported settlement assumptions MUST NOT be counted as revenue.
- **FR-006**: Commerce operational revenue MUST equal verified payment amounts in scope minus completed refund amounts in scope, each allocated by its completed/verified event time and clinic. The report MUST label this as operational revenue and MUST NOT call it production-verified Sadad settlement unless the separately required acceptance and real settlement evidence exists.
- **FR-007**: Each non-monetary KPI MUST publish its exact qualifying state set and event timestamp; ratios MUST define their denominator-zero treatment rather than displaying a fabricated percentage.

#### Reports and Dashboard Home

- **FR-008**: Appointment reporting MUST define counts and rates from persisted appointment lifecycle events, including an explicit state set for scheduled, completed, cancelled, and no-show metrics and the time field used for each.
- **FR-009**: Patient reporting MUST define its patient population and lifecycle/event basis without exposing medical fields or counting duplicate profiles as separate people.
- **FR-010**: Assessment reporting MUST define submission population, published-version handling, completion rule, and any score aggregation only where the score/scale is persistently defined and authorized for reporting.
- **FR-011**: Treatment reporting MUST define plan/task population, qualifying state sets, completion/overdue calculations, and medical-data minimization; it MUST not disclose treatment content merely to satisfy an aggregate.
- **FR-012**: Dashboard Home MUST render only inventory-approved, authorized, real-source widgets and must use explicit loading, error, empty, zero, partial, and stale states. It MUST remove in-scope mock widgets and must not conceal absent data behind a positive or estimated value.
- **FR-013**: Report filters MUST specify available dimensions, defaults, validation, maximum date range, timezone semantics, tenant/clinic application, and whether pagination applies. List reports MUST use bounded pagination.
- **FR-014**: A report export is prohibited unless its feature requirement separately names the permitted report, audience, format, field set, scope, authorization, medical-data handling, audit event, and disabled/revoked-user behavior.
- **FR-015**: Query/index work MUST begin with an actual scoped query and a captured bottleneck measurement. An index, materialized/aggregate read model, or new reporting infrastructure is permitted only when the evidence proves it necessary and documents freshness/ownership; otherwise PostgreSQL direct scoped queries remain the design.

#### Access control and audit support

- **FR-016**: This release freezes ADMIN as the sole dashboard, reporting, audit-viewer, and support-operations role. PATIENT retains only existing self-service scope; DOCTOR and STAFF receive no dashboard/admin capability. Dynamic role creation, role builders, and release expansion of dashboard access are excluded unless a distinct approved requirement changes this specification.
- **FR-017**: The authorization matrix MUST define action-level backend enforcement for every reporting, audit-viewer, support, export, and role/membership capability. It must explicitly allow ADMIN and explicitly deny PATIENT, DOCTOR, and STAFF for all dashboard/admin capabilities in this release.
- **FR-018**: Every protected reporting and audit query MUST enforce an authenticated active ADMIN identity, tenant scope, explicit clinic scope, action permission, and medical ownership where clinical data can be reached. ADMIN is the only release fallback and does not override medical confidentiality or audit requirements.
- **FR-019**: Backend authorization MUST deny cross-tenant, cross-clinic, unlinked-doctor, non-owner patient, disabled-user, and revoked-session access before data disclosure. UI capability menus may assist navigation but are not authorization.
- **FR-020**: The audit viewer MUST expose only an approved, redacted event representation, apply authorization before filtering/counting/pagination, prevent sensitive medical/credential disclosure, and record accesses to sensitive audit or medical information according to the existing audit policy.
- **FR-021**: Support operations MUST use documented, minimum-necessary filters and pagination. They may not acquire an unrestricted search, raw metadata dump, or data export by implication.
- **FR-022**: Browser end-to-end and backend authorization-matrix evidence MUST cover the permitted ADMIN journey; denied PATIENT, DOCTOR, and STAFF dashboard/admin journeys; tenant/clinic isolation; medical ownership; ADMIN fallback limits; disabled/revoked identities; and no-disclosure behavior in API, UI, and any approved export.

#### Conditional release scope and closure

- **FR-023**: `F11-T10` MUST deliver a read-only operational store-customer CRM, not marketing or clinical profiling. Its purpose is operational review of customers belonging to one authorized clinic; it may use no source other than canonical `PatientProfile`, `PatientProfile.user → User.userProfile`, `CommerceOrder`, verified `Payment`, completed `Refund`, and existing `CommerceOrderLine` records.
- **FR-027**: CRM access MUST require backend-enforced `ADMIN`, a persisted active user, and a persisted unrevoked, unexpired session. The requested `clinicId` MUST be a valid active clinic for which the ADMIN has an existing `ClinicalClinicAccess` record; every population, payment, refund, order-line, count, summary, and audit query MUST carry that clinic predicate. PATIENT, DOCTOR, STAFF, disabled ADMIN, revoked/expired sessions, omitted/foreign clinic IDs, and crafted filters MUST disclose no CRM row or derived summary.
- **FR-028**: CRM population MUST be all and only `PatientProfile` rows in the authorized clinic. Its approved row projection is `patientId`, display name derived only from `PatientProfile.user → User.userProfile`, `User.status`, deterministic segment, verified-payment count, gross, completed refund, net spend, top product, and last verified-payment time. It MUST omit medical intake, assessment, treatment, diagnosis, note, address, phone, token, raw audit metadata, and all other unapproved fields.
- **FR-029**: CRM segments are mutually exclusive and exhaustive over the population: `POTENTIAL` = zero verified `Payment` rows; `ONE_TIME` = exactly one; `RETURNING` = two through four; `VIP` = five or more. `grossToman` is the integer sum of verified `Payment.commerceAmountToman`; `completedRefundToman` is the integer sum of `Refund.amountToman` where `Refund.status=COMPLETED`; `netSpendToman = grossToman - completedRefundToman`. A refund joins the customer only through `Refund.payment → Payment.order → CommerceOrder.patientId` in the same clinic. `topProduct` is the most frequently purchased existing order-line title among that customer’s verified-payment orders, breaking equal quantities by title ascending; it is `null` when no qualifying line exists. `lastPurchaseAt` is the greatest qualifying `Payment.verifiedAt`, or `null` with no verified payment.
- **FR-030**: CRM MUST return a bounded page and summary in `TOMAN`, with page number 1 or greater, page size 1–100, an optional trimmed display-name search of at most 120 characters, an optional segment from the four defined values, and only these sort keys: `NET_SPEND`, `SUCCESSFUL_PURCHASE_COUNT`, `LAST_PURCHASE_AT`, or `DISPLAY_NAME`, each with `ASC` or `DESC`. Default sorting is `NET_SPEND DESC` with `PatientProfile.id ASC` tie-break. Any malformed, unsupported, out-of-range, or empty-required parameter MUST be rejected as `BAD_REQUEST`, never silently ignored; a syntactically valid but unauthorized clinic is denied as a scope authorization failure without rows or derived summary. Summary is the filtered CRM population’s `totalCustomerCount`, `vipCustomerCount`, total `netSpendToman`, and integer-truncated `averageNetSpendToman`; its zero denominator yields `0`.
- **FR-031**: Each CRM response that discloses a customer row MUST create an existing-audit-policy access event for each disclosed `PatientProfile`, with the requesting actor/session, clinic provenance, `READ`, approved CRM resource identifiers, request correlation, and timestamp. Audit metadata MUST be fixed non-sensitive provenance only; it MUST contain no request token, raw request/response payload, medical data, or foreign-clinic data. Audit failure MUST fail the sensitive response rather than return an unaudited disclosure.
- **FR-032**: The CRM dashboard MUST call the approved real CRM API and must show responsive loading, error, empty, populated, and pagination states without mock customer data, fabricated totals, or inert row/action controls. The UI MAY retain the existing visual card/table language only when it represents the approved response fields.
- **FR-033**: CRM export, saved segment, campaign audience, campaign/marketing capability, bulk messaging, medical profiling, copy/retention table, new schema/migration, new aggregation infrastructure, and unapproved action controls are excluded from `F11-T10`. Any future inclusion requires a separately approved requirement and change control.
- **FR-024**: Staff membership/invitation is excluded from this release. `F11-T08` MUST record the no-need decision and prove that no invitation, membership mutation, or related capability menu/export is introduced. Any future inclusion requires a separate approved requirement defining eligible inviter role, clinic/tenant scope, role assignment limits, invitation expiry/revocation, audit events, disabled/revoked behavior, backend authorization, and E2E evidence.
- **FR-025**: Every Phase 11 roadmap task (`F11-T01`–`F11-T11`) MUST map to one or more requirement IDs, owned artifacts/files, dependencies, a verification method, and recorded evidence before it can be considered complete.
- **FR-026**: `F11-T10` MUST remain unclaimed and unimplemented until this owner-approved change control, its design artifacts, task plan, reviewer gate, and required analysis are frozen without unresolved clarification markers or HIGH/CRITICAL findings. The change-control artifact itself creates neither a task claim nor `DONE` status; Phase 11 remains `IN_PROGRESS` until the roadmap closure task completes.

### Key Entities

- **KPI Definition**: The governed definition of one operational measurement, including formula, lineage, data owner, scope, period, state semantics, and presentation rules.
- **Report Request**: An authorized actor’s selected report, clinic/tenant scope, time range, filters, pagination, and approved output mode.
- **Report Result**: A real-source response containing only authorized aggregates/list rows plus explicit completeness/freshness/status semantics.
- **Audit Event View**: A permission-filtered, redacted representation of an existing audit event; it is not an unrestricted audit-log export.
- **Authorization Matrix Entry**: One action/resource/scope rule linking a fixed release role to backend enforcement, medical-ownership conditions, and audit behavior.
- **Commerce Revenue Event**: A Phase 09 verified payment or completed refund that can participate in operational revenue, distinct from a Sadad production settlement assertion.
- **CRM Customer Read Model**: A non-persisted, read-only clinic-local projection of one `PatientProfile` and its approved commerce facts; it is not a patient clinical profile, marketing audience, saved segment, or new CRM entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of released KPIs/widgets have a unique inventory entry containing formula, source lineage, data owner, `Asia/Tehran` time basis, scope, and zero/partial/stale rule.
- **SC-002**: 100% of released report and Dashboard Home values are reproducible from authorized scoped source records; review finds zero released mock/fallback/sample KPI values.
- **SC-003**: 100% of list report endpoints have documented bounded pagination and all released reports have documented loading, error, empty, zero, partial, and stale behavior.
- **SC-004**: 100% of monetary KPI definitions use persisted integer `TOMAN` facts and label operational revenue separately from unverified Sadad production settlement.
- **SC-005**: The authorization matrix has a passing permitted and denied case for every released protected capability, including tenant/clinic isolation, medical ownership, ADMIN fallback limits, and disabled/revoked identity behavior.
- **SC-006**: All accepted query/index changes have captured scoped-query evidence; zero unproven aggregate platforms, caches, warehouses, BI services, or infrastructure additions are introduced.
- **SC-007**: Every `F11-T01`–`F11-T11` roadmap task has a clear requirement/artifact/verification/evidence trace and all reviewer-gate items are answerable before implementation begins.
- **SC-008**: 100% of CRM rows and summary values are reproducible from the approved clinic-scoped canonical records; zero CRM rows contain medical fields, raw audit metadata, tokens, mock values, or foreign-clinic data.
- **SC-009**: Every segment boundary (0, 1, 2, 4, and 5 verified payments), completed-refund subtraction, no-payment/zero-summary case, pagination, display-name search, supported filter, supported sort, and invalid-parameter rejection has passing disposable-PostgreSQL evidence.
- **SC-010**: Backend and browser evidence proves CRM allow only for an active, authorized ADMIN session and proves denial/no disclosure for PATIENT, DOCTOR, STAFF, disabled/revoked/expired ADMIN sessions, foreign clinics, and unapproved export/marketing paths.

## Assumptions

- Existing identity roles remain persisted for compatibility, but this release grants dashboard/admin/reporting/audit/support capabilities only to ADMIN. PATIENT retains existing self-service scope; DOCTOR and STAFF are explicitly denied dashboard/admin capabilities. This phase does not create a dynamic role system.
- Existing Phase 09 persisted payment/refund data is eligible only for the operational-revenue definition in this specification; Sadad go-live, credentials, acceptance, network transport, and real settlement remain out of scope and unverified.
- Existing audit records and authorization patterns are reused and may be exposed only through a new permission-filtered view; raw audit metadata is not presumed safe to disclose.
- The current application uses UTC persistence and the reporting business calendar is `Asia/Tehran`.
- CRM release precondition: each active ADMIN who must use CRM already has a canonical `ClinicalClinicAccess` row for the intended active clinic. `F11-T10` verifies that existing assignment and does not create an invitation, membership mutation, auto-grant, or cross-clinic fallback.
- Staff membership/invitation remains excluded. Operational store CRM is explicitly approved only as defined by FR-023 and FR-027–FR-033; marketing, saved segments, audiences, bulk messaging, export, medical profiling, retention/copy tables, and dynamic roles remain excluded.

## Roadmap Traceability

| Roadmap task | Requirement mapping | SpecKit artifact target |
|---|---|---|
| F11-T01 | FR-001–FR-007, SC-001, SC-004 | `spec.md`, `data-model.md`, `contracts/kpi-inventory.md` |
| F11-T02 | FR-008–FR-014, SC-002–SC-003 | `plan.md`, `contracts/reporting-api.md`, `quickstart.md` |
| F11-T03 | FR-005–FR-006, SC-004 | `research.md`, `contracts/kpi-inventory.md`, `contracts/reporting-api.md` |
| F11-T04 | FR-002–FR-003, FR-012–FR-013, SC-002–SC-003 | `plan.md`, `contracts/kpi-inventory.md`, `contracts/reporting-api.md` |
| F11-T05 | FR-015, SC-006 | `research.md`, `plan.md`, `quickstart.md` |
| F11-T06 | FR-020–FR-021, SC-005 | `data-model.md`, `contracts/audit-viewer.md` |
| F11-T07 | FR-016–FR-019, SC-005 | `research.md`, `contracts/authorization-matrix.md` |
| F11-T08 | FR-024–FR-025, SC-005, SC-007 | `plan.md`, `contracts/conditional-exclusions.md` |
| F11-T09 | FR-017–FR-022, SC-005 | `quickstart.md`, `contracts/authorization-matrix.md` |
| F11-T10 | FR-023, FR-027–FR-033, SC-008–SC-010 | `plan.md`, `research.md`, `data-model.md`, `contracts/customer-crm-api.md`, `contracts/authorization-matrix.md`, `contracts/conditional-exclusions.md`, `quickstart.md`, `tasks.md` |
| F11-T11 | FR-025–FR-026, SC-007 | `tasks.md`, `checklists/requirements.md`, formal reviewer gate |
