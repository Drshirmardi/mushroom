# Phase 06 Contract Adoption

This maps existing Phase 06 capabilities. Endpoint paths, request/response schemas, clinical-note
fields, audit schema, concrete permission assignments, and client types remain unfrozen. The
approved `F06-T01` policy is authoritative at
[`plan/contracts/clinical-record-policy-v1.md`](../../../plan/contracts/clinical-record-policy-v1.md).

## Legal and Clinical-Classification Freeze Boundary

| Task | Required boundary |
|---|---|
| `F06-T01` | Approved clinical-record policy: retention default/legal boundary, visibility, signing, append-only revisions, amendment, publication, and configurable authorization. |
| `F06-T02` | Self-reported intake conversion to reviewed clinical record. |
| `F06-T03` | Encounter, clinical-core, and audit migration boundary. |
| `F06-T04` | Start/complete an encounter from a valid appointment without duplicate encounter creation. |
| `F06-T05` | Note revision, optimistic concurrency, and private clinician-note boundary. |
| `F06-T06` | Diagnosis, allergy, condition, and medication reconciliation. |

Self-reported intake cannot become a clinical fact automatically. Phase 05 appointment behavior
remains the input authority for a valid appointment.

## Visibility, Authorization, and Interface Boundary

- `F06-T07`: only the permitted patient timeline, history, and visit summary.
- `F06-T08`: resource-level authorization and audit for read, write, and export; clinician or
  administrator role alone is insufficient.
- `F06-T09`: dashboard patient workspace overview, medical, history, appointments, assessments,
  traditional, and timeline; remove only in-scope placeholders.
- `F06-T10`: app `/appointments/summary`, `/profile/history`, and `/profile/health-record`.
- `F06-T11`: generated-client synchronization plus security, revision, and browser E2E coverage.

Medical content and PII are prohibited from operational logs. Frontends consume generated
contracts only after their owning contract work is ready.
