# Patient Journey backend implementation map

Owner authorization: 2026-10-16, explicit implementation request following read-only architecture/gap verification and the comprehensive patient journey requirements. Use the active Phase 12 registry; descriptive B01–B13 labels from the brief are not new repository phases. One agent, backend-first, reuse existing modules. No push, deploy, live provider or persistent database migration is authorized.

## Current scope and task routing

- [x] F12-PJ-R01 — technical assessment concurrency/revision/idempotency/audit correction. PJ-R01 DONE/released after real PostgreSQL checks, generated contracts, consumer type compatibility and main-agent review. Exact scope: ADR-0018 and assessment-reliability-v1; evidence in Phase12 log. No full individual/couples or clinical-release acceptance follows from this correction.
- [ ] F12-PJ-R02 — owned attempt discovery/historical questionnaire retrieval and result provenance, after R01 plus approved retirement/resume policy. Required review/publication behavior must be defined; requires a new frozen contract before claim.
- [ ] F12-PJ-J01 — derived Patient Journey/Next Action API, after assessment summary/action contract freeze. Reuse onboarding, eligibility, appointments, billing intents and published follow-up; no journey persistence table. Exact DTO/action priority must be reviewed before claim.
- [ ] Offering and result release — versioned individual/couples commercial offerings, free/PRE_START/PRE_RESULT_UNLOCK, immutable agreed price/rights and algorithm identity. Freeze pricing/release/reviewer/algorithm/eligibility decisions first; no numeric or clinical defaults are invented.
- [ ] Digital entitlements — extend accepted ADR-0017 BillingIntent/target registry, wallet/payment/refund machinery for approved typed assessment/program targets. Do not rebuild PaymentIntent under another name. Requires offering/beneficiary/consumption/refund rules and compatibility contract.
- [ ] Couples participation/result — independent identities, single-/two-device authorization, invitation, independent versioned consent, private owned answers, exact joint-result input/algorithm versions and revocation. Requires invitation/age/consent/disclosure/retention/algorithm approval; reuse assessment engine.
- [ ] Approved guidance — immutable educational revisions/provenance/qualified approval/safety boundaries and exact result-to-content/service mappings. Requires clinical content and reviewer decisions; do not reuse Store content approval as clinical authority.
- [ ] Programs/recommendations — paid ready programs and doctor service-order delivery using existing treatment/clinical publication plus entitlement. Requires clinical/service delivery and refund policies; preserve therapy/education boundaries.
- [ ] Consultation context/API acceptance — authorized assessment summaries for assigned care, existing booking/availability/prepaid billing and text consultation, then complete backend acceptance. Doctor permissions, review/release and service-specific eligibility need approval. Voice/video remains deferred.

R01 is accepted and its claim is released; no next task is started. Next candidate J01 can prepare/freeze its additive summary/action contract under the existing owner authorization before normal claim; R02's retirement policy needs explicit resolution. Later entries require official task scopes/contracts/dependencies before their own claim. Do not label B01 or the entire backend DONE because R01 is accepted. Phase12 backup/secrets/observability/provider gates stay independent.

## Required evidence for each future task

Domain acceptance, typed API/authorization/resource/clinic boundaries, immutable/additive migration compatibility, actual PostgreSQL transaction/concurrency tests, safe audits, official OpenAPI/client freshness, current consumers' type compatibility, combined diff review, phase evidence and isolated task commit. User interfaces are not implemented under this backend track; complete product/browser acceptance remains separate.
