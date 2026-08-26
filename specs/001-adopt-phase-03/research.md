# Phase 03 Planning Research

## Decision: Preserve the roadmap and completed implementation

**Rationale**: The roadmap, contract, code, migrations, generated client, and focused tests already
establish the Phase 03 domain. The authoritative roadmap now records `F03-T01` through `F03-T08`
as complete, so planning starts at `F03-T09` without rebuilding earlier work.

**Alternatives considered**: Regenerating Phase 03 tasks or reimplementing completed backend work
was rejected because it would discard stable IDs, duplicate tested behavior, and violate the
constitution.

## Decision: Reuse the generated client and existing loaders

**Rationale**: Both frontends already use `@sabz-zendegi/api-client`, bearer tokens from their
session gates, the shared request timeout, small typed loader functions, and Vitest fetch mocks.
Remaining UI work fits those patterns directly.

**Alternatives considered**: Raw `fetch`, a new state/data library, handwritten endpoint types,
and a component-testing dependency were rejected as duplication with no current need.

## Decision: Add no model, migration, or endpoint

**Rationale**: Existing assessment versions, submissions, policy, admin lifecycle/results,
patient attempt/result, and eligibility interfaces cover `F03-T09` through `F03-T13`. Dashboard
activity can use filtered submission totals and rows; unsupported projections stay hidden.

**Alternatives considered**: New aggregate tables, activity models, or summary endpoints were
rejected because existing data supports the active contract and no scale evidence requires them.

## Decision: Correct generated request metadata only if integration requires it

**Rationale**: Some generated request DTOs currently appear as `Record<string, never>` because
their existing Swagger property metadata is incomplete. A write-flow type failure must be fixed at
that source and regenerated once, preserving the generated client as the single contract owner.

**Alternatives considered**: `as any`, duplicated frontend request interfaces, or a second client
were rejected because they hide contract drift. Proactive regeneration is also rejected unless an
active write path demonstrates the defect.

## Decision: Match verification depth to task risk

**Rationale**: Frontend integration needs focused fetch-mock specs and owning-package typechecks.
Backend authorization and contract tests run only if backend or generated contract paths change.
The two required browser journeys run at the Phase 03 exit gate, after integration stabilizes.

**Alternatives considered**: Running the full monorepo suite after each UI slice and adding a new
browser framework were rejected. Browser framework adoption can be reconsidered if CI enforcement
is explicitly required beyond the current phase evidence.
