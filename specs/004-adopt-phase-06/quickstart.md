# Phase 06 Validation Quickstart

This validation guide preserves Phase 06 gates. Live execution state is authoritative in
[`plan/STATUS.md`](../../plan/STATUS.md); the adoption does not claim or start `F06-T01`.

## Prerequisites

- Phase 05 remains `DONE (CLOSED)` and supplies the valid appointment authority.
- A future coordinator has claimed a batch and assigned a single writer for migrations, shared
  contracts, generated client, authentication, and other shared paths.
- Existing Node/Corepack, environment, PostgreSQL, and non-secret authorized clinician,
  administrator, and patient setup are available.

## Task-Level Verification

- `F06-T01`–`F06-T02`: focused policy/contract review against the authoritative phase and
  engineering standards.
- `F06-T03`: migration smoke and focused real-PostgreSQL integration evidence.
- `F06-T04`–`F06-T06`: targeted domain/API/type checks, including valid appointment start/
  completion, no duplicate encounter, stale note revision, private note, and reviewed-record
  boundaries as applicable.
- `F06-T07`–`F06-T08`: authorization matrix and audit coverage for patient visibility and
  read/write/export; inspect logging evidence for medical-content and PII redaction.
- `F06-T09`–`F06-T10`: focused dashboard/app type checks and truthful in-scope placeholder
  removal only after a real source is available.
- `F06-T11`: regenerate/typecheck client and run required security, revision, and browser E2E
  coverage.

## Phase Browser Gate (`F06-T11`)

1. Use a valid Phase 05 appointment to start and complete an encounter as an authorized clinician.
2. Record a controlled clinical note, exercise revision behavior, and ensure a private note is
   not visible to the patient.
3. Reconcile reviewed clinical information without treating self-reported intake as an automatic
   clinical fact.
4. Use the dashboard patient workspace and the permitted app summary/history/health-record views.
5. Exercise allowed and denied resource-level read/write/export access, then confirm required
   audit and redacted operational logging behavior.

**Pass criteria**: appointment and encounter are distinct with no duplicate encounter;
self-reported intake is not automatically clinical fact; patients see only permitted information;
roles do not substitute for resource permission; operational logs contain neither medical content
nor PII; a completed encounter has a permitted patient summary.

## Evidence (`F06-T12`)

Record accepted evidence in `plan/logs/phase-06.md` under `plan/logs/README.md`, then synchronize
authoritative status only after review. Never record credentials, tokens, medical content, or PII.
