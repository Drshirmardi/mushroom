# Phase 07 Prescription & Treatment Policy v1

> Task: `F07-T01`
>
> Status: approved product/engineering baseline. Jurisdiction-specific prescribing authority and contraindication classification remain unresolved clinical/legal confirmations; this document does not claim compliance in any jurisdiction.

## Scope and current product model

Phase 07 operates through the existing single operational dashboard. It does not create role-management UI, a second dashboard, multi-dashboard administration, or any Phase 08+ capability. The dashboard remains straightforward for a currently permitted clinical user while the backend independently enforces authorization.

This policy freezes prescription draft, issue, amendment, issuer-authority, and safety boundaries. It does not authorize persistence (`F07-T02`), endpoints (`F07-T03`–`F07-T05`), dashboard/app wiring (`F07-T07`–`F07-T08`), enforcement implementation or detailed warning contract (`F07-T09`), generated-client work (`F07-T10`), or browser verification (`F07-T11`).

## Prescription lifecycle and immutable history

Each prescription has a stable logical identity and an ordered, append-only revision chain.

- A **draft** prescription is normally editable by an authorized editor. Every material content change uses the current revision/version so that a stale save fails rather than silently overwriting another editor.
- **Issue** finalizes one exact draft revision as the issued prescription. The issued revision retains its issuer identity, patient/resource and clinic/tenant scope, authored and issued timestamps, revision number, predecessor link, integrity evidence, and required audit evidence.
- An issued/signed prescription is never destructively overwritten, deleted, or silently replaced. Issuance is a product attestation only; it does not claim statutory electronic-signature compliance.
- A correction creates an append-only successor revision that preserves the original issuance evidence and predecessor relationship. The successor is separately reviewed and issued before it supersedes the patient-facing effective prescription.
- The patient app may display only the permitted effective issued prescription; drafts, internal amendment detail, historical issuance evidence, and audit metadata are not patient self-service data by default.

Exact schema, state names, endpoint forms, and integrity representation belong to `F07-T02` and `F07-T03`.

## Issuance authority and resource scope

Dashboard access alone never grants prescription authority. Issuance requires both:

1. the explicit `PRESCRIPTION_ISSUE` capability; and
2. tenant/resource-level authorization for the relevant clinic, patient, and prescription.

`DOCTOR` is the default authorized issuer role for the current product model. `ADMIN` and `STAFF` do not receive issuance authority merely from their role. Role-to-capability mapping remains extensible so a later authorized change can grant or revoke `PRESCRIPTION_ISSUE` without redesigning prescription persistence or APIs. Phase 07 creates no RBAC-management UI or administration infrastructure.

The existing permitted clinical dashboard workflow may create, edit, review, and issue only when the server verifies the required capability and resource scope. UI simplicity never replaces backend authorization.

## Contraindication and safety-rule boundary

The owner-approved F07-T09 clarification defers automated contraindication and safety-rule evaluation from the current Phase 07 delivery. Phase 07 therefore has no active rule source, warning evaluation, acknowledgement workflow, `NON_OVERRIDABLE` behavior, rule seed, hard-coded classification, or rule-management UI. Prescription issuance must not be blocked merely because no clinical rule source is approved.

The clinician remains responsible for reviewing the patient and deciding what to prescribe through the authorized dashboard. The existing acknowledgement persistence foundation remains inactive; no new acknowledgement is created or evaluated in Phase 07. A later clinical feature may add automated safety rules only with a separately approved trusted medical rule source and its own product, legal, persistence, API, and verification boundary.

`F07-T09` owns explicit issuance authorization, tenant/resource authorization, safe transactional audit, and revision-integrity enforcement. It does not predefine drug databases, contraindication rules, dose ranges, clinical classifications, or speculative rule infrastructure.

## Audit, privacy, and legal boundary

Phase 07 records every prescription issuance with actor/session, controlled action, clinic/tenant/patient/resource/revision identifiers, timestamp, request/correlation identifier, and controlled safe metadata. Issuance fails closed when that audit cannot be recorded in the same transaction. This task does not retroactively expand audit implementation across completed create, edit, read, amendment, export/download, or future disposition surfaces.

Operational logs and audit metadata never contain prescription content, medication/treatment detail, warning free text, amendment free text, names, phones, emails, or unnecessary PII.

Jurisdiction-specific prescribing authority, electronic-signature requirements, issuance/retention rules, patient access to prescription history, and contraindication classifications remain clinical/legal confirmation items. Until confirmed, this engineering baseline is not represented as jurisdiction-specific legal compliance.

## Ownership boundary

This contract freezes only `F07-T01`. It must guide, but never pull forward, persistence, API, UI, generated-client, authorization/audit implementation, or browser-E2E work owned by later Phase 07 tasks.
