# Provider-neutral deployment

Build four OCI images from repository root: API with `deploy/docker/Dockerfile.api`; each Next app with
`deploy/docker/Dockerfile.next --build-arg APP=web|app|dashboard`. Promote the tested immutable image digest unchanged.

Supported envelope: Linux/OCI host, PostgreSQL 16+ reachable by URL, HTTPS reverse proxy with WebSocket upgrade,
outbound HTTPS, and standard environment or mounted `*_FILE` secrets. `compose.yaml` remains development-only;
`compose.production.example.yaml` expects external PostgreSQL and file-backed secrets.

Run migrations explicitly from the promoted API image before a compatible release, for example:
`docker run --rm --env-file runtime.env IMAGE node_modules/prisma/build/index.js migrate deploy`.

پس از migration و پیش از فعال‌سازی application، محیط باید policy رضایت versioned و مخصوص همان environment را با
`node prisma/manage-consent-policy.mjs publish` منتشر و با فرمان `verify` کنترل کند. VPS rehearsal این مرحله را با
سند محدودشدهٔ non-production خودکار انجام می‌دهد؛ اجرای seed توسعه جایگزین این gate نیست.
Never attach it to normal API startup. No public runtime-config value may be a secret.

The automated rehearsal path is documented in [`vps/README.md`](vps/README.md). It uses the same four image digests,
an isolated PostgreSQL container per Compose project, pinned SSH host keys and temporary private-GHCR credentials.
That database topology is for the non-production VPS rehearsal only; production keeps the external PostgreSQL contract.
