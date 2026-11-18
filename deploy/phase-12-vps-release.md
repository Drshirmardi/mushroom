# Phase 12 VPS staging and production release path

## Current state

The project is deployed on its personal Linux VPS. Per the project owner, the shared `dev` environment is running and
Sadad has passed a live test there. This records dev acceptance only; it does not claim that staging or production
has passed its environment-specific release and payment checks.

The repository's automated staging and `production-sim` workflow is a rehearsal path on a non-production VPS. Real
production uses the separate production deployment workflow and its own credentials and database configuration; it
may use the same personal VPS host if the production environment remains isolated. Do not treat `production-sim` as
the live production environment.

## Environment boundaries

- Keep `dev`, `staging`, `production-sim` and real `production` settings distinct. Each environment needs its own
  runtime configuration, origins, callback routing, secret files, database and release state.
- Production uses an external PostgreSQL database. Do not promote a staging database, dump, runtime file or secret
  into production.
- Keep secrets in permission-restricted files on the VPS or an equivalent protected secret store. Never put them in
  Git, image build arguments, release artifacts or logs.
- The current API realtime/session state is single-instance. Keep one API replica until a distributed Socket.IO
  adapter is approved and verified.

## Staging rehearsal

1. Select a reviewed commit and require the complete CI and applicable artifact checks to pass.
2. Build and publish the four OCI images once; retain their immutable digests and release manifest.
3. Deploy the same manifest to the isolated staging environment on the VPS. Keep its database, domain, ports and
   secret files separate from dev and production.
4. Apply the reviewed migration once, then verify migration status, API readiness, web/app/dashboard health, browser
   journeys, logs, monitoring and backup/restore evidence.
5. Run the required capacity, security and recovery checks. Record the commit, image digests, migration state,
   environment and non-secret results. A failed check stops promotion.

The automated VPS rehearsal described in [VPS CI/CD](vps/README.md) is intentionally synthetic: its staging and
`production-sim` environments do not allow real patient data or a live Sadad connection. If a real bank acceptance
test is required before production, prepare a separate production-like staging runtime on the personal VPS, with its
own database, secret files, domain/callback routing and release state. Do not turn the synthetic rehearsal environment
into a live payment environment.

## Sadad acceptance by environment

The dev VPS Sadad test is complete according to the project owner. Preserve that result as dev evidence.

Before enabling Sadad in a production-like staging runtime or production, verify that environment's
`SADAD_TRANSPORT_MODE`, exact callback URL, redirect profile, registered VPS egress IP and encrypted merchant
credentials. Run an authorized transaction and confirm server-side Verify, one persisted payment on callback replay,
correct reconciliation after timeout, and the disabled-adapter behavior. Record evidence without tokens, credentials,
cookies or card data.

The merchant callback route must point to only one active environment at a time unless Sadad has explicitly approved
separate callback paths. Reconcile outstanding attempts before moving the callback from dev to staging or production.
Keep transport disabled in the synthetic rehearsal staging, `production-sim` and production until the applicable
environment-specific test and release approval are complete. A separate production-like staging runtime may enable
Sadad only during its authorized test window.

## Production promotion

1. Verify all applicable Phase 12 capacity, recovery, secret rotation, monitoring, migration, security, browser and
   owner sign-off gates.
2. Confirm staging accepted the exact immutable manifest and all environment-specific checks passed.
3. Use the production workflow, production-only host credentials and production database configuration. Promote the
   unchanged image digests; do not rebuild between staging and production.
4. Run production health and smoke checks, then record the release evidence and owner approval.

Rollback replaces only the application artifact with the previously accepted digest. Never reverse an accepted
Prisma migration or reset production data; use the [migration and rollback rehearsal](phase-12-migration-rollout.md)
for the database safety procedure.
