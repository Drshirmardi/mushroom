# Phase 12 object-storage applicability decision

- Status: `N/A FOR INITIAL RELEASE — F12-T06`
- Decision owner: `F12-T06 / Phase 12 coordinator`
- Reviewed: `2026-10-01`
- Authority: `plan/contracts/phase-12-release-envelope.md`, frozen
  `specs/010-production-hardening/`, and the accepted Phase 10 attachment deferral.

## Decision

Object storage is not applicable to the initial release. No object-store provider, bucket, retention rule, restore
procedure, upload endpoint, schema, dependency, secret or environment configuration is authorized by this decision.

This is a source-consumer conclusion, not a statement that object storage is unnecessary for all future releases.

## Evidence reviewed

The following current source surfaces were searched for a real file consumer and storage transport: API controllers and
services, Prisma schema/migrations, patient app, dashboard, web app, workspace packages, dependency manifests and
deployment configuration.

| Candidate | Result |
|---|---|
| API route/transport | No multipart parser, `FileInterceptor`, upload endpoint, presigned URL, bucket SDK, or object-store client exists. |
| Persistence | No file, attachment, upload or media model exists in the Prisma schema. |
| Product clients | No API-backed upload or attachment flow exists in the app, dashboard, or web source. Static design assets are not a user-file consumer. |
| Dependencies/configuration | No S3/MinIO/object-storage client, bucket setting, or object-store credential/configuration was found. |
| Chat | `apps/api/prisma/migrations/20260916034500_phase_10_chat_persistence/migration.sql` explicitly creates no attachment transport or storage; Phase 10 records attachments as deferred/not applicable for the MVP. |

## Guardrails and re-entry

Any future upload, medical-file, chat attachment, image, audio, video, export artifact, or other persisted binary
consumer must first reopen this decision with product-owner approval. The follow-up must identify its source consumer,
private access and object-key policy, content-type/size validation, quarantine/scan flow, retention/disposition,
backup/restore responsibility and environment secret boundary before adding storage infrastructure.

Until then, the Phase 12 storage acceptance is the documented `N/A` decision above; it does not create a deferred
implementation obligation or alter the independently blocked PostgreSQL recovery and provider gates.

## Scoped development re-entry — 2026-10-14

The product owner explicitly approved Store product images as a new development binary consumer. The historical decision above and its initial-release acceptance remain intact. See [ADR-0015](../decisions/ADR-0015-store-product-media-development.md) and [store-product-media-v1](store-product-media-v1.md). This addendum authorizes only the approved development scope; no production storage activation, real R2 access, medical/chat attachments or frozen release rewrite is authorized.
