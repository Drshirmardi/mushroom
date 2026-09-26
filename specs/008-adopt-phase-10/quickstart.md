# Phase 10 Validation Quickstart

This is future task-owned validation, not evidence that runtime chat exists.

## Prerequisites

- Accepted `F10-T01` policy and `F10-T02` persistence baseline.
- Local repository PostgreSQL test environment.
- ONLINE appointment actors: owner patient, linked assigned doctor, authorized clinic ADMIN, and unrelated patient/clinic controls.

## Contract checks

1. Prove only permitted participants discover a conversation; STAFF, unlinked doctors, other doctors/patients/clinics receive no metadata.
2. Prove state/window/hard-cap/block behavior for history, send and presence; a reschedule recalculates window without deleting evidence.
3. Retry a send with identical/different clientMessageId payload and prove one message/stable conflict plus ascending sequence.
4. Reconnect from sequence; prove no URL/log token, reauthorization, bounded high-water sync, duplicate tolerance, gap recovery, and 15/45-second presence lease.
5. Exercise report/restrict/restore/resolve/block/unblock; prove ordinary paths get tombstones and safe notifications while sensitive reads/actions audit.
6. Prove attachment/audio/video controls and external video/upload behavior are absent.

## Acceptance checks

1. Run real-PostgreSQL ordering/idempotency/receipt/authorization/moderation suites.
2. Run network gateway reconnect/token-expiry/connection-limit and 300-participant reconnect-storm suite.
3. Run accepted 100/300/600, 20 sustained/50 burst and user/conversation rate/backpressure suite.
4. Export OpenAPI, generate/check client, run app/dashboard checks, then execute cross-surface browser journey.

Expected result: only the frozen text consultation behavior is accepted; attachments and video remain absent.
