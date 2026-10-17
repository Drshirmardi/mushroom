# ADR-0021 — Immutable educational guidance derived from existing content

- Status: ACCEPTED within explicit backend implementation authorization and owner-approved physician boundary (2026-10-16).
- Phase/task: Phase12 / F12-PJ-G01. Supersedes none.

## Context

Article currently has mutable text and administrator publication. This cannot attest clinical review of exact result guidance, and source edits must not inherit physician approval. Existing DoctorProfile, ClinicalClinicAccess and clinical-sign grants provide the owner-approved authority boundary.

## Decision

Reuse Article as editor/source, add one immutable snapshot/version aggregate with provenance and educational safety metadata, and hash-bound physician approval/final revocation. Preserve old Article behavior without relabeling it approved. New guidance patient projection checks approved state and present approving physician authority. No new role/grants, content editor, assessment engine or diagnosis system. New result mappings will pin these exact versions under a subsequent contract.

## Alternatives considered

An approval flag on mutable Article would silently approve future changes. A second editable content subsystem duplicates Article. Store commercial approval does not establish qualified medical authority. All rejected.

## Consequences and validation

One additive migration, explicit new APIs and generated client. Retained snapshots increase storage but provide exact reproducibility. Actual reviewed sources/content, professional credentials and legal retention remain operator responsibilities; no scientific validity invented. API/SQL authorization, snapshot immutability, races, audit rollback and fresh/populated database proofs required. Revisit when clinical review authority or content governance changes; existing published snapshots must remain historically attributable.
