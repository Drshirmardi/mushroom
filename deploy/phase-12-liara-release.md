# Phase 12 Liara staging and production release path

Status: implementation preparation only — no Liara project, database, domain, secret, deployment, or payment connection is provisioned by this document.

## Fixed release envelope

- Liara is the initial target provider. Staging and production are separate environments, each with its own PostgreSQL database, HTTPS endpoint and least-privilege runtime identity.
- Build exactly one immutable, versioned release artifact from the reviewed commit. Deploy that artifact to staging first. Production may receive only the same digest after staging gates pass and the project owner manually approves promotion.
- A production rollback is the project owner's manual decision and redeploys the last known-good immutable artifact; it does not roll back database data by assumption. Migration and database rollback safety remain F12-T10 work.
- No release is described as production-ready by this preparation. F12-T03 through F12-T13 retain their capacity, recovery, secret, monitoring, migration, security, browser and final sign-off gates.

## Staging path

1. Build the API and client applications from the selected commit, record the immutable artifact digest and associate it with that commit.
2. Configure staging only with its isolated PostgreSQL URL, HTTPS origins/proxy allowlist and managed deployment-secret references. Do not place secrets in Git, an artifact, or a release note.
3. Deploy the recorded artifact digest to the separate staging service and run the task-owned checks. A staging database migration is an explicit F12-T10 procedure, not an implicit deploy side effect.
4. Record the digest, environment, migration state and non-secret verification result in the owning task's evidence. Failed staging verification stops promotion.

## Production promotion and rollback boundary

1. Before promotion, verify that the production target references the exact staging-tested artifact digest and that the project owner has approved this release.
2. Use production-only managed secret references and its isolated PostgreSQL database. Do not copy a staging database, environment file or credential revision into production.
3. Promote the unchanged digest. Run post-deploy probes and release checks once F12-T09 owns their implementation; this document does not claim they exist yet.
4. On a release regression, the owner may redeploy the recorded prior good digest. Preserve evidence, stop automatic retry/promotion, and use the F12-T10 migration procedure for any database decision.

## Sadad boundary

`SADAD_GO_LIVE_BLOCKED` remains in force. The project owner must obtain Liara's written confirmation that the production API has a static **outbound** egress IP acceptable to Sadad. An inbound or dedicated IP is not evidence of this capability. This prerequisite, merchant endpoint/redirect/callback evidence, off-Git credentials and the final owner sign-off block only real Sadad connection, enable/default and payment sign-off; none is satisfied by creating an environment value or this document.

If Liara cannot provide the required outbound capability, record the evidence and request an owner decision. Do not change provider autonomously.
