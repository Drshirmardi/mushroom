# Provider-neutral deployment

Build four OCI images from repository root: API with `deploy/docker/Dockerfile.api`; each Next app with
`deploy/docker/Dockerfile.next --build-arg APP=web|app|dashboard`. Promote the tested immutable image digest unchanged.

Supported envelope: Linux/OCI host, PostgreSQL 16+ reachable by URL, HTTPS reverse proxy with WebSocket upgrade,
outbound HTTPS, and standard environment or mounted `*_FILE` secrets. `compose.yaml` remains development-only;
`compose.production.example.yaml` expects external PostgreSQL and file-backed secrets.

Run migrations explicitly from the promoted API image before a compatible release, for example:
`docker run --rm --env-file runtime.env IMAGE node_modules/prisma/build/index.js migrate deploy`.
Never attach it to normal API startup. No public runtime-config value may be a secret.
