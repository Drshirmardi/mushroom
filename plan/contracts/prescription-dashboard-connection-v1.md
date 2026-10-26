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

### Owner-authorized visit workspace continuation (2026-10-27)

- The standalone `/prescriptions` route now selects real patients using existing server search/pagination (administrators) or assigned visit pages (physicians). Patient name comes from the authorized prescription list; URL text is not treated as patient identity.
- Visit workspace keeps chat, visit notes, prescriptions, treatment instructions and product selection mounted after first use. A new visit starts a new prescription form; historical prescriptions remain explicitly selectable. Unsaved changes block issuance and require in-page confirmation before selecting another prescription/patient or exiting via the visit back action. Drafts remain in memory, never local storage.
- Prescription creation optionally accepts `appointmentId` and retry `commandId`. Existing clinical permission/clinic checks remain; contextual creation also verifies current appointment assignment/status. The creation audit records appointment provenance and request hash. This is audit provenance, not a new relational appointment field or an authorization shortcut.
- A command UUID pins a retryable new prescription or treatment draft; conflict/ownership/hash checks prevent duplicate creation or reuse for different input. Existing expected revisions still protect prescription edits and issuance.
- Admin revision history is paginated with `before`. Patient `/patients/me/prescriptions` reads only their issued revision, including while a later correction is still a draft. Patient access never includes that later draft. Existing treatment view and appointment/profile links expose this reader.
- Treatment authoring reuses native plan definitions and explicit DRAFT→ACTIVE publication. Draft replacement is atomic and checks `expectedUpdatedAt`, DRAFT state, absence of scheduled tasks, and custom-program boundaries. Published/custom content is not overwritten through this new operation. Existing session goals/private instructions are preserved when a draft is edited.
- Visit product lookup is server-paginated and limited to active clinic SKUs. Cart additions require authorized assigned physician or ADMIN, clinical edit permission and clinic access; preserve other items, atomically increment quantity within existing 100-unit cap, and audit the acting user/visit. Reusing the same command replays its result without adding again. Checkout alone rechecks stock/prices; no reservation, order or payment is created here.
- No schema/migration, new clinical grants, consent removal, payment change, fabricated medical content or new dependency. Generated OpenAPI source is synchronized; runtime exporter parity, type/lint/build and behavioral/browser verification remain owner-deferred.

- `F07-T08` owns the patient-app treatment connection.
- `F07-T09` owns the dedicated issuance capability, audit expansion, and contraindication warning/acknowledgement enforcement.
- `F07-T10` owns generated OpenAPI client synchronization and remaining broad mock/local-state cleanup.
- `F07-T11` owns the complete cross-surface browser E2E flow.
- The approved `TreatmentSessionPlan` remains a clinical definition, never a scheduled occurrence, appointment, execution, or lifecycle state in this task.
