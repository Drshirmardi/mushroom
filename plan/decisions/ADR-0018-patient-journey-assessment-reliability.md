# ADR-0018 — Patient Journey backend: assessment reliability first

- Status: ACCEPTED for the technical scope of F12-PJ-R01, 2026-10-16.
- Authority: explicit owner instruction in the Patient Journey conversation to begin implementing the reviewed backend requirements and use relevant skills/plugins. No clinical, pricing, retention or provider decision is inferred.
- Phase/task: Phase 12 / F12-PJ-R01; no closed phase is reopened.

## Context

The existing individual assessment engine already validates/scorers version-bound answers and preserves completed data through PostgreSQL triggers. Patient submission start/save/submit currently read outside their write transaction; start can race, concurrent submission retries can fail or reuse another resource's result, draft saves have no concurrency token and sensitive audit can fail after persistence. Paid/couples use must not inherit these defects.

## Decision

Keep the existing engine and endpoints. Serialize start by patient/version using a transaction-scoped advisory lock; serialize mutations using an owned submission row lock, and completion keys by patient/key. Add a database partial unique active-attempt index and a nonnegative server-owned revision. Existing duplicate active attempts block the migration for reviewed resolution; never delete or invalidate old answers automatically.

Expose revision additively. Existing payloads remain supported; clients may supply expectedRevision for save/submit. A stale changing command fails with a stable 409. Equal canonical draft retries are no-ops. Identical completed submit replay is tied to the same resource/key and returns the original result. Every sensitive read and changed write records audit in the same transaction; failure produces no successful response or partial mutation. Latest Mezaj excludes invalidated source submissions.

Existing scoring, MAIN/MEZAJ separation, clinical review visibility, booking eligibility and published-version rules remain unchanged. Clinical publication/review policy requires its own approved contract. No new assessment engine, billing implementation, state-machine table or frontend is introduced.

## Alternatives Considered

- Full assessment rewrite: rejected; the scoring and immutable versions already exist.
- Application checks alone: rejected; locks and a database active-attempt invariant are both required.
- Mandatory revision for old endpoints: deferred; would break current consumers. New paid/couples contracts must require a revision and enforce their own access rules at every entry point.
- Automatic cleanup of duplicate attempts: rejected; would make an unapproved decision about existing patient data.

## Consequences

New clients can prevent stale overwrites; old clients retain serialized last-write-wins draft compatibility. This limitation is explicit and must not be advertised as full stale-write protection for old clients. The additive trigger advances revisions for old application writes too. Completed historic results are neither recalculated nor rewritten.

## Implementation Impact

One additive migration, the assessment patient service/controller/DTO, audit action and stable error constants, focused tests and official generated contracts. Apply only to disposable PostgreSQL during implementation; persistent deployment/migration and provider calls are outside authorization.

## Validation

Real PostgreSQL concurrent starts/save/submit/key collisions, stale save, immutable completion, audit rollback, invalidation/ownership, fresh replay, legacy upgrade and duplicate-active migration refusal. Verify existing generated consumers still typecheck and old wire paths remain.

## Revisit Trigger

Before any paid or couples offering uses this engine, freeze strict revision/access, clinical result release, algorithm, consent and entitlement contracts under separately reviewed tasks.
