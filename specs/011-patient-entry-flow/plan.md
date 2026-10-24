# Implementation Plan: Guided Patient Entry

**Roadmap Task**: `F12-FE01` corrective slice  
**Branch**: `codex/patient-entry-flow` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification in this directory. This SpecKit package documents one bounded correction to the existing Phase 12 patient-client integration task; it does not replace or reopen Phase 02.

## Summary

Require complete basic patient details for new and existing accounts, regardless of assessment configuration. Collect first name, last name, profile gender, and birth date. Continue to an exact published assessment only when the existing clinic policy requires it; otherwise durably complete registration and enter the app. Preserve saved answers and completion markers during demographic repair. Reuse the assessment/result/recommendation engines and keep medical consent/intake independent.

## Technical Context

**Language/Version**: TypeScript, Node.js workspace versions pinned by the repository  
**Primary Dependencies**: NestJS, Prisma, Next.js, generated `@sabz-zendegi/api-client`  
**Storage**: PostgreSQL via versioned Prisma migration  
**Testing**: Vitest, isolated PostgreSQL API integration, TypeScript checks, scoped app browser flow  
**Target Platform**: Patient app, API, and existing assessment administration dashboard  
**Project Type**: Monorepo web application and modular API  
**Performance Goals**: Entry status remains one bounded patient/policy/source/submission read; no polling or new background work  
**Constraints**: Preserve assessment enrollment cutoff, started-source binding, and completed registration markers; support profile-only completion; do not fabricate medical consent/intake or activate a real assessment policy  
**Scale/Scope**: One registration flow spanning patient app, API, database policy, generated API client, and existing assessment admin control

## Constitution Check

- Scope stays within the explicitly requested corrective slice of active `F12-FE01`.
- Existing Phase 02 completion and ADR-0038 boundaries remain intact; this fixes a production regression without reimplementing onboarding or medical intake.
- PostgreSQL remains authoritative; forward migrations protect both profile-only completion and assessment-bound completion.
- API guard remains the authoritative block; app routing is only the user-facing step.
- Existing answer/result engine and patient-owned Mezaj recommendation query are reused.
- Test coverage targets profile completeness, old incomplete accounts, durable profile-only completion, legacy demographic repair, concurrency, assessment resume, and patient binding.

## Design

### Entry policy and status

Profile completeness is derived from persisted names, gender, and entry birth date for every account. The reviewed profile-cutoff proposal is removed through a corrective forward migration. Existing `enforcedFrom` continues to govern only the assessment cohort. A completed registration is not enrolled again by later assessment activation; missing demographics can still be repaired.

Status first requires missing profile fields, then evaluates the required assessment/result, otherwise returns complete. Profile-only save records terminal registration without creating a submission. Terminal assessment binding and completion timestamp remain immutable while demographic corrections are permitted. Patient/policy locks serialize profile save and policy changes.

### Profile fields and persistence

Use `UserProfile.gender` (`FEMALE`/`MALE`) and first/last name, plus `PatientEntry.birthDate`. Add gender to entry request/status contracts and save it atomically with the other entry fields. Keep medical `sexAtBirth`, consent, and intake writes untouched.

### Patient experience and recommendation

Update `/welcome` with required gender selection, saved-value prefill, and a progress count that reflects whether an assessment step exists. Keep existing assessment wizard/result UI and exact submission ownership. After a valid result is reviewed and acknowledged, existing Mezaj result provenance and commerce recommendations remain the only source for personalized products. Non-Mezaj assessments continue to save their authored result without inventing temperament recommendations.

### API and database contract

- Extend `PatientEntryStatusDto` with `gender` and `assessmentRequired` so the app renders the correct step count and prefilled values.
- Extend `EntryProfileDto` with required `gender` in the existing profile enum.
- Keep `/v1/patients/me/entry`, `/profile`, `/start`, `/complete` routes and all existing authorization/error conventions.
- Retain migration history and follow the proposed profile-cutoff migration with `20261024110000_patient_entry_completion`, which removes that cutoff and updates SQL completion/ownership guards.
- Correct existing availability TypeScript window shapes and numeric pagination metadata that blocked clean API/app checks; regenerate only affected OpenAPI sections.
- Update the central app route gate and server patient entry guard through their existing status contract; do not broaden allowed entry endpoints.

## Project Structure

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/20261024100000_patient_entry_profile_cutoff/migration.sql
apps/api/prisma/migrations/20261024110000_patient_entry_completion/migration.sql
apps/api/src/modules/patients/entry/**
apps/api/test/patient-entry.integration.spec.ts
apps/api/test/patient-entry.rules.spec.ts
apps/app/src/app/welcome/page.tsx
apps/app/src/components/auth/patient-entry-gate.tsx
apps/app/src/lib/patient-entry-api.ts
apps/app/src/lib/onboarding/**
packages/api-client/openapi.json
packages/api-client/src/schema.generated.ts
specs/011-patient-entry-flow/**
plan/STATUS.md
plan/phases/12-PRODUCTION-HARDENING.md
plan/logs/phase-12.md
```

**Structure Decision**: Use the established patient-entry module and app route. Prisma and generated contracts have a single writer (coordinator). Dashboard policy UI already exposes the required-assessment toggle and selected published assessment; change it only if source review finds a contract mismatch.

## Complexity Tracking

No constitution violations. Reuse the existing entry completion timestamp with explicit SQL rules for profile-only registration; no new completion engine or profile-cutoff configuration is needed.
