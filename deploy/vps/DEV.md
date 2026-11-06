# Shared Dev runtime image

Dev Compose builds Debian Bookworm packages over HTTPS using the owner-tested
`https://mirror.famaserver.com/debian` archive and the official
`https://security.debian.org/debian-security` security archive. The Dockerfile's
standalone default remains the official Debian archive for portable CI builds.

The slim Node base initially lacks a CA bundle. A tiny `alpine:3.20` build stage
supplies the public Mozilla trust bundle, copied only into the temporary build
filesystem. APT uses it to verify signed Debian metadata, then installs Debian's
`ca-certificates` and OpenSSL and removes the temporary copy. No host path,
BuildKit secret or filesystem entitlement is involved, so Compose/Buildx versions
that reject host-file entitlements can still build the Dev runtime. Requests have
a 20-second timeout and one retry; an incomplete index update fails the build.

Verify a standalone build with `bash scripts/test-dev-runtime-image.sh`. The
existing deployment fingerprint includes both the Dockerfile and Compose model,
so the next reviewed Dev sync rebuilds the runtime automatically. Installer
self-update is unnecessary for this application deployment change.
