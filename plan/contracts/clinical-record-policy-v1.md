# Phase 06 Clinical Record Policy v1

> Task: `F06-T01`
>
> Status: approved product/engineering baseline. Jurisdiction-dependent compliance confirmation remains open; this document does not claim legal compliance in any jurisdiction.

## Scope

Phase 06 delivers a real persisted clinical workspace for encounters, clinical notes, diagnoses, allergies, conditions, medication statements, treatment/visit information, and patient-facing summaries. In-scope dashboard forms become real workflows in their owning Phase 06 tasks; mock behavior is not retained where the roadmap requires persisted clinical work. This policy does not create Phase 07+ functionality or turn Phase 02 self-reported intake into a clinical fact.

Authorized dashboard users receive a straightforward create, edit, and save workflow. The server preserves append-only, auditable history beneath that workflow.

## Flexible editing and immutable history

Each clinical resource has a stable logical identity and an ordered revision chain.

- **Current effective revision**: latest revision used by authorized clinical dashboard users.
- **Latest signed revision**: latest revision attested by an authorized signer.
- **Current published patient revision**: latest approved/published patient-safe content.

Those references may differ. A later authorized clinical edit may be current for staff while the patient continues to see the last approved/published summary.

- Drafts may be edited normally.
- Saving an edit to signed/finalized content creates a later revision and makes it the current effective content for authorized clinical operations; it never destructively overwrites the signed revision.
- Every changing save supplies an expected revision/version. A stale save fails instead of silently overwriting another editor.
- The dashboard defaults to current effective content and exposes revision history only to users with appropriate authorization. Revision mechanics must not create needless operator burden.

The revision policy applies to encounter content, clinical notes, diagnoses, allergies, conditions, medication statements, treatment/visit information, and patient-facing summaries. Exact schema and API forms remain owned by `F06-T03` onward.

## Signing and finalization

- Signing attests to one exact revision, not an endlessly mutable logical record.
- A signed revision is immutable to direct edit; an authorized later edit creates its successor.
- Signing retains author and signer identities, authored and signed timestamps, resource/revision identifiers, clinic/tenant scope, predecessor relationship, and an integrity value for canonical signed content.
- Saving, signing, and patient publication are separate operations. Saving never publishes; signing never exposes clinician-private content.
- A later revision may remain draft, be signed as the next final revision, and/or be separately approved/published as patient-safe content.
- A system-recorded signature is a product attestation, not a claim to satisfy statutory electronic-signature requirements pending legal confirmation.

## Amendments, states, and deletion

- Signed content is never directly edited, hard-deleted, or removed through ordinary dashboard operations.
- An edit to signed content creates an append-only successor, recording its predecessor, author/signer when applicable, timestamps, revision number, required reason category, integrity evidence, and publication decision.
- Operational removal uses preserved states such as `SUPERSEDED`, `INACTIVE`, or `VOIDED`; it never destroys finalized history.
- An amendment/addendum preserves the original revision. Protected clinical reason text belongs in the amendment record, while audit metadata receives only identifiers and controlled categories.

## Configurable authorization and tenant scope

Clinical authority requires explicit configurable permissions plus tenant/resource-level authorization. Role alone never grants access, including for `ADMIN`, `STAFF`, or `DOCTOR`.

The approved permission concepts are:

- `CLINICAL_RECORD_VIEW`
- `CLINICAL_RECORD_EDIT`
- `CLINICAL_RECORD_SIGN`
- `CLINICAL_RECORD_AMEND`

Role-to-permission assignment stays configurable. The product owner may grant broad clinical workspace capability to selected dashboard users, including configured `ADMIN`, `STAFF`, and `DOCTOR` accounts, without bypassing least privilege. For every action, the server verifies both the permission and the actor's authorized relationship to the patient/resource within the correct clinic/tenant. Dashboard access, a role, or broad patient-list access is insufficient.

## Patient publication and visibility

Patient-facing information derives only from the current approved/published clinical revision.

| Content | Patient visibility |
|---|---|
| Draft clinical record | Never visible. |
| Full/private clinical note and internal observation | Never visible by default. |
| Signed clinical revision | Not automatically visible. |
| Patient-facing visit summary | Visible only after explicit approval/publication. |
| Treatment plan and patient instructions | Visible only when included in published patient content. |
| Diagnosis, allergy, condition, medication statement | Visible only when explicitly approved/published. |
| Audit events and audit metadata | Never available through patient self-service. |

An edited or signed revision cannot accidentally expose clinician-private content. A published correction replaces effective patient-facing content only after its own approval/publication; historical evidence remains restricted to authorized users.

## Audit and privacy

Audit all sensitive clinical reads and writes, including read, create, edit, revision creation, sign, amend, supersede, inactivate, void, publish, export/download, legal-hold changes, and future disposition attempts.

Each event records only actor/session, action, patient/resource/revision identifiers, clinic/tenant scope, timestamp, request/correlation identifier, and safe state or controlled reason-category metadata. Operational logs and audit metadata must never contain clinical values, note text, diagnoses, medication values, treatment details, amendment free text, names, phones, emails, or unnecessary PII.

The sensitive action and its required audit are one transaction. A sensitive read/write fails closed if the required audit cannot be recorded. Existing self-reported intake keeps its provenance until reviewed by workflows owned by `F06-T02` and `F06-T06`.

## Retention, account deletion, and legal hold

The configurable engineering default is **10 years after the last clinical encounter** for signed/finalized clinical revisions, amendments, publication evidence, and required clinical access audits. It is an internal conservative default pending jurisdiction-specific approval, not a legal-compliance assertion.

The draft planning default is **90 days after last modification**, followed by a **90-day read-only recovery archive** before any disposition decision. Phase 06 implements no automatic destruction, anonymization, or purge of finalized clinical records.

- Account deletion disables account access but does not erase retained clinical history or required audit evidence.
- Any future anonymization/disposition must be irreversible, preserve required record integrity, verify no legal hold, and record a safe disposition audit event.
- A legal hold suspends deletion, anonymization, and destructive archival for its scope. Hold create/release/change and disposition attempts are audited; a hold grants no extra viewing rights.

## Jurisdiction-dependent confirmation requirements

The following remain legal/compliance confirmations, not product claims:

1. Retention duration/start event, including minor-record rules.
2. Patient access to full notes, amendment history, summaries, and audit information.
3. Permitted withholding or delayed patient publication.
4. Electronic-signature, credential, timestamp, integrity, and attestation rules.
5. Legal-hold authority, notice, release, and preservation obligations.
6. Account deletion, anonymization, storage location, cross-border transfer, and destruction.
7. Guardian/proxy access, deceased-patient records, breach response, and data-subject requests.

Until confirmed, no automated disposition is enabled and no engineering default is represented as jurisdiction-specific legal compliance.

## Ownership boundary

This contract freezes `F06-T01` policy only. It does not authorize implementation ahead of owning tasks: reviewed self-report conversion (`F06-T02`), migration/audit schema (`F06-T03`), encounter/note/reconciliation behavior (`F06-T04`–`F06-T06`), patient/dashboard/app surfaces (`F06-T07`–`F06-T10`), or shared contract/client and end-to-end verification (`F06-T11`).
