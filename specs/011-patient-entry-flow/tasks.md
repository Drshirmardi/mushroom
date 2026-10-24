# Tasks: Guided Patient Entry

**Roadmap owner**: `F12-FE01` corrective slice  
**Execution**: single coordinator/writer. Schema, migration, API wiring, and generated API client are exclusive shared paths.

## Phase 1: Regression coverage and contract

- [x] T001 Add isolated PostgreSQL cases for profile-required-without-assessment, old incomplete profiles, durable completion/later policy activation, legacy demographic repair, concurrency, SQL completion guards, medical-intake isolation, and exact assessment resume in `apps/api/test/patient-entry.integration.spec.ts`
- [x] T002 Preserve pure assessment-cohort and exact endpoint boundary rules in `apps/api/test/patient-entry.rules.spec.ts`

## Phase 2: API and persistence

- [x] T003 Retain migration history and add forward SQL completion/demographic guards in `apps/api/prisma/migrations/20261024110000_patient_entry_completion/migration.sql`; remove the rejected profile cutoff from final schema
- [x] T004 Update `PatientEntryService` and DTOs to require profile independently of assessment configuration, persist gender, and order profile/assessment/result states in `apps/api/src/modules/patients/entry/**`
- [x] T005 Regenerate Prisma client and OpenAPI/client contracts for entry profile/status fields in `apps/api/src/generated/prisma/**` and `packages/api-client/{openapi.json,src/schema.generated.ts}`

## Phase 3: Patient experience

- [x] T006 Add required gender choice, existing-value prefill, clear conditional step count, and no-assessment release behavior in `apps/app/src/app/welcome/page.tsx`
- [x] T007 Confirm central gate and journey/home state honor the corrected entry contract in `apps/app/src/components/auth/patient-entry-gate.tsx` and affected patient entry consumers

## Phase 4: Verification and evidence

- [x] T008 Run focused isolated PostgreSQL integration and rule tests, API/app typechecks, generated contract parity, and targeted browser journey for no-assessment and required-assessment flows
- [x] T009 Review diff for patient/clinic/source ownership, assessment cutoff immutability, consent separation, accessibility, protected-route behavior, and existing changes; record evidence and handoff under `plan/logs/phase-12.md` and synchronize `plan/STATUS.md`
