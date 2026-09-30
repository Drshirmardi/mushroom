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
