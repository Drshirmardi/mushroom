# ADR-0031 — Keep program commercial publication separate from clinical definition

- Status: ACCEPTED technical integration under continuous backend authorization and explicit program no-ordinary-refund owner decision,2026-10-17.
- Task: Phase12/F12-PJ-PG02; program-commercial-publication-v1; no existing frozen contract modified.

## Context
PG01 provides reviewed curriculum/service definitions. Prices, exact purchase terms and access periods need independently retained revisions so a new tariff does not rewrite clinical approval or a future purchased snapshot. Custom services already have an authoritative DoctorService fee.

## Decision
Add one immutable commercial publication with explicit price/access/terms/retention and append-only replacement/final retirement. General educational programs use explicit configurable price and duration/perpetual access; custom services reuse current real directory price and specify one delivery through existing TreatmentPlan. Reuse shared integer money rules, actual consent-policy owner release and existing authority/audit/limiter. No patient charge, access grant, provider or automatic clinical activation in this task.

## Alternatives Considered
Mutating PG01 would invalidate exact medical review and future purchases. A second custom fee would diverge from the directory. Reusing a clinical plan as a sale would mix patient records and commerce. All are rejected.

## Consequences and Validation
One retained publication model/forward migration, privileged typed API, exact-purpose CLI opt-in and focused real PostgreSQL concurrency/authorization/upgrade/clock/audit checks plus generated compatibility. Actual content/legal/retention values remain owner-controlled release data; later shared entitlement and assigned clinical delivery require their own acceptance. Revisit only if a new product/service access model is explicitly approved.
