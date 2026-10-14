# Store product media v1 — FROZEN development contract

Authority: explicit product-owner approval 2026-10-14; [ADR-0015](../decisions/ADR-0015-store-product-media-development.md). Historical [F12-T06 N/A](phase-12-object-storage-decision.md) remains valid for the frozen initial release. No production activation or real R2 interaction is authorized.

## Slice and endpoints

F12-T06-R1 / Phase 04A is backend-only. One primary image per existing product; no SKU image, gallery, originals, unrelated attachments, dashboard or app changes.

- GET `/v1/admin/commerce/products/{productId}/image`: current metadata or null plus ETag (`"none"` or quoted image UUID).
- PUT same path: multipart PUT, one `file`, optional `altText` (max 240 chars). Required `If-Match` and `idempotency-key` headers. 200 returns the committed metadata and new ETag.
- DELETE same path: required `If-Match` and `idempotency-key`; 204 and ETag `"none"`. A pending delete is absent to clients immediately.
- GET same admin path plus `/content`: protected no-store preview.
- GET `/v1/commerce/products/{productId}/images/{imageId}`: public no-store bytes only for the currently READY image and published catalog visibility. No arbitrary object-key reads.
- Product DTOs in public/admin catalog and cart/wishlist gain additive nullable `image`: id, contentPath, mimeType, sizeBytes, width, height, altText. No objectKey/provider URL.

Mutation replay uses a durable request fingerprint and result through the existing outbox intent. Same user/product/idempotency-key and payload replay the committed operation without reverting a later generation; changed payload conflicts. Unknown/failed storage results cannot publish metadata. Failed attempts retain durable cleanup; optimistic conflicts do not overwrite another operation.

## Limits and lifecycle

5 MiB; JPEG/PNG/WebP signature+decode; max 20 megapixels and 8192px input side; no animation/SVG. WebP derivative max1600px, stripped metadata. At most two processing operations per API instance; oversized/invalid payloads fail before R2. Whole upload/storage operation is bounded; cleanup intent waits beyond that deadline before reclaiming possible orphan keys. Keys never reused. Deletion rechecks current reference and uses generation identity. Database/R2 failures are translated to stable redacted errors; outbox errors contain no secret/provider payload.

Credentials stay server-side; R2 access is disabled by default. Enabling incomplete config fails validation. Development-only activation is allowed by this contract; production activation remains blocked. Private R2 endpoint is not an image URL. Original files are discarded; current derivatives retained; superseded/removed/orphan derivatives are deleted durably. No deleted-development-image recovery guarantee.

## Acceptance / future handoff

Isolated PostgreSQL migration replay and mocked R2 API/security/fault/concurrency tests, image processing tests and generated OpenAPI freshness must pass. Batch 01B later uses Uppy core/react headless/xhr-upload/fa_IR with existing session refresh, one-file limits, real progress, retries with the same operation key and the server ETag. Batch 01C integrates image fields in customer cards/details/cart/wishlist. Neither UI batch starts in 04A.

## Authorization addendum — local smoke only (2026-10-14)

Wire/API/lifecycle contract remains frozen. The subsequent explicit product-owner approval permits F12-T06-S1 real local development smoke against dev-sabz with disposable test images, per the ADR-0015 addendum. The original no-live-R2 statements describe04A/04B authorization and are historically preserved. Production, public bucket activation, bucket-setting changes and Phase04C are not authorized by this addendum.
