# Research: Guided Patient Entry

## Existing behavior

- `PatientEntryService.status()` gates the entire entry journey through `entryRequired(enabled, cutoff, accountCreated, hasEntry, completed)`. A disabled or absent assessment policy makes a new patient skip the profile step.
- When an assessment is enabled but its version is missing/unavailable, `UNAVAILABLE` is selected before profile completeness, so the patient cannot first save basic details.
- `EntryProfileDto` accepts name, surname, and birth date only. The profile page therefore never asks for gender.
- `PatientEntryGuard` authoritatively blocks private patient API requests using the same status response; the app's `PatientEntryGate` directs incomplete patients to `/welcome`.
- Entry answers and results already use the versioned patient assessment engine and remain bound to the patient and selected source. Commerce Mezaj recommendations read the latest valid patient-owned MEZAJ result through provenance checks.
- `UserProfile.gender` is the registration profile field (`FEMALE`/`MALE`). `PatientMedicalIntakeRevision.sexAtBirth` is a separate self-reported medical field and requires the medical-intake consent flow.
- ADR-0038 explicitly separates basic entry from medical intake and preserves existing accounts through an immutable policy enrollment cutoff. The assessment cutoff must retain that meaning.

## Decisions

1. Require basic profile completeness independently of account age. The owner explicitly rejected exempting old incomplete accounts during corrective review.
2. Save durable profile-only registration completion in the existing `completedAt` field, with SQL checks and no fabricated assessment. Later assessment activation cannot reopen completed registration.
3. Permit demographic repair for started/completed entries while preserving exact assessment/source binding, saved answers, and original completion time. Retain immutable assessment enrollment cutoff, remove the unused profile-cutoff proposal via a forward migration.
4. Determine phase in a user-comprehensible order: profile first; then required assessment; then saved result; then complete. Missing assessment configuration does not block profile save, while a missing source after profile completion remains an explicit blocked assessment step.
5. Persist gender with `UserProfile` and DOB with `PatientEntry`. Do not merge either value into medical intake automatically.
6. Reuse existing Mezaj provenance and recommendation services. Only a qualifying result for the exact supported assessment/source pair can drive temperament recommendations.

## Risks and controls

- **Enrollment could silently change**: preserve the existing assessment cutoff and terminal registration binding in SQL.
- **Completed users could be re-enrolled**: persist profile-only completion and test later policy activation explicitly.
- **Legacy started users could be stranded**: allow demographic repair while preserving answers/submission and test that exact path.
- **No-assessment flow could remain stuck**: after saving profile, return `required=false` when assessment enforcement is off; verify route gate releases to Home.
- **Medical sex could be conflated with gender**: use the existing profile field and never write `sexAtBirth` from this flow.
- **Result could be mistaken for clinical diagnosis**: retain current authored result and recommendation provenance, with no new clinical/financial authority.
