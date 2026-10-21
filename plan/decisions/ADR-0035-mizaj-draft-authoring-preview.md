# ADR-0035 — Mizaj draft authoring and preview before clinical release

- Status: ACCEPTED (technical preparation only)
- Date: 2026-10-18
- Authority: owner requests working foundations now, resolving final content/clinical inputs later; existing physician-only publication decision retained.
- Phase/task: Phase12/F12-PJ-M01
- Supersedes: none

## Context

Owner-designated CSV has 11 questions/44 options; original DOCX has three additional options but owner confirms the supplied questions remain the reference. Candidate scoring is unvalidated. Patient scoring/protocol/guidance/commercial SQL currently pins WEIGHTED_SUM/v1. Replacing that algorithm implicitly would invalidate accepted clinical and financial evidence. The existing AssessmentVersion draft JSON can hold proposed definitions without a new engine or persistence table.

## Decision

Add bounded schemaVersion2 draft authoring and admin-only synthetic scoring preview under the existing assessment module. DIMENSION_RANK/v1 explicitly sums independent configured dimensions, handles insufficient data and ranking ties, and selects one of n² unreviewed display profiles only when evidence gives a unique single/pair. Include a 44-option candidate preset and 16 bounded proposed educational result texts, without importing potentially harmful source claims or pretending they are approved. Keep v1 publication and all patient, paid, couple and care contracts unchanged; v2 publishing fails closed. Reuse the generic calculation in a later separately frozen runtime integration rather than creating a second assessment lifecycle.

## Alternatives considered

- Encode four scores in one scalar: obscures meaning/provenance and does not solve ranking/ties.
- Enable paid results with the unvalidated draft: violates current physician and payment-to-entitlement boundaries.
- Wait for all final source/legal inputs before providing authoring: unnecessary; a bounded draft can already be configured and exercised.

## Consequences and validation

No schema migration or approval bypass. Existing v1 history remains readable and no patient records are used in preview. Draft editor API is useful before final clinical inputs; the dashboard UI and clinical/runtime algorithm rollout remain separate. New endpoint/preset must have authorization, exact-hash concurrency, no-store, metadata-only atomic audit, strong structure bounds, real isolated PostgreSQL and focused domain/legacy/OpenAPI tests. A later runtime task must update every relevant SQL/provenance/protocol/payment boundary together and obtain actual qualified protocol/content approval before patient use.
