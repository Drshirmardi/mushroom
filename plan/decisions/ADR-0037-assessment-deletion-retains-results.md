# ADR-0037 — Delete assessment availability, retain patient results

- Status: ACCEPTED by explicit owner instruction,2026-10-21.
- Task: F12-FE01, current CLIENT-INTEGRATION /root.

## Decision

Assessment deletion is a terminal DELETED lifecycle transition, not removal of historical rows. ADMIN can delete draft, published or retired versions using the existing exact-hash/clinic/permission/audit operation. Repeated identical delete is idempotent. Management lists/get/edit/duplicate exclude deleted versions; published-only starts, commercial activation and source selection cannot newly use them. Completed submissions, Mezaj results, source structure/hash and existing retained references never cascade-delete. Patient completed result/history/provenance and its exact questionnaire remain readable. In-progress answers are retained, but further save/submit and resume after deletion stop.

Required booking-policy references to the deleted source are cleared to NOT_REQUIRED within the same transaction, counted in audit metadata. This avoids reserving access behind a deleted questionnaire. New required assignments share-lock the source so they serialize against deletion. All FK Restrict protections remain. SQL permits only status/updatedAt to change during deletion, and prohibits resurrection or physical deletion of tombstones. Existing version uniqueness/history remains intact.

## Consequences

Deleted source rows consume storage to preserve result interpretation and provenance; this is intentional. Deleting a questionnaire does not revoke completed patient results or erase medical/financial history. Existing purchase/result authority and consent guards remain separately effective; no paid entitlement is invented. Admin reporting retains historic results even though the authoring picker excludes deleted questionnaires.

## Validation

Additive local migration20261021120000 applied successfully after confirming only this migration pending on loopback5432. Prisma/client source generation completed. Isolated regression source updated for retained source, exact hash/auth/clinic, idempotence, list hiding, SQL immutability, completed-result/history/questionnaire survival and denied new starts. All tests/types/lint/build/browser/Graphify remain owner-deferred; no runtime PASS or actual assessment deletion claimed.
