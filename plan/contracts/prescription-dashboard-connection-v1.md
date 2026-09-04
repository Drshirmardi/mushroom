# Prescription dashboard connection v1

**Status:** `F07-T07` contract baseline
**Scope owner:** `F07-T07`
**Authoritative roadmap task:** [`F07-T07`](../phases/07-PRESCRIPTION-TREATMENT.md)

## Entry and source of truth

- The clinical user enters the prescription builder from the selected patient workspace at `/prescriptions?patientId=<patient UUID>`.
- A missing selected-patient identity renders a truthful notice and makes no prescription or treatment request. It never substitutes a demo patient.
- The dashboard reads and mutates only the accepted `F07-T03` prescription API and reads the accepted `F07-T04` treatment-plan and `F07-T06` progress APIs. API authorization remains authoritative; this connection does not grant clinical authority.
- The small typed dashboard adapter is temporary wiring over those declared runtime APIs. Checked-in generated-client synchronization belongs exclusively to `F07-T10`.

## Dashboard behavior in this task

- The prescription builder lists the selected patient's current prescription history, creates a draft, saves an append-only current draft revision, creates an issued-prescription correction only with its required amendment-reason category, and requests issue of the exact current revision.
- A successful reload shows the server's returned revision and immutable issued history. Request, access, and validation failures are visible without fabricated success or fallback data.
- The selected patient's workspace includes a prescription and treatment summary sourced from prescriptions, treatment-plan definitions, and real derived progress. It links to the builder with that same patient identity.
- This task does not create dashboard editing flows for treatment-plan medication, session, exercise, or nutrition definitions. It also does not fabricate session completion or progress.

## Explicit boundaries

- `F07-T08` owns the patient-app treatment connection.
- `F07-T09` owns the dedicated issuance capability, audit expansion, and contraindication warning/acknowledgement enforcement.
- `F07-T10` owns generated OpenAPI client synchronization and remaining broad mock/local-state cleanup.
- `F07-T11` owns the complete cross-surface browser E2E flow.
- The approved `TreatmentSessionPlan` remains a clinical definition, never a scheduled occurrence, appointment, execution, or lifecycle state in this task.
