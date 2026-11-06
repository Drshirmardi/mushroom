# Shared Dev runtime image

Dev Compose builds Debian Bookworm packages over HTTPS using the owner-tested
`https://mirror.famaserver.com/debian` archive and the official
`https://security.debian.org/debian-security` security archive. The Dockerfile's
standalone default remains the official Debian archive for portable CI builds.

The slim Node base initially lacks a CA bundle. Compose supplies the host's public
trust bundle `/etc/ssl/certs/ca-certificates.crt` as the build-only `dev_apt_ca` input.
APT uses it temporarily, verifies signed Debian metadata, and installs Debian's
`ca-certificates` and OpenSSL. The input is not mounted into application services
or retained in image layers. Requests have a 20-second timeout and one retry;
an incomplete index update fails the build.

Verify a standalone build with `bash scripts/test-dev-runtime-image.sh`. The
existing deployment fingerprint includes both the Dockerfile and Compose model,
so the next reviewed Dev sync rebuilds the runtime automatically. Installer
self-update is unnecessary for this application deployment change.
