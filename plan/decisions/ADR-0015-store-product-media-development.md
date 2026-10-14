# ADR-0015 — Private Store product images in development

- Status: ACCEPTED
- Date: 2026-10-14
- Decision makers: Product owner (explicit approval in the Store media chat), Codex /root
- Task: F12-T06-R1 (Phase 04A / backend foundation)
- Supersedes: none; the historical F12-T06 initial-release N/A remains intact.

## Context

The Store now has an approved binary consumer: administrative product-image upload. The owner explicitly reopened storage for this development scope on 2026-10-14. The existing release envelope, medical/chat attachment deferrals and independent production gates are unchanged.

## Decision

Use private Cloudflare R2 through a small AWS SDK v3 adapter. Development bucket is `dev-sabz`; region is `auto`; endpoint and credentials are server configuration. No live R2 access is authorized in this task. Default storage mode is disabled; automated tests replace the adapter with an in-memory mock.

One primary image belongs to a CommerceProduct, not a SKU. Upload through NestJS/Fastify; the later dashboard uses Uppy Headless/XHR. Validate JPEG/PNG/WebP signature and decode, 5 MiB, 20 megapixels, and 8192px per input side; reject animation. Strip metadata and convert to WebP with maximum 1600px side. Discard originals; PostgreSQL stores metadata only.

Public bytes are served only through a no-store API endpoint for the current READY image of an active product/category/clinic with an active SKU. Admin preview requires COMMERCE_MANAGE and clinic ownership. Internal keys and credentials never enter responses.

Persist a durable cleanup intent before storage writes. Store new objects under unique server keys; commit replacement with optimistic concurrency and enqueue deletion of the superseded key. Failed replacement retains the committed image. Cleanup is retried and must never delete a currently referenced READY object. Processed development test images remain while referenced; deleted development images have no restore guarantee. Production retention/recovery requires a separate decision.

## Alternatives considered

Direct presigned upload and Worker/CDN delivery are deferred: they require additional finalize, CORS, quarantine and cache/revocation contracts. No generic media platform or public bucket is needed.

## Consequences and validation

API CPU/memory and outbound requests require bounded concurrency and deadlines. Storage and PostgreSQL do not share a transaction; durable cleanup is part of acceptance. Isolated PostgreSQL integration, mocked R2 fault/concurrency tests, upload parser/processor tests and generated-contract checks are required. This backend task does not establish end-to-end UI or production readiness.

## Implementation impact and revisit

Owned surfaces: Commerce media/catalog/cart, schema plus one additive migration, outbox media dispatch, API environment/entrypoint, API dependency lock and generated client. Dashboard/app source is excluded. Revisit before production activation, multi-image/SKU media, direct upload, public CDN, medical/chat files, or additional API replicas.
