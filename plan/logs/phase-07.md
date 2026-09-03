# Phase 07 Execution Evidence

## F07-T01 — lifecycle draft/issue/amend و قواعد ایمنی نسخه

Task ID: F07-T01
Completed at: 2026-09-03 22:08 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B01
Reviewed by: Codex /root
Changed files:

- `plan/contracts/prescription-treatment-policy-v1.md`
- `plan/STATUS.md`
- `plan/phases/07-PRESCRIPTION-TREATMENT.md`
- `plan/logs/phase-07.md`
- `specs/005-adopt-phase-07/{spec.md,plan.md,research.md,data-model.md,quickstart.md,checklists/requirements.md,contracts/phase-07-adoption.md,tasks.md}`

Migrations: none.

Tests run:

- Policy traceability script against the owner-approved F07-T01 issuer, acknowledgement, immutability, audit/privacy, and legal-boundary requirements → PASS
- `git diff --check` → PASS
- Coordinator review of roadmap, engineering standards, approved F07-T01 policy, and Phase 06 clinical-policy boundary → PASS

Result:

- Existing single-dashboard scope is preserved; no role-management UI, additional dashboard, or Phase 08 work is introduced → PASS
- Drafts are editable, issued revisions are immutable, and corrections are append-only successor revisions with preserved issuance evidence → PASS
- Issuance requires `PRESCRIPTION_ISSUE` plus tenant/resource authorization; `DOCTOR` is the default issuer and `ADMIN`/`STAFF` receive no implicit authority → PASS
- Advisory warnings require exact-revision acknowledgement; only an approved `NON_OVERRIDABLE` rule blocks issuance, and no such rule is invented → PASS
- Safety acknowledgement, audit/privacy, AI prohibition, and unresolved jurisdiction-specific legal boundary are frozen without claiming compliance → PASS

Known limitations:

- This policy task adds no prescription persistence, API, UI, generated client, RBAC-management infrastructure, warning evaluator, or audit implementation. Those remain owned by `F07-T02`–`F07-T11`.

Next batch:

- `F07-B02` — `F07-T02` (unclaimed).

## F07-T02 — migration prescription/treatment/task/adherence

Task ID: F07-T02
Completed at: 2026-09-04 03:18 +03:30
Agent/Thread: Codex /root
Batch ID: F07-B02
Reviewed by: Codex /root
Changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260903234156_phase_07_prescription_treatment_foundation/migration.sql`
- `apps/api/test/migrations.integration.spec.ts`
- `plan/STATUS.md`
- `plan/phases/07-PRESCRIPTION-TREATMENT.md`
- `plan/logs/phase-07.md`
- `specs/005-adopt-phase-07/{spec.md,tasks.md}`

Migrations:

- `20260903234156_phase_07_prescription_treatment_foundation` — generated from the reviewed F07-T02 Prisma schema against the repository-supported isolated shadow database; applied successfully only to the clean reconstructed local development database.

Tests run:

- preservation-safe source/candidate comparison before switchover: 42 shared application tables, row counts and content fingerprints equal → PASS
- clean active migration ledger: 18 committed migration checksums matched before F07-T02; Prisma validate/generate, migrate status, and migration-history → committed-schema diff → PASS
- `prisma migrate dev --create-only --name phase_07_prescription_treatment_foundation` with isolated shadow → PASS
- generated SQL review: only F07-T02 enums, persistence tables, indexes, and foreign keys; no Phase 06/legacy mutations → PASS
- `prisma migrate deploy`, `prisma migrate status`, `prisma validate`, `prisma generate`, and migration-history → current-schema diff → PASS
- `tsc -p tsconfig.test.json --noEmit` → PASS
- `vitest run test/migrations.integration.spec.ts --no-file-parallelism` → PASS (2/2; empty PostgreSQL migration and deterministic seed smoke, including F07-T02 persistence constraints)
- real PostgreSQL persistence/constraint exercise on the active clean database inside a rolled-back transaction → PASS (revision-item and safety-acknowledgement uniqueness, adherence idempotency, and progress-event foreign key)
- `vitest run test/clinical-notes.integration.spec.ts test/health.integration.spec.ts --no-file-parallelism` → PASS (7/7)
- local API development boot with `GET /v1/health/live` and `GET /v1/health/ready` against the switched database → PASS
- post-verification preservation comparison: all 42 shared application tables still match the original; Phase 07 tables are empty → PASS
- `git diff --check` → PASS

Result:

- Prescription, revision/item, safety-acknowledgement, treatment plan/medication/exercise/nutrition/task, adherence, and progress-event persistence foundations exist with their generated indexes and foreign keys → PASS
- Fresh PostgreSQL migration and deterministic seed remain operational and idempotent for the existing development setup → PASS
- The local development URL now targets the clean reconstructed database; the original `sabz_zendegi` database remains unchanged with its historical 14 legacy constraint names and 19 migration rows, and both verified backup archives remain intact as rollback protection → PASS
- No implementation from `F07-T03` or later was started → PASS

Known limitations:

- F07-T02 provides persistence only. Prescription lifecycle API, treatment APIs, patient recording, progress calculation, authorization/audit enforcement, generated client/UI wiring, and browser verification remain owned by F07-T03 through F07-T11.

Next batch:

- `F07-B03` — `F07-T03` is eligible but not claimed or started.
