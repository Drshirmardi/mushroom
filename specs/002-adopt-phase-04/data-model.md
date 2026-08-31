# Phase 04 Data Model

Phase 04 introduces the directory and availability persistence only when `F04-T02` is claimed.
This adoption model preserves the roadmap concepts and invariants without freezing the field-level
contract owned by `F04-T01`.

## Clinic

Existing owner of the MVP's directory and scheduling configuration.

- Identity: explicit clinic identifier on all owned records
- Scheduling context: canonical clinic timezone
- Lifecycle: the MVP uses one active clinic
- Relationships: owns doctors, specialties, services, offerings, rules, and closures
- Integrity: clinic-scoped operations cannot read or mutate another clinic's records

## Doctor Profile

Represents patient-visible professional information independent of credentials.

- Identity: clinic-scoped doctor profile identifier
- Login relationship: optional; profile creation does not require a user account
- Classification: associated with one or more specialties as frozen by `F04-T01`
- Lifecycle: inactive and unpublished states are not patient-bookable
- Relationships: owns service offerings, recurring rules, and doctor-specific exceptions

## Specialty

Represents a clinic-managed patient-facing doctor classification.

- Identity: clinic-scoped specialty identifier
- Lifecycle: activity/publication behavior is finalized by `F04-T01`
- Relationships: classifies doctors and supports patient discovery

## Service

Represents a clinic-managed type of care.

- Identity: clinic-scoped service identifier
- Lifecycle: inactive or unpublished services are not patient-bookable
- Relationships: offered by doctors through Doctor Service records

## Doctor Service

Represents one doctor offering one service under the frozen commercial and timing contract.

- Required concepts: visit mode, duration in minutes, buffer in minutes, integer price, currency
- Lifecycle: active/published combinations are patient-visible and potentially bookable
- Relationships: belongs to one clinic, doctor, and service
- Integrity: inactive doctor, service, offering, or mode removes the combination from availability
- Constraint ownership: exact uniqueness and mode representation are frozen by `F04-T01`

## Availability Rule

Represents a recurring working interval used to derive candidate times.

- Scope: explicit clinic and doctor; offering/mode scope is finalized by `F04-T01`
- Time semantics: interpreted in the clinic timezone
- Lifecycle: active rules contribute to on-demand availability
- Integrity: invalid intervals and forbidden overlaps are rejected

## Clinic Closure

Represents a clinic-wide bounded period when regular availability is suppressed.

- Scope: one clinic
- Effect: overrides otherwise valid recurring rules for the closure period
- Time semantics: local clinic intent with unambiguous persisted timestamps
- Integrity: invalid ranges are rejected

## Doctor Availability Exception

Represents doctor leave or an exceptional override for a bounded period.

- Scope: one clinic and one doctor
- Kinds: leave/unavailable and exceptional availability concepts; exact enum is frozen by
  `F04-T01`
- Effect: immediately changes later availability derivation
- Integrity: invalid ranges, invalid override relationships, and forbidden overlaps are rejected

## Derived Slot

A transient candidate time; it is not a persisted source-of-truth entity.

- Inputs: clinic timezone, active/published offering, duration, buffer, recurring rules, closures,
  doctor exceptions, and requested range
- Output: a start/end interval tied to the doctor-service-mode selection
- Integrity: no result is returned for an inactive or unpublished combination
- Phase boundary: booking ownership, holds, and final conflict enforcement belong to Phase 05

## Relationship Summary

```text
Clinic
├── Doctor Profile ──< Doctor Service >── Service
│       ├── Specialty
│       ├── Availability Rule
│       └── Doctor Availability Exception
└── Clinic Closure

Current configuration + requested range -> Derived Slot candidates
```
