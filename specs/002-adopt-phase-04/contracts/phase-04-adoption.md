# Phase 04 Contract Adoption

This document maps the capabilities required by the existing Phase 04 roadmap. It does not freeze
the exact field schema, visit-mode enum, route paths, DTOs, or response shapes owned by
`F04-T01`, and it does not replace generated OpenAPI output.

## Contract Freeze Boundary (`F04-T01`)

Before dependent implementation begins, the authoritative Phase 04 contract must define:

- patient-visible and administrator-managed doctor, specialty, and service fields;
- visit-mode representation and active/publication semantics;
- duration and buffer in minutes;
- integer price with explicit currency;
- clinic and doctor ownership relationships;
- timezone and date/time representation;
- validation and stable error behavior for inactive, invalid, overlapping, forbidden, and missing
  records;
- pagination and filtering for list interfaces.

Adoption intentionally records these required concepts without choosing their exact shapes.

## Administrator Capability Contract

| Roadmap task | Capability | Required behavior |
|---|---|---|
| `F04-T03` | Manage clinic | Read/update only the active clinic allowed by the MVP authorization context |
| `F04-T03` | Manage doctors | Create a profile without credentials; update, activate, and publish according to the frozen contract |
| `F04-T03` | Manage specialties and services | Clinic-scoped, validated management with truthful list states |
| `F04-T04` | Assign doctor service | Configure mode, duration, buffer, price, currency, activity, and publication |
| `F04-T05` | Manage working hours | Store valid recurring rules in the clinic timezone |
| `F04-T05` | Manage closures | Immediately suppress affected clinic availability |
| `F04-T05` | Manage leave and exceptions | Apply bounded doctor-specific changes and reject invalid overlap |
| `F04-T07` | Authorize and audit | Require the established permission boundary and audit schedule, price, and publication changes |

The exact HTTP routes are frozen and documented only during `F04-T01`/the owning implementation
task. All administrator interfaces remain authenticated and clinic-scoped.

## Patient Capability Contract

| Roadmap task | Capability | Required behavior |
|---|---|---|
| `F04-T06` | Query doctors | Return only patient-visible active/published clinic records |
| `F04-T06` | Query services and offerings | Return only active/published doctor-service-mode combinations |
| `F04-T06` | Query availability | Derive candidate times on demand from current rules and exceptions |
| `F04-T09` | Read doctor detail | Render authoritative doctor, specialty, service, and offering data |
| `F04-T09` | Select doctor/service | Carry an authoritative active selection into the scheduling step while preserving eligibility gating |

The Phase 03 booking eligibility decision remains authoritative before patient selection. Phase 04
does not create appointments, reserve capacity, or accept payment.

## Availability Derivation Contract

```text
requested clinic/date range
  + active, published doctor-service-mode
  + clinic timezone
  + recurring working rules
  - clinic closures
  - doctor leave
  +/- valid doctor exceptions
  + duration and buffer
  = transient candidate times
```

- A slot is not stored as the canonical source of truth.
- A later valid schedule change affects the next query.
- Inactive or unpublished inputs yield no bookable result.
- Appointment conflicts, holds, and booking idempotency remain Phase 05 responsibilities.

## Contract Ownership

- The roadmap contract produced under `F04-T01` owns domain meaning.
- API DTO metadata and exported OpenAPI own executable request/response schemas after endpoint
  implementation.
- `packages/api-client/src/schema.generated.ts` remains generated and is never hand-edited.
- Frontends do not introduce duplicate public request or response types.
- Shared schema, migrations, generated client, permission infrastructure, and module wiring retain
  one writer per claimed batch.
