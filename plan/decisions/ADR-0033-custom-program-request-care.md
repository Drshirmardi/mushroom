# ADR-0033 — Select a named custom service and retain request-specific patient care authority

- Status: ACCEPTED technical foundation under continuous owner authorization and existing physician-only health approval boundary,2026-10-18.
- Task: Phase12/F12-PJ-PG04; custom-program-request-care-v1.

## Context

Custom professional service definitions and exact directory-priced publications exist. Educational access neither assigns professional care nor authorizes reading a patient's chart. Existing native TreatmentPlan/tasks/progress already deliver clinical plans, but their generic mutable workflow must be explicitly bound to future paid assigned requests before custom charging.

## Decision

First retain a patient's exact selected publication/named service physician and versioned request-specific care consent. Reuse PatientConsentRecord, actual directory/G01 professional authority, sessions/audit/persistent limiter and WalletCommand aliases. Request/care state is derived, no duplicate financial or clinical lifecycle. No new clinical chart access or custom payment is activated by this foundation. Follow with a separate inseparable shared-payment/native-reviewed-delivery batch; protect bound generic clinical paths and physician issuance there, preserve legacy unbound behavior and do not invent therapeutic rules.

## Consequences and validation

Two retained ledgers provide explicit assignment and consent provenance/withdrawal/renewal without an appointment requirement or a second treatment engine. Missing actual legal/clinical data remains an explicit release gate. Automatic doctor reassignment is unavailable; a selected request cannot silently become another service or physician. Verify actual scoped identities/source/legal changes/aliases/concurrency/SQL/audit/fresh/upgrade and unchanged ready/shared-payment consumers before task commit. Later delivery must meet the owner's no ordinary refund and exact qualified publication rules, not infer medical suitability from payment.
