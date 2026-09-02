# Clinic Directory and Availability Contract v1

This document is the contract produced by `F04-T01`. The Phase 04 migration, API, generated
client, patient app, and administrator dashboard MUST remain consistent with it. The authoritative
scope and task order remain in `plan/phases/04-CLINIC-DIRECTORY-AVAILABILITY.md`.

## Scope and architectural boundary

- The MVP has one active clinic. Every directory and scheduling record still owns an explicit
  `clinicId`; request bodies never choose a clinic.
- The server resolves the administrator clinic from the active-clinic context and the patient
  clinic from `PatientProfile.clinicId`.
- `directory` owns clinic-facing doctor, specialty, service, and doctor-service data.
- `scheduling` owns recurring availability rules, clinic closures, doctor exceptions, and
  on-demand candidate generation.
- A `DoctorProfile` can exist with `userId = null`. Phase 04 does not add account invitation or
  doctor-login linkage operations.
- Patient-facing means authenticated `PATIENT` access in the existing app, not an anonymous public
  API. A record from another clinic or one that is not patient-visible is returned as not found.
- Phase 03 booking eligibility remains the gate before the app enters doctor/service selection.
  Phase 05 appointment create and reschedule operations MUST evaluate eligibility again.

## Canonical scalar types

| Concept | v1 representation |
|---|---|
| Identifier | UUID v4 string |
| Timestamp | RFC 3339/ISO 8601 UTC string ending in `Z`; persisted as timezone-aware UTC |
| Calendar date | Gregorian `YYYY-MM-DD`; Persian-calendar values are presentation-only |
| Local wall time | zero-padded 24-hour `HH:mm` |
| Weekday | ISO weekday integer, Monday `1` through Sunday `7` |
| Timezone | canonical IANA name such as `Asia/Tehran` |
| Publication | `UNPUBLISHED \| PUBLISHED` |
| Visit mode | `IN_PERSON \| ONLINE` |
| Currency | `IRR` only in v1 |
| Money | JSON integer `priceAmount` in rials, `0..2_147_483_647`; never float |

All intervals are half-open: `[startsAt, endsAt)`. Unknown input fields are rejected. Text is
trimmed, blank text is rejected where the field is required, and nullable optional fields are
cleared with explicit `null` rather than an empty string.

## Directory records

Server-owned fields (`id`, `clinicId`, `createdAt`, `updatedAt`, and `publishedAt`) are never
accepted from clients.

### Clinic

The existing `Clinic` record is reused.

| Field | Rule |
|---|---|
| `id`, `clinicId` | The response uses `id`; all owned records reference the same value as `clinicId` |
| `name` | required, trimmed, `1..160` characters |
| `timeZone` | required canonical IANA timezone |
| `status` | existing `ACTIVE \| INACTIVE`; read-only through Phase 04 endpoints |
| timestamps | `createdAt`, `updatedAt` |

The administrator can read and patch `name` and `timeZone` on the one active clinic. Clinic
creation, deletion, status changes, tenant switching, and multi-clinic administration are not v1
capabilities. Changing `timeZone` does not rewrite stored timestamps; recurring wall-clock rules
are interpreted using the new clinic timezone on subsequent queries.

### DoctorProfile

| Field | Rule |
|---|---|
| `id`, `clinicId` | required ownership |
| `userId` | nullable, unique when present; admin-only response field and not writable in v1 |
| `displayName` | required, trimmed, `1..160` characters |
| `biography` | nullable, trimmed, maximum 3,000 characters |
| `yearsExperience` | nullable integer, `0..80` |
| `profileImageUrl` | nullable absolute HTTPS URL, maximum 2,048 characters |
| `languages` | ordered unique array, maximum 10 trimmed items of `1..80` characters |
| `education` | ordered array, maximum 20 trimmed items of `1..240` characters |
| `certifications` | ordered array, maximum 20 trimmed items of `1..240` characters |
| `specialtyIds` | unique set of same-clinic specialty UUIDs, maximum 10 |
| `isActive` | boolean, default `false` |
| `publicationStatus` | default `UNPUBLISHED` |
| `publishedAt` | UTC timestamp while published, otherwise `null` |
| timestamps | `createdAt`, `updatedAt` |

Specialties are a many-to-many relationship. A doctor may be drafted without a specialty, but
publishing requires at least one active, published same-clinic specialty. Rating, review count,
completed-session count, and synthesized working-hours text are not editable profile fields;
Phase 04 UI MUST hide them until a real owning data source exists.

### Specialty and Service

Both records contain:

| Field | Rule |
|---|---|
| `id`, `clinicId` | required ownership |
| `name` | required, trimmed, `1..160` characters |
| `description` | nullable, trimmed, maximum 1,000 characters |
| `isActive` | boolean, default `false` |
| `publicationStatus`, `publishedAt` | same semantics as DoctorProfile |
| timestamps | `createdAt`, `updatedAt` |

Names are unique per clinic after Unicode normalization, case folding, trimming, and collapsing
internal whitespace. The canonical name used for uniqueness is server-owned and is not exposed as
a second editable field.

### DoctorService

One record represents one doctor offering one service in exactly one visit mode.

| Field | Rule |
|---|---|
| `id`, `clinicId` | required ownership |
| `doctorId`, `serviceId` | required same-clinic references |
| `visitMode` | `IN_PERSON \| ONLINE` |
| `durationMinutes` | integer `5..480` |
| `bufferMinutes` | integer `0..240`; post-visit unavailable time |
| `priceAmount` | integer rial amount `0..2_147_483_647` |
| `currency` | literal `IRR` |
| `isActive` | boolean, default `false` |
| `publicationStatus`, `publishedAt` | same semantics as DoctorProfile |
| timestamps | `createdAt`, `updatedAt` |

`(clinicId, doctorId, serviceId, visitMode)` is unique. `durationMinutes + bufferMinutes` MUST NOT
exceed 480. Publishing requires an active, published same-clinic doctor and service. Later parent
deactivation or unpublication does not rewrite the child record, but removes the combination from
patient results immediately.

## Publication, activity, and deletion semantics

- `publicationStatus` controls patient exposure; `isActive` controls current operational use.
- A patient-visible doctor, specialty, service, or offering requires both `isActive = true` and
  `publicationStatus = PUBLISHED` on that record and every required parent.
- An offering is bookable only when its clinic is active, its doctor and service are visible, its
  own state is visible, and matching current availability exists.
- Publishing is reversible. Transition to `PUBLISHED` sets `publishedAt` to the transition time;
  transition to `UNPUBLISHED` sets it to `null`.
- Deactivation or unpublication affects the next patient query; it never relies on cache expiry or
  rewrites historical audit data.
- Admin lists include inactive and unpublished records. Patient responses never include them.
- Doctor, specialty, service, and offering deletion is a hard delete only when no dependent record
  or downstream historical reference exists. Otherwise return `DIRECTORY_RECORD_IN_USE`; the
  administrator must deactivate or unpublish. No generic soft-delete column is introduced.

## Scheduling records

### AvailabilityRule

| Field | Rule |
|---|---|
| `id`, `clinicId`, `doctorId` | required same-clinic ownership |
| `visitMode` | required mode |
| `isoWeekday` | integer `1..7` |
| `startLocalTime`, `endLocalTime` | `HH:mm`, with start strictly before end |
| `isActive` | boolean, default `true` |
| timestamps | `createdAt`, `updatedAt` |

Rules never cross midnight; two rules are used for an overnight business intent. Active rules for
the same `(clinicId, doctorId, visitMode, isoWeekday)` MUST NOT overlap. Adjacent intervals are
allowed. A rule contributes only while the doctor and at least one offering for the mode remain
patient-visible.

### ClinicClosure

| Field | Rule |
|---|---|
| `id`, `clinicId` | required ownership |
| `startsAt`, `endsAt` | finite offset-aware input normalized to UTC; start strictly before end |
| `label` | required, trimmed, `1..160` characters; admin-only |
| `isActive` | boolean, default `true` |
| timestamps | `createdAt`, `updatedAt` |

An active closure subtracts capacity for every doctor and mode in the clinic. Overlapping closures
are rejected so configuration has one unambiguous owner per closed interval. Adjacent closures are
allowed.

### DoctorAvailabilityException

| Field | Rule |
|---|---|
| `id`, `clinicId`, `doctorId` | required same-clinic ownership |
| `kind` | `AVAILABLE \| UNAVAILABLE` |
| `visitMode` | required for `AVAILABLE`; nullable for `UNAVAILABLE`, where `null` means all modes |
| `startsAt`, `endsAt` | finite offset-aware input normalized to UTC; start strictly before end |
| `label` | nullable trimmed administrator note, maximum 160 characters |
| `isActive` | boolean, default `true` |
| timestamps | `createdAt`, `updatedAt` |

Active exceptions of the same kind and effective mode for one doctor MUST NOT overlap. An
`AVAILABLE` and an `UNAVAILABLE` exception may overlap intentionally; unavailable time wins.
`AVAILABLE` adds bounded capacity even when no recurring rule exists. `UNAVAILABLE` subtracts
capacity and represents leave or a doctor-specific block.

Offset-free datetimes are invalid. The API converts local administrator input to an offset-aware
instant before submission and returns UTC. A later clinic timezone change does not move existing
closure or exception instants.

## Administrator API capabilities

All routes use the global `/v1` prefix and bearer authentication. `DIRECTORY_MANAGE` protects
clinic/directory mutations and `SCHEDULING_MANAGE` protects schedule mutations; both map only to
`ADMIN` in the MVP. Resource lookup always includes the resolved `clinicId`.

| Capability | Route(s) |
|---|---|
| Read/update active clinic | `GET/PATCH /admin/clinic` |
| List/create doctors | `GET/POST /admin/doctors` |
| Read/update/delete doctor | `GET/PATCH/DELETE /admin/doctors/{doctorId}` |
| List/create specialties | `GET/POST /admin/specialties` |
| Read/update/delete specialty | `GET/PATCH/DELETE /admin/specialties/{specialtyId}` |
| List/create services | `GET/POST /admin/services` |
| Read/update/delete service | `GET/PATCH/DELETE /admin/services/{serviceId}` |
| List/create offerings | `GET/POST /admin/doctor-services` |
| Read/update/delete offering | `GET/PATCH/DELETE /admin/doctor-services/{doctorServiceId}` |
| List/create recurring rules | `GET/POST /admin/availability-rules` |
| Read/update/delete rule | `GET/PATCH/DELETE /admin/availability-rules/{ruleId}` |
| List/create clinic closures | `GET/POST /admin/clinic-closures` |
| Read/update/delete closure | `GET/PATCH/DELETE /admin/clinic-closures/{closureId}` |
| List/create doctor exceptions | `GET/POST /admin/doctor-availability-exceptions` |
| Read/update/delete exception | `GET/PATCH/DELETE /admin/doctor-availability-exceptions/{exceptionId}` |

Create returns `201`, read/update returns `200`, and delete returns `204`. A PATCH accepts the
mutable fields defined for that record, requires at least one supplied field, and treats omitted
fields as unchanged. Doctor `specialtyIds` replaces the complete set atomically. All writes and
their required audit event commit in the same transaction.

## Patient API capabilities and response shapes

All patient routes require role `PATIENT`. `DIRECTORY_READ_SELF` protects directory reads and
`AVAILABILITY_READ_SELF` protects availability. The server derives `clinicId` from the patient
profile; no patient query accepts it.

| Capability | Route |
|---|---|
| Filter visible doctors | `GET /directory/doctors` |
| Read visible doctor detail | `GET /directory/doctors/{doctorId}` |
| Filter visible services | `GET /directory/services` |
| Read derived availability | `GET /directory/doctor-services/{doctorServiceId}/availability` |

`DoctorListItem` contains `id`, `displayName`, `profileImageUrl`, `yearsExperience`, visible
`specialties` (`id`, `name`), and visible `offerings`. `DoctorDetail` adds `biography`, `languages`,
`education`, `certifications`, and `clinic` (`id`, `name`, `timeZone`). Each offering contains
`id`, `service` (`id`, `name`, `description`), `visitMode`, `durationMinutes`, `bufferMinutes`,
`priceAmount`, and `currency`. No patient response contains `clinicId` from a request, `userId`,
admin notes, audit data, inactive records, or unpublished records.

`ServiceListItem` contains `id`, `name`, and `description` and is returned only when at least one
visible doctor-service offering exists in the patient clinic.

Availability request parameters are:

- required `fromDate` and `toDate`, inclusive Gregorian clinic-local dates;
- optional `page` and `pageSize` using the common pagination contract;
- maximum range 31 calendar days and `fromDate <= toDate`.

The response contains `doctorServiceId`, `timeZone`, `fromDate`, `toDate`, pagination metadata, and
`items`. Each item is `{ startsAt, endsAt, localDate, localStartTime, localEndTime }`; `startsAt`
plus `doctorServiceId` identifies the transient candidate. `endsAt` excludes the post-visit
buffer. There is no slot identifier.

These read APIs do not create a reservation and do not replace the existing Phase 03 eligibility
response. The app MUST obtain an eligible decision before showing the selection flow; Phase 05
remains responsible for authoritative eligibility and conflict checks at write time.

## Pagination, filtering, and ordering

Every collection response has:

```ts
type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
```

`page` defaults to `1` (`1..10_000`) and `pageSize` defaults to `20` (`1..50`). The availability
endpoint permits `pageSize` up to `100`. Record ordering is deterministic with `id` as the final
tie breaker; availability uses its unique `startsAt` value.

- Admin doctor, specialty, and service lists: optional `query`, `isActive`, and
  `publicationStatus`; doctors also accept `specialtyId`.
- Admin offering list: optional `doctorId`, `serviceId`, `visitMode`, `isActive`, and
  `publicationStatus`.
- Admin rule list: optional `doctorId`, `visitMode`, `isoWeekday`, and `isActive`.
- Admin closure list: optional overlap filter `from`/`to` plus `isActive`.
- Admin exception list: optional `doctorId`, `kind`, `visitMode`, overlap filter `from`/`to`, and
  `isActive`.
- Patient doctor list: optional `query`, `specialtyId`, `serviceId`, and `visitMode`.
- Patient service list: optional `query`, `doctorId`, and `visitMode`.

Text query is a case-insensitive contains match against canonical name/display name. Directory
lists order by name/display name ascending, then `id`; schedule lists order by their weekday or
start instant ascending, then `id`; availability orders by `startsAt` ascending.

## Availability derivation

For one visible `DoctorService` and requested local date range, the server:

1. Resolves each Gregorian date in the clinic IANA timezone.
2. Collects matching active recurring rules for the doctor and offering mode.
3. Adds active matching `AVAILABLE` exception intervals.
4. Merges overlapping or adjacent positive windows.
5. Subtracts active clinic closures.
6. Subtracts active matching `UNAVAILABLE` doctor exceptions; unavailable always wins.
7. Drops candidate starts that are not in the future at query evaluation time.
8. Starting at each remaining window boundary, emits candidates at
   `durationMinutes + bufferMinutes` increments while the complete occupied interval fits in the
   window. The returned service end is `start + durationMinutes`; the occupied end additionally
   includes `bufferMinutes`.
9. Sorts and paginates the transient result.

The query reads current records on every request. A slot table, pre-generated permanent slots,
or a cache treated as source of truth is forbidden. Inactive/unpublished parents or offering,
missing matching capacity, a closure, or leave can therefore produce a valid empty page.

## Validation and stable errors

All errors use the existing shape `{ code, message, requestId, details }`. `code` is stable English;
`message` is localizable and is not a client control-flow key. Implementing tasks MUST add the
following codes to the canonical API error-code set before exposing the corresponding behavior.

| HTTP | Code | Meaning |
|---|---|---|
| `400` | `BAD_REQUEST` | malformed UUID, enum, date/time syntax, unknown field, or pagination syntax |
| `401` | `UNAUTHORIZED` | authentication missing or invalid |
| `403` | `FORBIDDEN` | required permission/role missing |
| `404` | `CLINIC_NOT_FOUND` | active administrator clinic does not exist |
| `404` | `DOCTOR_NOT_FOUND` | same-clinic visible/admin doctor not found |
| `404` | `SPECIALTY_NOT_FOUND` | same-clinic visible/admin specialty not found |
| `404` | `SERVICE_NOT_FOUND` | same-clinic visible/admin service not found |
| `404` | `DOCTOR_SERVICE_NOT_FOUND` | offering missing or hidden from the patient |
| `404` | `AVAILABILITY_RULE_NOT_FOUND` | same-clinic rule not found |
| `404` | `CLINIC_CLOSURE_NOT_FOUND` | same-clinic closure not found |
| `404` | `DOCTOR_AVAILABILITY_EXCEPTION_NOT_FOUND` | same-clinic exception not found |
| `409` | `DIRECTORY_NAME_CONFLICT` | normalized specialty/service name already exists |
| `409` | `DOCTOR_SERVICE_CONFLICT` | doctor/service/mode tuple already exists |
| `409` | `DIRECTORY_RECORD_IN_USE` | requested delete would break a dependency/history |
| `409` | `DIRECTORY_PUBLICATION_INVALID` | required visible parent/specialty is absent |
| `409` | `AVAILABILITY_INTERVAL_OVERLAP` | active rule, closure, or same-kind exception overlaps |
| `422` | `DIRECTORY_INPUT_INVALID` | doctor/specialty/service field semantics are invalid |
| `422` | `DOCTOR_SERVICE_INPUT_INVALID` | mode, duration, buffer, price, currency, or parent scope invalid |
| `422` | `TIME_ZONE_INVALID` | timezone is not a canonical supported IANA name |
| `422` | `SCHEDULE_INTERVAL_INVALID` | interval, weekday, local time, or exception-mode rule invalid |
| `422` | `AVAILABILITY_QUERY_INVALID` | date order or 31-day range limit invalid |

Uniqueness/overlap races MUST map database constraint failures to the same `409` codes. Error
details may contain safe field names, conflicting IDs, or limits, but never SQL, stack traces,
free-text administrator notes, tokens, or unrelated clinic identifiers.

## Authorization and audit contract

- The existing authorization guard enforces the fixed permissions above; the service layer also
  enforces `clinicId` ownership. `ADMIN` does not bypass ownership.
- Every create, update, publication/activity transition, and delete emits an append-only
  `AuditEvent` with actor/session/request context, subject type/id, action, and safe metadata.
- Stable action prefixes are `DIRECTORY_CLINIC_*`, `DIRECTORY_DOCTOR_*`,
  `DIRECTORY_SPECIALTY_*`, `DIRECTORY_SERVICE_*`, `DIRECTORY_DOCTOR_SERVICE_*`,
  `SCHEDULING_RULE_*`, `SCHEDULING_CLOSURE_*`, and `SCHEDULING_EXCEPTION_*`, with suffix
  `CREATED`, `UPDATED`, or `DELETED` as applicable.
- Metadata records changed field names and state transitions. Price audit metadata may record old
  and new integer amount/currency. Biography, image URL, education, certification, language,
  closure label, and exception label values are not copied into audit metadata or operational
  logs.

## Explicit Phase 05 exclusions

Phase 04 produces discoverable configuration and transient candidate times only. It does not:

- create, confirm, cancel, or reschedule an appointment;
- create an appointment hold or reserve capacity;
- guarantee that a returned candidate remains available;
- subtract appointment conflicts or enforce double-booking constraints;
- define appointment statuses, queue/check-in behavior, or daily operations;
- define booking idempotency, payment, refund, notification, encounter, chat, or video behavior;
- persist slots as source of truth.

Phase 05 MUST extend derivation with appointment/hold conflict inputs and enforce eligibility,
idempotency, ownership, and the database-level double-booking boundary at appointment write time.

## F04-T01 acceptance checks

- Every Phase 04 data concept has explicit fields, ownership, lifecycle, and validation.
- Visit modes, duration, post-visit buffer, integer rial price, and currency have one unambiguous
  representation.
- Admin and patient capabilities, pagination, filters, response visibility, stable errors,
  permissions, and audit boundaries are implementable without inventing product rules.
- Recurring local time, UTC instant storage, interval precedence, and candidate derivation are
  deterministic.
- No implementation, migration, generated client, Phase 03 behavior, or Phase 05 workflow is
  changed by this contract task.
