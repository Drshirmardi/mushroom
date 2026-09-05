# Phase 08 Validation Quickstart

This guide preserves Phase 08 validation gates. Live execution state is authoritative in [`plan/STATUS.md`](../../plan/STATUS.md); F08-T10 restart-recovery rework is accepted and Phase 08 is `READY_FOR_REVIEW` pending independent closure review.

## Preconditions for future execution

- Phase 05 remains `DONE (CLOSED)`.
- Phase 07 remains `DONE (CLOSED)` and provides the established treatment-scheduling baseline for a future treatment reminder.
- A future coordinator has selected only eligible roadmap tasks, frozen the relevant contract, assigned non-overlapping owned paths, and recorded a batch claim in `plan/STATUS.md`.
- Existing non-secret environment, PostgreSQL, patient and authorized dashboard setup, and the repository validation tooling are available.

## Future task-level verification boundary

- `F08-T01`: contract-focused review and targeted validation for metric, unit, range, and observation query behavior.
- `F08-T02`: targeted PostgreSQL/API/dashboard checks for tracker writes, reads, access boundaries, and shared observation display.
- `F08-T03`: focused versioned-assessment-to-mezaj result coverage.
- `F08-T04`: notification, preference, in-app read-state, authorization, and repeat-safe behavior coverage.
- `F08-T05`: publication lifecycle, media-policy, authorization, and published-only patient-visibility coverage.
- `F08-T06`: approved ADR review and bootstrap verification only if a real reminder/job requires it.
- `F08-T07`: idempotent appointment/treatment reminder, retry, schedule-source, and durable side-effect coverage.
- `F08-T08`: patient-app tracker, notification, and article connection checks with truthful loading, error, forbidden, and empty states.
- `F08-T09`: dashboard health, notification, and content connection checks with truthful loading, error, forbidden, and empty states.

## Integrated phase gate (`F08-T10` and `F08-T11`)

1. Record or view one permitted health observation and confirm the authorized patient app and dashboard show the shared source.
2. Exercise the assessment-derived mezaj result only through its accepted versioned-assessment source.
3. Exercise preference-respecting in-app notification read state and an appointment/treatment reminder retry across a restart and timezone boundary.
4. Confirm reminder processing is independent of the initiating HTTP request and remains repeat-safe.
5. Confirm patient content visibility is limited to published content.
6. Run the required browser journey and mock-scope review before recording evidence and Milestone C review.

**Pass criteria**: all four Phase 08 exit criteria pass, the in-scope app and dashboard use real sources, reminder delivery is idempotent/retryable, and evidence/status updates occur only after the authoritative review gate.

## Safety boundary

Do not run this guide as an authorization to begin `F08-T01`. Implementation, claims, task checkboxes, phase status changes, migrations, generated-client work, Phase 07 changes, and evidence entries remain outside this preparation.
