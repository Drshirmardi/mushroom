<!--
Sync Impact Report
- Version change: unratified scaffold -> 1.0.0
- Modified principles: template placeholders -> ten project-specific principles
- Added sections: Architecture and Contract Boundaries; Development Workflow and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->
# Mushroom Constitution

## Core Principles

### I. Scope Discipline
Work MUST be limited to the currently active roadmap task or an explicitly requested slice of it.
Future-phase requirements and unrelated refactors MUST NOT be implemented. New abstractions and
dependencies require a current, concrete need. The preferred solution is the smallest correct
change that satisfies the active contract.

### II. Existing Architecture Is Authoritative
Implementation MUST first inspect and follow established project patterns. Existing API
contracts, domain rules, naming conventions, module boundaries, and persistence patterns MUST be
preserved unless the active specification explicitly changes them. Work already completed under
the roadmap MUST NOT be reimplemented merely because Spec Kit was adopted later.

### III. Phase-Driven Development
The existing authoritative 12-phase roadmap defines delivery order, phase boundaries, stable task
IDs such as `F03-T01`, contracts, and completed-work status. Spec Kit MUST adapt to that roadmap
and MUST NOT regenerate or replace it. Only one phase may be active for implementation at a time.
A phase is DONE only when all explicit exit criteria are satisfied. Future phases MUST remain
summarized until activated.

### IV. Context Efficiency
Work MUST begin from the active phase and task and load only the files, contracts, modules, and
dependencies relevant to them. Searches MUST be targeted. Broad repository exploration is
permitted only to resolve a concrete dependency or risk. Unchanged documentation and unrelated
directories MUST NOT be repeatedly loaded.

### V. Risk-Based Testing
Testing depth MUST match the change's regression risk. Tests MUST cover affected domain
invariants, authorization boundaries, persistence behavior, API contracts, and critical user
journeys where applicable. Tests MUST NOT duplicate existing coverage or test framework behavior
without a concrete risk. Per-task work uses targeted tests; broader suites and browser E2E run
only when phase exit criteria or cross-module risk require them.

### VI. Verification Levels
Task-level verification MUST include lint or type checking and targeted tests for affected areas,
as applicable to the owned paths. Phase-level verification MUST include the relevant frontend or
backend suites and every explicit phase E2E requirement. Milestone verification MUST exercise
critical end-to-end user journeys and the broader regressions named by the roadmap. Passing a
higher level does not waive explicit lower-level acceptance criteria.

### VII. Implementation Checkpoints
Large roadmap tasks MAY be divided into coherent implementation slices, but every slice MUST
retain the original roadmap task ID. Each slice MUST be implemented and verified before the next
slice begins. A large phase MUST NOT be executed as one uncontrolled work unit.

### VIII. Contract and Domain Integrity
Domain contracts and explicit phase rules take precedence over implementation convenience.
Authorization, idempotency, lifecycle rules, versioning, data immutability, and transactional
invariants MUST be enforced server-side where applicable. UI guards MAY improve usability but
MUST NOT be the sole enforcement mechanism.

### IX. Evidence-Based Definition of Done
A task is DONE only when its implementation, acceptance criteria, and required verification are
complete. Compilation or superficial UI behavior alone is insufficient. Unresolved gaps MUST be
recorded against the active task; they MUST NOT be hidden or used to silently expand scope.

### X. Proportionate Spec Kit Usage
Spec Kit MUST operate at the phase level and MUST NOT replace the roadmap's individual tasks.
Clarification is required only for material ambiguity. Cross-artifact analysis is used when it
improves consistency confidence, and convergence is used at phase end to identify genuine gaps.
Process artifacts MUST NOT be created when they do not improve implementation confidence.

## Architecture and Contract Boundaries

- The monorepo consists of Next.js frontend applications and a NestJS backend; changes MUST
  respect their existing module and ownership boundaries.
- Executable code, tests, migrations, and generated contracts remain authoritative for current
  implementation behavior, while the roadmap remains authoritative for delivery scope and status.
- Shared contracts, generated clients, migrations, authentication, module wiring, and other
  single-writer surfaces MUST have one coordinated owner per active batch.
- Existing public API behavior and persisted data semantics MUST remain compatible unless the
  active phase explicitly authorizes a migration or breaking change.
- Completed roadmap status is immutable historical evidence unless a concrete regression is found
  and recorded as active work.

## Development Workflow and Quality Gates

1. Identify the single active phase, active task ID, dependencies, owned paths, acceptance
   criteria, and required checks before implementation.
2. Inspect the established flow and affected callers, then select the smallest correct change.
3. Implement only a coherent task slice and preserve unrelated worktree changes.
4. Run task-level checks first. Escalate to phase or milestone checks only when required by exit
   criteria or justified by cross-module risk.
5. Review the diff against scope, architecture, security and data boundaries, contracts, and
   acceptance criteria before marking the task DONE.
6. Record genuine gaps without activating or expanding a future phase. At phase end, use Spec Kit
   convergence when it can expose remaining implementation gaps.

## Governance

This constitution governs Spec Kit usage and implementation workflow for the repository. The
authoritative roadmap retains control of product scope, sequencing, phase boundaries, task IDs,
contracts, and completion history. When process guidance conflicts, the stricter rule that
preserves roadmap scope, domain integrity, and verified behavior applies.

Amendments MUST be documented in this file with their rationale and impact. Changes require
maintainer approval and, when they alter active work, an explicit migration plan that preserves
stable roadmap IDs and completed status. Versioning follows semantic versioning: MAJOR for
incompatible governance changes or principle removals, MINOR for new principles or materially
expanded obligations, and PATCH for clarifications without changed obligations.

Every active-task review MUST verify constitution compliance. Any exception MUST be explicit,
time-bounded, justified by the active task, and recorded with its removal condition. The
constitution itself MUST be reviewed when the roadmap's governance model or architectural
boundaries materially change.

**Version**: 1.0.0 | **Ratified**: 2026-08-26 | **Last Amended**: 2026-08-26
