# ADR-0022 — Append-only exact assessment protocol review

- Status: ACCEPTED under explicit backend implementation and qualified physician approval authorization,2026-10-17.
- Phase/task: Phase12/F12-PJ-O02. Supersedes none.

## Context

Existing administrator questionnaire publication establishes an immutable technical source, not professional review of questions/scoring or the consent under which new paid assessments will process data. G01/G02 already review educational text and its band mapping. Rebuilding the assessment engine or treating those approvals as questionnaire review would lose the exact authority/source boundary.

## Decision

Add one append-only questionnaire protocol review ledger against the existing immutable version and explicit assessment-processing consent, using existing technical scoring identity and shared physician authority/SQL/session rules. Physicians preview exact source then append APPROVED/WITHDRAWN decisions with source/consent hashes, revision and idempotency. ADMIN may prepare/read, never approve. Latest current qualified approval is a prerequisite for future paid publication; no commercial activation follows from review alone. Existing canonical questionnaire hash implementation is shared, with unchanged semantics.

## Alternatives and consequences

A mutable boolean on published questionnaires loses retained decisions and conflicts with frozen source immutability. Another questionnaire draft/scoring system duplicates existing infrastructure. A full generic clinical approval/state-machine framework is unnecessary; a small immutable decision ledger is sufficient. Source, clinical content, protocol review, commercial price and payment entitlement retain distinct lifecycles while reusing authority and existing references. Operator-provided legal content and qualified human evaluation remain required, not generated scientific validity.

## Validation/revisit

Real PostgreSQL sequence/idempotency/review-withdrawal/source/consent/authority/audit and migration compatibility gates plus API/client checks. Revisit when supporting a new versioned algorithm, validated diagnostic use or different professional approval authority; no silent reinterpretation of existing approvals.
