# ADR-0036 — ADMIN publication of educational11+1 assessments

- Status: ACCEPTED by explicit owner instruction,2026-10-21.
- Phase/task: Phase12/F12-FE01, existing CLIENT-INTEGRATION /root continuation.
- Supersedes: general/free11+1 physician gate introduced in the2026-10-21 continuation. Existing commercial physician-review contract in ADR0022 is unchanged.

## Context

Owner explicitly states all stages of the ordinary educational assessment must be performed by ADMIN and rejects a physician-account dependency. The previous continuation extended the commercial protocol-review requirement to free11+1 publication/start/save/submit, although technical publication and professional review are distinct. It also mislabeled new results as physician-reviewed.

## Decision

Existing authorized ADMIN creates, edits, previews and publishes educational schema3 questionnaires. Publication validates the complete11main questions, memberships,16result profiles and6pair follow-up cases, existing same-clinic/lifecycle/unique-version/audit rules. It does not require a physician protocol review or processing-policy reference. No professional approval is invented and no doctor role is granted to ADMIN.

Free patient progression depends on the exact ADMIN-published immutable version and existing active self-access; retired owned attempts can resume. It preserves server-selected at-most-one follow-up, revision validation and idempotent completion. Snapshot reviewState is ADMIN_PUBLISHED, with existing version/hash provenance, not PHYSICIAN_REVIEWED. Publisher identity is retained in the version/audit and not duplicated into patient result JSON. Existing historic snapshots/reviews are never rewritten.

## Consequences and scope

Dashboard readiness reports authored structural completeness, with final server validation on publication. No physician-only controls or consent UUIDs appear in the11+1 workflow. Legacy commercial/paid guidance/couple authority stays governed by its existing separate contracts and is not newly enabled for11+1. No new migration is required; previously deployed optional review compatibility remains append-only history support.

## Validation

Source review of publication authorization/validation, runtime access, result provenance and UI. Regression source covers ADMIN publication without physician review/processing policy, missing-case rejection, DOCTOR publication denial, private question projection, follow-up progression, idempotent result and retired resume. Tests/types/lint/build/browser/Graphify remain owner-deferred; implementation is not final acceptance.

## Revisit trigger

Owner explicitly requests paid/couple11+1 delivery or professional diagnostic approval; resolve those contracts separately without treating administrative publication as clinical evidence.
