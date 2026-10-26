# Mizaj draft authoring and scoring preview v1 — FROZEN

Phase12/F12-PJ-M01, ADR-0035. Owner authorizes working foundations now and final clinical inputs later (2026-10-18). Dependencies R03/G01/R04 accepted. Backend-only preparation; this contract does not amend frozen patient/payment/protocol contracts.

## Scope

Reuse AssessmentVersion DRAFT JSON storage, consecutive versions, current ADMIN ASSESSMENTS_MANAGE authorization, clinic routing, transaction/audit and canonical content hash. Add schemaVersion2 draft-only DIMENSION_RANK/v1 configuration, deliberately unsupported by v1 publish validation and all patient/payment paths. Existing schemaVersion1 authoring/publishing/scoring is unchanged. No migration, provider, default permission, legal policy, actual patient input or physician approval is created.

## Draft structure

2..8 unique dimensions (id/title), 1..100 total SINGLE_CHOICE questions in 1..20 sections, 2..10 unique options/question, explicit required boolean and bounded labels. Each option has an explicit scores object with a subset of known dimensions and integer weights 0..1000; empty scores mean neutral, never missing evidence. Unknown properties/IDs, negative/fractional/unsafe weights, mixed scalar score/range syntax and duplicate section/question/option/profile IDs are rejected. minInformativeAnswers is an explicit integer 1..question count. Every dimension must have a positive option; at least the configured minimum number of questions must be capable of contributing. Profiles cover exactly every ordered distinct pair plus one single-dimension profile per dimension (n²); second=null denotes absence of second evidence, not a repeated primary. Profile copy is bounded plain text (title/summary/strengths/attentionPoints/nextStep), reviewState=UNREVIEWED and educationalOnly=true. None of this is clinical approval or a measure of scientific confidence.

## APIs

- GET /v1/admin/assessments/draft-presets/mizaj: returns an in-memory clone of the owner-designated original CSV 11-question/44-option candidate and 16 proposed educational profile texts. Does not silently restore the three extra DOCX options. Exact CSV hash and draft/scoring limitations travel in structure metadata. No source file paths or source contact details. This read creates no DB row.
- Existing POST/PATCH/duplicate/get/list author draft v2 as DRAFT only. POST publish rejects v2 with existing ASSESSMENT_STRUCTURE_INVALID. PATCH cannot convert a saved dimension draft to v1; a separately specified conversion tool is outside M01. A scalar definition carrying the DIMENSION_RANK marker is rejected.
- POST /v1/admin/assessments/:id/scoring-preview: expectedContentHash, syntheticAnswersOnly:true, answers object. Requires owned active-clinic DRAFT v2 and exact current hash; a changed hash/state produces ASSESSMENT_PREVIEW_CONFLICT (409). Unknown answers, missing required answers or invalid option IDs produce ASSESSMENT_ANSWERS_INVALID (422). No patient/submission/price/approval identifiers accepted. Shared row lock stabilizes a preview against draft update/publication. Return no-store response with exact source hash, DIMENSION_RANK/v1 identity, dimension totals, informative answer count, explicit INSUFFICIENT_DATA/PRIMARY_TIE/SECONDARY_TIE/SINGLE/PAIR, unique primary/secondary where justified, tied dimension IDs and selected unreviewed profile or null. Equal totals are never resolved by dimension order. Positive runner-up only; all-zero answers never create a result. SECONDARY_TIE retains primary but has no selected composite profile. No percentage confidence, diagnosis, therapy, auto service recommendation or joint compatibility conclusion.

Preview writes only ASSESSMENT_DRAFT_PREVIEWED metadata audit bound to source and actor/session; no answers, scores, copy or answer hash in logs/audit/DB. Audit failure withholds the response. Preview does not create a submission, persist a result, change content approval, publish, charge, grant access or become a patient result. Fixed preset is draft proposal, never a production seed.

Compatibility clarification (pre-acceptance review): the current dashboard scalar editor reconstructs schemaVersion1 and defaults absent scalar weights to zero. The family guard prevents the old editor from silently discarding vector weights; the new draft editor is API-only.

## Acceptance

Real PostgreSQL HTTP create/read/update/duplicate and exact-hash preview; ADMIN versus unauthenticated/PATIENT/DOCTOR, foreign clinic/missing source, stale hash, published/retired and v1 denial; malformed/unknown/oversized input; neutral/insufficient/all rank ties/single/pair and 16 profile coverage; v1 publication/scoring regression; audit failure and absence of answer/result/payment/approval persistence; current OpenAPI/generated client/types and scoped review. No frontend or end-to-end patient release claim.
