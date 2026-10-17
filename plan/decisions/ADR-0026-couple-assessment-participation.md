# ADR-0026 — Bind independent couple consent to an exact assessment context

- Status: ACCEPTED technical implementation under continuous backend authorization,2026-10-17.
- Task: Phase12/F12-PJ-C03; couple-assessment-participation-v1. Does not modify accepted C01/P02/C02/O03 contracts.

Linking accounts is separate from processing medical responses or sharing derived joint education. Retain an immutable exact two-person/source/tariff/joint-protocol context, then let each independently authenticated participant explicitly bind their existing P02 processing consent plus context-specific joint disclosure. Reuse PatientConsentRecord for the underlying processing policy; do not invent a global partner-sharing permission or duplicate medical consent engine.

Consent and availability are derived from retained evidence. Final privacy withdrawal remains possible without a current sale/review/policy, never implies a financial refund, and never deletes or shares individual responses. Build this prerequisite before the separate shared-payment two-beneficiary/existing-engine integration; readiness alone grants no paid service or partner data access.
