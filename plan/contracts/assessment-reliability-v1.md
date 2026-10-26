# Assessment reliability v1 — additive technical contract

Status: FROZEN for F12-PJ-R01; authority ADR-0018 and explicit owner implementation request. This extends implementation safety without modifying assessment-booking-v1.

## Wire and compatibility

- Existing patient endpoints, permissions and status codes remain. Submission response adds optional-in-OpenAPI `revision` (integer >= 0); runtime always returns it. No new patientId/clinicId request field.
- PUT `/v1/assessment-submissions/{id}` accepts existing `answers` plus optional `expectedRevision` >= 0.
- POST `/v1/assessment-submissions/{id}/submit` accepts an optional JSON body `{ expectedRevision?: number }`; absent body remains valid. Idempotency-Key remains required and max 255.
- A changing command against an older revision returns 409 ASSESSMENT_SUBMISSION_REVISION_CONFLICT with safe currentRevision metadata. Identical draft content returns its current revision without another write; completed identical submit replay returns the original completion even when the supplied revision predates completion.
- Omitting expectedRevision retains serialized last-write-wins draft compatibility; strict stale-edit protection requires upgraded consumers. Future paid/couples endpoints cannot rely on the legacy omission behavior.
- The active-attempt key covers the current individual engine. A future couples contract must introduce its participant/session scope and extend that invariant before reuse; never silently link an existing individual attempt to a couple session.

## Persistence and transactions

- Revision starts at 0; a changed answer snapshot or completion advances it once. Terminal content/revision stays immutable; allowed COMPLETE -> INVALIDATED preserves completion evidence.
- At most one IN_PROGRESS submission per patient/version, enforced by partial unique index. Existing duplicates cause an explicit transactional migration refusal; no automatic data edits.
- Start locks patient/version before active lookup/attempt allocation. Save and submit lock the owned row. Submit also locks the patient's completion-key namespace; a key from another submission always conflicts, even with equal answers.
- Start/save/complete and required audit share one transaction. Resume/get/result/Mezaj sensitive reads are audited before a response. No answer, score, clinical text, name, phone or token enters audit metadata.
- Successful completion creates at most one source-linked MezajResult. Latest Mezaj query only accepts a COMPLETE, non-invalidated source. No expiry rule is invented for Mezaj; booking validity still belongs to its existing policy.

## Acceptance

Concurrent starts return one attempt; concurrent identical submit retries return one immutable completion/result; cross-resource keys fail; stale edits and save/submit races are safe; completed answers cannot change. Foreign patient resources remain concealed. Induced audit failures roll back mutations and fail sensitive reads. Fresh/upgrade/duplicate-active migration tests and existing scoring/eligibility/Mezaj/API/client regressions pass.

Clinical review flags remain informational under the current contract. Approval/release, offering prices, paid access, historical-version resume policy and couples participation remain separate work, not completion claims of this task.
