# ADR-0024 — Reuse shared billing for paid assessment access

- Status: ACCEPTED under continuous backend implementation and explicit owner commercial/privacy/physician decisions,2026-10-17.
- Phase/task: F12-PJ-P02, one inseparable financial/access shared-contract operation. Supersedes none; extends ADR-0017/0018/0023 additively.

The existing BillingTarget registry already coordinates bank verification, wallet debit and domain fulfillment. Add ASSESSMENT with its explicit purchase reference and immutable purchase/beneficiary grant evidence, rather than introducing another payment intent/provider or assessment engine. Retain separate tariff, financial, consent and clinical lifecycles. Existing dispatcher order requires deferred final payment proof, not premature PAID checks or callback-trusted entitlement.

Reuse purpose-specific PatientConsentRecord for processing and terms. Final privacy withdrawal stops exact bound access without ordinary refund or implicit regrant. Original price/consent/publication evidence stays retained; tariff replacement never reprices existing quotes/receipts. Compensating an unfulfillable captured bank receipt is distinct from refunding a successfully supplied assessment.

All existing attempts keep their null/free context. New commercially governed questionnaires require immutable grant context and cannot be started through the legacy free entry point, including after commercial retirement. One grant/one attempt, same engine and active-attempt concurrency. Shared read predicate covers clinical/history/Home/eligibility/guidance surfaces; new private paid answers are absent from ordinary legacy administrator read surfaces. Actual care-authorized physician review is separate. No new clinical-review-required paid flow or couples checkout until corresponding approved workflow exists.

The change must be implemented and verified together: accepting money before result-route protection or engine integration would create an unusable entitlement or free bypass. No runtime/provider deployment, real medical/legal text, broad role grants or frontend is included. Validate real PostgreSQL receipts, consent/privacy, concurrency, complete owned result flow and old Store/appointment compatibility before acceptance.
