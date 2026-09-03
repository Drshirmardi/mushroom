# Phase 05 Data Model

This preserves the five roadmap concepts. Exact fields, relationships, constraints, timestamps,
lifecycle values, and API forms remain owned by `F05-T01` and `F05-T02`.

## Appointment

The booked visit/lifecycle record; it retains the `F05-T01` price snapshot, uses authoritative
eligibility for create/reschedule, and is protected by the `F05-T02` active-doctor overlap rule.

## Appointment Hold

The roadmap-named booking-capacity concept. Its lifecycle, expiration, availability relationship,
and behavior remain unfinalized by this adoption and cannot replace overlap protection.

## Appointment Status History

Chronological lifecycle transitions and applicable reasons, owned by `F05-T07`.

## Queue Entry

Day-of-visit operational queue record, supporting `F05-T06`; repeats cannot create incompatible
state.

## Operational Activity

Sourced appointment-operations activity for `F05-T07` and Home V1; it does not authorize future
clinical, commerce, or reporting sources.

```text
Appointment
├── Appointment Hold
├── Appointment Status History
├── Queue Entry
└── Operational Activity
```
