# Phase 12 migration rollout and application-rollback rehearsal

This is the F12-T10 release procedure. It is intentionally limited to an application-artifact rollback: accepted
Prisma migrations are immutable and are never reversed on a release database.

## Policy

1. **Expand:** add backward-compatible tables, columns, indexes, enums or constraints first. Do not remove or rename a
   field while a previous application artifact can still run.
2. **Migrate:** run the reviewed, immutable `prisma migrate deploy` command once against the target release database
   before the new API artifact is promoted. Capture its exit status and `prisma migrate status`; do not run migration
   from normal API startup.
3. **Contract:** only after the previous artifact has been retired, an independently reviewed later release may remove
   obsolete compatibility paths. That operation requires its own rehearsal and rollback plan.
4. **Rollback:** roll back only the application artifact to the previously verified digest/source artifact while the
   expanded schema remains in place. Do not use `prisma migrate reset`, down SQL, table truncation, or destructive data
   rollback. If a later migration makes the older artifact incompatible, stop rollout and use a forward-fix migration
   that restores compatibility; preserve all existing data and migration history.

## Required rehearsal

- Use a fresh, labelled PostgreSQL 16+ container and uniquely named child databases only. Never target shared,
  staging or production databases.
- Run `prisma validate`, `prisma generate`, `prisma migrate deploy` and `prisma migrate status` from the release API
  artifact/source. Confirm every accepted migration is applied once on an empty database.
- Recreate the prior schema baseline with its immutable migration SQL, then apply the reviewed current migrations in
  order. Confirm the added schema objects and indexes without destructive SQL.
- Start the previous application artifact against the current schema, then the current artifact, then the previous
  artifact again. Each must reach the API health endpoint before the next step. This proves application rollback does
  not corrupt data or fail startup; it does not claim a database rollback.
- Record command, elapsed time, result, artifact identifiers and cleanup in Phase 12 evidence. A failed rehearsal is
  `REWORK`; do not promote or attempt a destructive rollback.

## Scope boundary

This procedure does not approve a production deployment, provider action, Sadad activity, capacity test, security
scan, backup restore, secret rotation or multi-instance rollout. Those gates remain owned by their respective Phase 12
tasks.
