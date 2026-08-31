# Phase 04 Planning Research

## Decision: Preserve the Phase 04 roadmap verbatim

**Rationale**: `plan/phases/04-CLINIC-DIRECTORY-AVAILABILITY.md` already defines the phase scope,
twelve stable task IDs, domain rules, and exit criteria. `plan/STATUS.md` confirms that Phase 04 is
`NOT_STARTED`, no batch is active, and only `F04-T01` is next eligible.

**Alternatives considered**: Regenerating tasks, decomposing the roadmap, pre-claiming a batch, or
marking documentation work as Phase 04 progress were rejected because the constitution makes the
roadmap and execution workflow authoritative.

## Decision: Leave the field and endpoint contract for F04-T01

**Rationale**: Contract freezing is itself the first roadmap task. Adoption may preserve the
required concepts—doctor/service fields, visit mode, minute duration and buffer, integer price,
and currency—but must not preempt the task by inventing exact schemas, enums, routes, or response
shapes.

**Alternatives considered**: Defining a speculative endpoint catalog or detailed DTO schema in the
Spec Kit contract was rejected because it would silently start `F04-T01` and could conflict with
the existing architecture review gate.

## Decision: Keep directory and scheduling ownership separate inside the modular monolith

**Rationale**: The target architecture assigns Clinic, DoctorProfile, Specialty, Service,
DoctorService, and DoctorClinic concepts to `directory`; it assigns AvailabilityRule and related
appointment capacity to `scheduling`. Existing modules use feature-local controllers, services,
DTOs, and Prisma access without introducing unused layers.

**Alternatives considered**: A new microservice, a generic catalog platform, or a combined
appointment module was rejected as unnecessary and outside the approved architecture and Phase
04 boundary.

## Decision: Derive availability; do not persist slots as truth

**Rationale**: The Phase 04 domain rules explicitly state that a slot is not an independent source
of truth. Current working rules, clinic closures, doctor leave, doctor-specific exceptions,
offering duration/buffer, activity, and publication state must determine each query result.

**Alternatives considered**: Pre-generating permanent slot rows was rejected because schedule
changes could leave stale bookable capacity and would contradict the phase contract. Appointment
holds and conflict-safe booking belong to Phase 05.

## Decision: Reuse identity, authorization, audit, and generated-client mechanisms

**Rationale**: The current repository already provides authenticated administrator/patient
boundaries, audit-event persistence, generated OpenAPI types, shared client wrappers, and
truthful frontend state patterns. Phase 04 extends those mechanisms under its existing tasks.

**Alternatives considered**: A new identity linkage requirement for doctors, handwritten frontend
types, raw unshared clients, or a second audit system were rejected as duplication. DoctorProfile
must remain creatable before a login account exists.

## Decision: Keep verification proportional and defer it to the roadmap gates

**Rationale**: Task-level work should run focused tests and owning-package typechecks. Migration
smoke, authorization/audit, overlap, timezone, query-plan, and browser verification are required
at the task/phase points already named by `F04-T02`, `F04-T07`, and `F04-T11`; final evidence is
owned by `F04-T12`.

**Alternatives considered**: Running the full monorepo suite after each slice or adding a new
browser framework during adoption was rejected. Broader checks remain justified only by the
phase gate or discovered cross-module risk.
