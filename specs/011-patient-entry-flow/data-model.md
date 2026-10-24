# Data Model: Guided Patient Entry

## PatientEntryPolicy

The existing `enforcedFrom` remains the immutable assessment enrollment cutoff. Basic profile completeness has no account-age cutoff.

The initial profile-cutoff proposal is retained as migration history and removed in the next forward migration. No assessment policy is enabled by migration.

## PatientEntry

`birthDate` remains the registration birth date. `completedAt` can represent profile-only registration with no assessment binding, or registration backed by a valid completed assessment. SQL checks profile completeness and current assessment policy when completing; later demographic correction preserves exact-source/patient ownership and original completion markers.

## UserProfile

Use existing `firstName`, `lastName`, and `gender`. `gender` remains the profile `FEMALE`/`MALE` enum. The medical intake's `sexAtBirth` field remains separate and is not written by registration.

## Derived state

No completion boolean is introduced. Status derives missing fields from persisted profile data and entry birth date, then uses the existing assessment policy cutoff, bound submission state, and `completedAt`.
