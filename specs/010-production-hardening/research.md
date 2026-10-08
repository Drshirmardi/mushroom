# Phase 12 Research — Evidence and Decision Proposals

**Status**: Approved owner decisions are recorded below. External provider and merchant evidence remain execution gates.

## Repository evidence

### Existing deployment and storage

- `plan/01-ARCHITECTURE-REVIEW.md` approves independent deployability and simple container-based initial deployment, and rejects Kubernetes until a demonstrated need.
- No container, compose, provider, deployed environment, or deployment strategy is present in the repository.
- There is no implemented file-upload, attachment, medical-file, or object-storage path in `apps/api/src`. The only live file-adjacent product field is a validated external `profileImageUrl`; dashboard import texts are not product consumers. Object storage is therefore **not applicable for the current target release unless an owner separately confirms a real file feature**.

### Existing Sadad boundary

- `apps/api/src/modules/commerce/payments/sadad-payment-provider.adapter.ts` contains amount conversion, date formatting, callback validation and redirect profiles, but all real create/parse/Verify methods are dormant and fail closed.
- `patient-payment-attempt.controller.ts` exposes a callback endpoint that intentionally returns `SADAD_GO_LIVE_BLOCKED`; `payment-provider-config.service.ts` likewise denies enable/default.
- The frozen Phase 09 contracts require immutable encrypted credential versions and config revisions, server-side idempotency, Verify-authoritative payment recording, no sensitive callback logging, and acceptance evidence before activation.
- Consequently, the requested live transport/redirect/callback/Verify/retry/reconciliation work is a real implementation gap, not a configuration-only activity. It needs explicit roadmap task ownership before any plan may assign code paths.

### Capacity evidence

- `plan/logs/phase-10.md` records the immutable chat workload: `20 msg/s × 30 min`, 61-second gap, `50 msg/s × 5 min`, per-batch `<= 1000ms`.
- The same evidence records timing failures of `1015ms` and `1032ms`, then F10-T09 CI isolation: ordinary tests exclude the long workload while `test:capacity` and a scheduled/manual/chat-change workflow retain it unchanged.

## Approved deployment direction; external egress gate

Use separate staging and production projects/environments. Each receives isolated PostgreSQL, HTTPS, distinct least-privilege runtime identities, a non-production callback domain for staging, and an immutable release artifact promoted only after staging gates. Production promotion and rollback require the owner’s manual approval. The production API must have one provider-reserved static egress IPv4 before merchant registration; public inbound HTTPS must terminate at a managed load balancer or equivalent boundary.

**Candidate A — managed PaaS/DBaaS plus dedicated IPv4**: lowest operations burden; a current Liara pricing page lists 2 GB/1-core/20 GB PaaS and DBaaS plans at 589,000 Toman each per month and a separate IPv4 at 149,000 Toman/month, with provider capabilities such as deployment rollback and backups varying by tier. This is a cost signal, not a quote or proof that its egress IP is stable for Sadad; written provider and merchant confirmation are mandatory. [Liara pricing](https://mail.liara.ir/pricing/)

**Candidate B — managed IaaS/VPS with reserved static IPv4**: provides explicit network control and a fixed egress path, but transfers OS patching, PostgreSQL backup/restore, deployment, monitoring, and incident responsibility to the team. It is appropriate only if the selected vendor gives a contractual/static IP and operational ownership is accepted. The same Liara page lists a 2 GB/1-core/20 GB IaaS plan at 589,000 Toman/month plus IPv4, while another Iranian vendor’s advertised entry option begins around 1,580,000 Toman/month; neither is a binding budget. [Liara pricing](https://mail.liara.ir/pricing/), [Webramz pricing](https://webramz.com/server/cloud)

**Approved direction**: Liara is selected as the initial provider target, with separate staging/production, PostgreSQL, HTTPS, promotion of the tested artifact, and owner-manual production approval. Static **outbound** egress IP and Sadad suitability remain an external written-confirmation gate assigned to the project owner; inbound or dedicated IP does not satisfy it. If unavailable, the owner chooses the alternative; the baseline does not switch providers automatically. Do not select Kubernetes, a new cache, a replica, or object storage at this stage.

## Approved capacity and availability profile

This proposal preserves the Phase 10 workload unchanged. It is a release-envelope proposal, not a pass/fail replacement for it.

| Journey | Initial profile | Proposed success measure |
|---|---:|---|
| Auth, onboarding, assessment, directory/booking and encounter reads/writes | 10 authenticated requests/s mixed peak, 30-minute steady run | ≥99% successful responses; p95 server response ≤750 ms, excluding external provider calls |
| Booking write conflict path | 2 requests/s against the same offered slot for 10 minutes | zero duplicate appointment/hold allocation; authorized conflict outcome only |
| Chat | Existing frozen 20/50 msg/s workload | unchanged: every batch ≤1000 ms and sequence/count invariants hold |
| Sadad create/callback/Verify | automated simulated transport; real acceptance rate only per merchant-approved test plan | zero duplicate financial effect; only authoritative Verify creates verified payment |
| Availability | public API health/readiness plus approved critical synthetic journeys | approved: ≥99.5% per calendar month, reported raw and adjusted separately; measurement is an implementation/sign-off obligation, not current evidence |

Availability monitoring is separate from capacity-test success rate: two independent locations probe HTTPS every 60 seconds and a dedicated non-human identity runs safe synthetic authenticated checks every five minutes. Only recorded pre-approved/announced maintenance is excluded from adjusted availability. Documented upstream Sadad outage may be excluded only from adjusted payment-journey availability; end-to-end payment availability retains it, and adapter/application defects are always included.

## Approved recovery and secret direction

- **PostgreSQL**: daily encrypted base backup plus continuous WAL/archive capability; approved RPO ≤15 minutes and RTO ≤4 hours. A restore drill must prove data integrity and application migration compatibility before release; the selected service must prove the needed capability.
- **Secrets**: the deployment environment's managed secret store, never Git, dotenv files, logs, or client code. Rotation is immediately on exposure/revocation and every 90 days for runtime secrets. Payment credentials remain in encrypted immutable revisions; encryption keys remain outside Git/database and key rotation must preserve historic readability.
- **Object storage**: approved N/A based on current source evidence. Re-open only with a real upload/file consumer and then require private buckets, encryption, retention, restore drill, signed access, and a separate approved provider configuration.

## Demo alignment

No demo reference was supplied. The later task must compare each approved demo claim only with running code, API contracts and non-secret evidence; it must not treat dashboard import text or mock-looking artifacts as a product capability.

## Continuous delivery and VPS rehearsal decision

The approved release path is GitHub Actions to private GHCR to a non-production Linux VPS over OpenSSH. This keeps
application artifacts OCI-provider-neutral: Liara, another OCI PaaS or a Docker-capable VPS consumes the same digest
set. GitHub-hosted runners are ephemeral; the VPS has a restricted non-root `deploy` user and no self-hosted runner,
polling agent or provider SDK.

The one-VPS rehearsal uses two independent deployment roots and Compose project names. `staging` is automatic after a
successful protected-main CI/publication run. `production-sim` consumes the exact staging manifest only through a
manual promotion workflow run by the configured owner. This explicit dispatch is the portable approval gate for a
private repository. The selected GitHub Free rehearsal uses repository-scoped credentials on its one test VPS and an
explicit owner check; separately scoped credentials and an approval-capable control plane remain mandatory for real production.
Private GHCR pull access exists only for the duration of deployment via a temporary Docker configuration and a
read-only job token; it is not persisted under the deploy user's home.

This repository can prepare and locally validate the complete workflow before a VPS exists. Live acceptance still
requires a host/IP, pinned host key, restricted account, environment-scoped GitHub secrets, isolated runtime secret
files and at least a baseline plus two sequential updates. Those are execution inputs, not reasons to couple runtime
code to Liara.
