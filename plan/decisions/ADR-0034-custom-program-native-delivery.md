# ADR-0034 — Bind shared custom payment to assigned reviewed native treatment

- Status: ACCEPTED technical implementation under continuous owner authorization and existing physician-only publication/no ordinary program refund decisions;2026-10-18.
- Phase12/F12-PJ-PG05; custom-program-native-delivery-v1.

## Context

PG04 retains selected real service and request-specific consent without charging or chart access. Shared PROGRAM payments and native treatment/tasks/adherence/progress already exist. Native plans are mutable and generic clinic readers are broader than assigned paid care. Charging before protecting these paths would leave an unsafe incomplete delivery lifecycle.

## Decision

Extend existing ProgramPurchase/ProgramAccessGrant with explicit custom request/care provenance. Add one immutable clinical version binding to actual native content and exact intake/current care; qualified assigned physician reviews before native activation. New drafts replace whole content rather than mutating issued advice. Protect bound generic reads/writes and task operational evidence; keep unbound behavior. One PROGRAM target dispatches explicitly by exact snapshot kind; no duplicate payment/treatment infrastructure.

## Consequences

Payment and clinical issue are separate proofs. Privacy withdrawal stops clinician authority without financial cancellation or deleting the patient's issued record, following existing native medical-record semantics. Explicit clinical revocation stops active delivery; no silent physician reassignment. Custom checkout is enabled only after the entire shared/native boundary batch passes actual PostgreSQL/legacy/upgrade/generated/main-review gates. Clinical/legal/retention content and real provider acceptance remain release dependencies.
