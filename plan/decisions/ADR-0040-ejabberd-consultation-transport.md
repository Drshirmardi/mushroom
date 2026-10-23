# ADR-0040 — Replace consultation realtime with ejabberd

- Status: ACCEPTED FOR IMPLEMENTATION; activation and acceptance unverified
- Date: 2026-10-23
- Decision makers: product owner (explicit chat instruction), Codex /root
- Task: F12-FE01-CHAT01, continuation of CLIENT-INTEGRATION
- Supersedes: ADR-0010 transport selection only; clinical, retention and authorization rules remain authoritative

## Context

The owner requests a ready messaging engine, isolated from dev on a feature branch, and now authorizes both frontend connections while reserving all execution testing. The owner explicitly requires one engine and removal of the old implementation. Existing chat reaches patient and dashboard clients, appointment context, waiting room, session/user revocation, moderation, receipts and notification outbox. Replacing the socket endpoint alone would lose these boundaries.

## Decision

Use self-hosted ejabberd 26.09 for XMPP connections, room fan-out, presence, acknowledgements and its SQL archive. Keep the application's immutable PostgreSQL conversation/message/receipt/moderation ledger as the authoritative clinical and authorization record. ejabberd's archive is a delivery/recovery projection, never an alternative authorization source. Each native text publication passes through the application policy bridge and commits to that ledger before routing. Replays use the original clientMessageId and canonical message ID. Incoming deliveries and archive items are checked again and restricted text is replaced by the existing safe tombstone.

One private room per existing conversation, not one permanent patient/doctor pair. Short-lived RS256 credentials identify an existing application user/session, with an expiry embedded in the JID so active streams cannot outlive the credential. Application roles, clinic membership, appointment mode/window, user/session state and blocks are evaluated by the API. The engine policy module fails closed when the API is unavailable. Direct messages, arbitrary room management, unvalidated rich payloads, federation, public discovery and public file upload are disabled in the consultation profile.

Retained history/report/moderation endpoints remain. ejabberd is the sole send engine: remove the Socket.IO gateway/clients/dependencies and old public REST message-write route, with no mode flag or fallback. Both frontends use a shared dynamically loaded StanzaJS adapter, canonical echo confirmation, stable client IDs and bounded history pagination. Required engine settings/key fail startup when absent.

Use the existing Caddy API domain for the browser WebSocket path. Preserve its external per-environment snippet through installer imports, and include a required companion Compose overlay in dev/release operations. No nginx dependency is added. The owner must provision engine SQL/keys/config and publish a reviewed engine image before release automation; the existing four-image application manifest is unchanged. Isolate chat health from ordinary API readiness so a runtime chat outage does not remove unrelated APIs from service.

## Consequences

- Existing messages, UUID references, notifications and moderation survive without destructive migration.
- Native protocol state is delegated to ejabberd; product-specific authority remains in NestJS.
- A dedicated ejabberd database/user on the same PostgreSQL service isolates engine-managed SQL tables from Prisma migrations.
- The API policy module and engine configuration are a coupled security boundary and must be deployed together.
- A committed application message whose engine delivery fails is recoverable from REST history; native retry retains its client ID.
- Media remains outside the accepted text-only contract. Native public upload must not be enabled for medical attachments; a separately authorized private storage integration is required.

## Validation

Owner-reserved: API types/build/contracts, Erlang module compilation, real PostgreSQL/ejabberd integration, two-account delivery/reconnect/retry, immediate revocation, private-room/archive isolation, moderation, appointment windows, container readiness/resource use and frontend acceptance. No runtime PASS or production readiness is implied by this ADR.

## Revisit trigger

Revisit after the owner tests the isolated backend and frontend, or if policy-call latency/resource evidence makes synchronous per-stanza admission unsuitable. No PR/merge before that acceptance.


## Local development continuation (2026-10-23)

Owner authorizes pnpm dev to start engine dependencies automatically. Root dev/dev:api use a local Node runner and Docker Compose, generated ignored credentials, per-checkout project/volumes and health waiting. A dedicated local-only PostgreSQL container owns the engine archive to avoid altering existing application PostgreSQL; deployed logical-database topology remains unchanged. WS is accepted only for loopback in NODE_ENV=development; all other environments require WSS. No local Caddy/certificate installation is needed. Remote/LAN/Codespaces browsers still require a reachable WSS profile. Generated .local files are excluded from both Git and Docker contexts, and shutdown preserves credentials/data. Runtime verification remains owner-reserved.
