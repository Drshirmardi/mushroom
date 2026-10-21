# ADR-0039 — Standalone server preparation and private-repository CD

Status: accepted for implementation by explicit owner instruction, 2026-10-21.
Task: F12-T02-I01. Existing clinical/legal/provider/production sign-off gates remain separate.

The owner will copy a self-contained installation archive to an Ubuntu 24.04 server, run it there, answer configuration questions, then manually enter the generated connection material in GitHub Actions and dispatch the first deployment. Server preparation must not require cloning the private repository or a permanent GitHub/GHCR token.

Use `installation/` for the launcher, Python standard-library manager, tests, packaging and operator documentation. Reuse existing dev source-sync and immutable release scripts. Root is needed only for host preparation; deployment runs as a non-root deployment user. Keep the existing external PostgreSQL production boundary. Real production uses a separately scoped SSH identity and the reviewed staging image manifest. Default promotion requires the named owner; an explicit installer choice and repository variable may authorize automatic promotion only after successful same-repository main/staging acceptance. Rehearsal behavior remains available.

Generate internal secrets once, never replace existing values on rerun, write files atomically, exclude generated secrets from the archive, validate before changing services, lock mutations, and expose incomplete stages honestly. Store SSH private handoff material separately with mode 0600; it is manually transferred to GitHub and removable after testing access. Never print it in normal logs.

DNS records are supplied for the operator; automatic certificate issuance starts only after DNS points to the server. Production requires an operator-supplied reviewed consent document and first administrator details. Bootstrap creates only a clinic and first administrator, transactionally, without demonstration or clinical data. It must reject adding an administrator to an existing installation and must not reset an existing password on retry.

Provider-managed backup/PITR, SMS/payment acceptance and production media authorization are not fabricated by this installer. Surface these as explicit operational prerequisites and retain existing fail-closed application gates. A tested installer is not a signed-off production deployment.
