# Liara deployment profile

Liara consumes the provider-neutral OCI images. Configure its service port from `PORT`, route `/v1/health/live` and
`/v1/health/ready` to the API health checks, inject runtime secrets through Liara’s managed secret mechanism, and
set only public `PUBLIC_*` URLs for Next runtime config. Domains require HTTPS at the reverse proxy.

Before any Sadad connection, the project owner must obtain written evidence that Liara provides the required **static
outbound** IP. An inbound or dedicated IP is not proof of fixed egress. Record the HTTPS callback domain/path and
keep `SADAD_GO_LIVE_BLOCKED` until the separate acceptance gate passes.

Do not configure multiple realtime API instances: Socket.IO/session state is single-instance only until a distributed
adapter is approved and verified. This profile contains no Liara SDK, runtime API, credential, provisioning action or
provider-specific application code.
