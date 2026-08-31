# Phase 03 Browser Evidence

## F03-T12 — Assessment and booking eligibility

- Run: `2026-08-27 14:08 +03:30`
- Browser: Codex in-app browser against local `web` (`3000`), patient app (`3001`), dashboard (`3002`), and API (`3003`).
- Assessment: `F03-T12 2026-08-27T10:28`, published version `1`.
- Test account: disposable local patient created through `/signup`; no password, token, or personal data is recorded here.

### Required journey — prerequisite enabled

- The administrator published the timestamped `MAIN` version and selected it as the enabled booking prerequisite.
- The completed patient profile first returned `MAIN_ASSESSMENT_REQUIRED`; the direct booking route displayed “complete assessment” and opened `/assessment`.
- The patient saved one answer, left the route, and returned to the same attempt with the selected answer restored.
- The attempt completed once with score `0`, no result band, version `1`, and an immutable stored result. Focused API coverage also verifies identical completion replay and rejects changed payload reuse for the same idempotency key.
- Booking then displayed doctor selection (step 1 of 3), confirming that the server gate allowed the patient.
- The dashboard patient workspace showed the same assessment title, version `1`, score `0`, no result band, completion state, and attempt `1`.

### Optional journey — prerequisite disabled

- The administrator disabled the booking prerequisite without changing or deleting the completed submission.
- Direct booking immediately displayed doctor selection with an eligible response.
- The immutable patient result and the dashboard patient-workspace result remained visible with the same title, version, score, result state, and attempt.

### Screenshots captured in the test run

- Blocked direct booking state and assessment CTA.
- Resumed assessment with the selected answer.
- Immutable patient result.
- Eligible doctor-selection state.
- Dashboard patient-workspace result.

### Commands

- Focused five-file API suite → PASS (`5 files / 30 tests`).
- API typecheck → PASS.

## F03-T13 — Milestone A closure

- Run: `2026-08-27 14:29 +03:30`.
- Mock audit: `apps/app/src/lib/data/assessments.ts` was the only remaining Phase 03 assessment mock artifact. It had no importers and was deleted. The assessment mock records retained in Phase 06–08 UI scopes are not Phase 03 artifacts and were left unchanged.
- Patient flow: published assessments, persisted drafts, immutable stored results, and the booking gate are supplied by the generated API contract.
- Dashboard flow: assessment lifecycle, booking policy, dashboard activity, and patient-workspace results are supplied by real assessment endpoints.
- Browser gate: both enabled and disabled requirement journeys passed under F03-T12; blocked, resumed, result, eligible, and dashboard-agreement states were captured in that run.
- Migration gate: F03-T02 recorded a clean migration and upgrade smoke test from an empty database; no schema or migration changed after that verification.
- Current focused verification: app tests (`2 files / 6 tests`), dashboard tests (`2 files / 9 tests`), API contract suite (`5 files / 30 tests`), app/dashboard/API/API-client typechecks, and `git diff --check` all passed.

Milestone A result: registration/authentication, onboarding/consent, versioned main assessment, configurable server eligibility, and the Phase 03 browser gate have evidence. `Phase 03` and `Milestone A` are complete; `Phase 04` is not started.
