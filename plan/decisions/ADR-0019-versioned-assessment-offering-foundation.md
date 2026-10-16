# ADR-0019 — Versioned assessment offering foundation

- Status: ACCEPTED for technical draft infrastructure only, 2026-10-16.
- Authority: explicit owner instruction to implement the full backend continuously, preserving clinical/product decisions in the comprehensive brief. Phase12 / F12-PJ-O01; supersedes no existing ADR.

## Context

Individual and couples assessments need independently versioned commercial configuration, pinned questionnaire/algorithm references and agreed payment points. Existing AssessmentVersion owns questions/scoring; BillingIntent and its target registry already own payment. An approximate 10–15-question description does not approve questions/weights, a sixteen-type taxonomy, age/consent, refunds or clinical interpretation.

## Decision

Add one append-only AssessmentOfferingVersion model referencing the existing same-clinic questionnaire. Each commercial edit creates the next immutable version under a stable key/kind/locale. ADMIN with explicit active-clinic membership can create/list/read/retire drafts. Commands are idempotent and audited atomically; database locks/constraints protect version allocation, type stability and immutable content. Keep integer rial amounts/currency explicit and allow incomplete draft configuration. No seeded price or clinical policy.

Status is restricted at both database and API to DRAFT/RETIRED in this slice. Readiness always reports the missing clinical/owner approval and unified access/payment integration gates. There is no publish/checkout/participant/result-release endpoint in this foundation. Those require subsequent contracts and forward-only changes. ADMIN configuration is not qualified medical approval. No parallel questionnaire engine, payment model, journey table or generic workflow framework.

## Alternatives Considered

- Put commercial flags on AssessmentVersion: rejected; clinical questionnaire immutability must not force price edits or couple-vs-individual duplication.
- New payment provider/PaymentIntent: rejected; reuse accepted BillingIntent registry in the next shared-payment extension.
- Activate with guessed defaults: rejected; unknown policies remain null and activation fails closed.

## Consequences and impact

One additive table/migration, assessment offerings Nest module, strict versioned admin APIs, existing clinic membership/permission checks and audit, generated contracts and focused disposable PostgreSQL verification. Existing individual engine/routes and Store/consultation payment lifecycles remain unchanged. New digital purchasing/couples/guidance are still incomplete until their own gates pass. No persistent migration, production, provider or frontend work.

## Validation and revisit

Fresh/upgrade replay, schema drift, same-clinic FK, immutable rows/retirement, direct-SQL publication refusal, concurrent version allocation/replays, changed-key conflicts, ADMIN/membership/resource denial, bounded lists, explicit draft blockers, audit rollback and old journey/assessment regressions. Revisit when actual algorithms, eligibility/consent, commercial/refund/retention definitions and result-release authority are approved; only then enable publication through a later reviewed contract/migration.
