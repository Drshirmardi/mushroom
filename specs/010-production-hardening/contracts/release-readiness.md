# Release Readiness Contract

## Availability

- Scope: API health/readiness and synthetic sign-in/session refresh, onboarding status, assessment submission, directory/availability/booking, encounter read, and gated payment-status journey.
- HTTPS probes: every 60 seconds from at least two independent locations; success is expected HTTPS status within monitor timeout.
- Synthetic checks: every five minutes using a dedicated non-human identity and no financial side effect; success requires the safe expected journey outcome.
- Raw availability = successful observations / all observations × 100.
- Adjusted availability = successful observations / (all observations − only observations inside recorded pre-approved/announced maintenance) × 100.
- Payment adjusted availability may additionally exclude a documented upstream Sadad outage. End-to-end payment availability never excludes that outage. Adapter defects, timeout/retry defects and all other application faults are never excluded.

## Sadad activation

`SADAD_GO_LIVE_BLOCKED` remains until: provider static outbound-egress written confirmation; merchant acceptance evidence; endpoint/redirect/callback profile; off-Git credentials; controlled plan; observed callback Content-Type/casing; Amount/redirect/Verify including optional TransactionDate; alert/runbook coverage; and merchant/project-owner sign-off. Environment placeholders cannot enable, default, or invoke external payment.

## Capacity and recovery

- Phase 10 chat workload and `<=1000ms` per-batch threshold are immutable without approved change control.
- Mixed authenticated profile is `10 req/s × 30 min`, p95 `<=750ms`, success `>=99%`; booking conflict is `2 req/s` on one slot with zero duplicate allocation.
- PostgreSQL recovery objective: RPO `<=15 min`, RTO `<=4 h`, daily base backup plus continuous WAL/archive, restore drill required.

## Continuous delivery

- Publication is allowed only for the exact commit of a successful protected-branch `CI` run on `main`.
- A release manifest contains API, web, app and dashboard references in `registry/name@sha256:<64 hex>` form plus the
  source commit and workflow run. A mutable tag is never accepted as deployment input.
- Staging deploys automatically and serially. Production-sim deploys only through an owner-authorized manual workflow
  that revalidates the successful staging run and its exact manifest; an Environment reviewer may add a second gate.
  Neither path rebuilds an image.
- SSH must verify the environment-scoped pinned host key and use a restricted non-root account. The deploy script must
  reject an unexpected environment root, Compose project or production-like Sadad setting.
- Private-registry credentials are temporary. The deployment removes its Docker credential directory after pulling
  exact digests, whether the deployment succeeds or fails.
- Migration failure leaves the active application release untouched. A staging post-switch verification failure
  automatically restores the previous application manifest. Production-sim and production rollback are explicit,
  owner-approved operations. No automated path resets or rolls back the database.
