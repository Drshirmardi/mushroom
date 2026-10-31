# ADR-0044 — ADMIN educational assessment offerings

Date: 2026-10-30
Status: Accepted; owner-final software workflow implemented and verified2026-10-31. Live deployment is separate.

The owner supersedes physician-approval prerequisites for ordinary educational
assessment offerings, including paid and couples modes. New publication must
record ADMIN provenance, not fabricate a professional review. User consent,
mutual result disclosure, exact questionnaire binding, clinic ownership and
verified positive-value payments remain independent requirements.

Offerings own their processing/terms/disclosure documents; their lifecycle must
not retire other offerings' documents. Existing clinic-wide policies remain
unscoped and retain their unique-active rule. The first migration introduces
nullable offering ownership with same-clinic/locale/purpose guards; it does not
activate new flows or modify historical records.

Subsequent lanes must introduce explicit ADMIN-vs-legacy publication provenance,
atomically publish inline documents, migrate paid/free access and SQL guards,
and connect both UIs. No physician guard may simply be disabled globally.
Joint 11+1 output compares two owned results/charts with optional authored pair
text; no derived compatibility score or complete text matrix is required.

Contract: ../contracts/assessment-admin-offering-v2.md.

Implementation clarification: retained ADMIN publication evidence uses assessment_admin_publications, separate from legacy physician-publication rows. A dedicated exact source/doc/actor guard protects it. Downstream purchase/access must explicitly support this authority before becoming usable; do not insert fake legacy review rows to reuse old FKs.

Owner-final update: see ADR-0045-entry-public-acquisition.md and phase12 acceptance. New FREE attempts are initial-entry-only; public acquisitions are paid. Historical four-mode data remains retained.
