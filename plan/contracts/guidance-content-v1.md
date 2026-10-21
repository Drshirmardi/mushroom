# Educational guidance content v1 — FROZEN

Owner authority: 2026-10-16 explicit implementation and approval of the proposed physician-only publication boundary. Task F12-PJ-G01; Phase12, ADR-0021. Additive contract; legacy Article routes/contracts remain unchanged and confer no medical approval.

## Lifecycle and safety

One retained GuidanceContentVersion captures the exact same-clinic existing Article title/summary/body, locale, kind, external provenance and safety boundaries. Immutable consecutive versions per article/locale. SHA256 binds canonical complete snapshot. Source edits/publication do not change this snapshot or propagate approval. No diagnosis, individualized therapeutic diet, scientific-validity claim, external source fetching or generated medical text. Kinds: GENERAL_EDUCATION, DIETARY_EDUCATION, TEMPERAMENT_INTERPRETATION, PERSONALITY_DESCRIPTION. All are educational only; physician must explicitly attest educationalOnly and noDiagnosisOrTherapeuticDiet=true against the exact contentHash. Provenance is supplied by author and reviewed by physician, not automatically verified.

DRAFT -> APPROVED -> REVOKED; DRAFT -> REVOKED; no restoration or deletion. ADMIN content manager with explicit active clinic membership creates drafts/revokes drafts. DOCTOR with linked active published DoctorProfile, explicit active same-clinic membership, current database DOCTOR role and current clinical-sign grant may review/get/list/approve/revoke. Active owned session required; ordinary ADMIN cannot approve or revoke approved content. Approval evidence includes physician/profile/user/session/hash/time; final revocation evidence includes actor/session/time. Concurrent approval/revocation serializes; audit failure rolls back. Repeat approvals are idempotent for same hash/status; revoked never republished. Permission changes and reviewer profile/membership deactivation suppress new patient delivery until authority is restored; final content revocation never restores.

Safety metadata required: intendedAudience, limitations, contraindications (array may explicitly be empty), seekProfessionalCare. At least one HTTPS provenance reference with label/url/accessedOn (YYYY-MM-DD actual calendar date), optional sourceVersion. No clinical validity inferred from these labels. Text returned as plain content; clients must not execute untrusted HTML.

## API

- POST /v1/admin/guidance-content/versions, Idempotency-Key required (8..200 safe ASCII): articleId, locale (bounded BCP47-like), kind, provenance[1..20], safety. Captures server-owned Article text; client cannot supply text/reviewer/status. Canonical same-key replay returns original snapshot even if source changed; changed command409. Versions serialize by article/locale.
- GET /v1/admin/guidance-content?page&pageSize&articleId&status, GET /:id. ADMIN content manager+explicit clinic. Page1..10000, size1..50.
- POST /v1/admin/guidance-content/:id/revoke: only DRAFT or repeat already-REVOKED; cannot revoke APPROVED.
- GET /v1/clinical/guidance-content (same paging/filters), GET /:id. Qualified physician only, no patient records included.
- POST /v1/clinical/guidance-content/:id/approve: contentHash (64 lowercase hex), educationalOnly:true, noDiagnosisOrTherapeuticDiet:true.
- POST /v1/clinical/guidance-content/:id/revoke: qualified physician, final and idempotent.
- GET /v1/patients/me/guidance-content/:id: PATIENT+content:read:self, existing owned profile in active clinic. APPROVED and presently qualified approving physician only; otherwise404. Exact content/provenance/safety/version/hash/approval time, no private reviewer/account/session IDs. No result association or patient-specific advice inferred by this read.

All routes private,no-store, explicit projections, transactional metadata-only audits; no text/provenance in operational logs. 400 DTO,403 scope/authority,404 foreign/unavailable source/content,409 lifecycle/hash/idempotency conflict,422 inconsistent metadata. Lists bounded and counted in repeatable-read transaction. DB independently enforces retained immutable snapshots, same-clinic references, consecutive versions, status/evidence shape and qualified active physician on approval/revocation. No clinical grants or real content seeded.

Acceptance: real PostgreSQL HTTP tests for each authority gate, malformed metadata, exact hash, concurrent create/approve/revoke, replay after source edits, final withdrawal, foreign clinic, direct SQL constraints, atomic audit failure; fresh migration replay and populated legacy preservation; generated client/consumer compatibility. Later result mapping and assessment clinical review are independent contracts, not completed here.
