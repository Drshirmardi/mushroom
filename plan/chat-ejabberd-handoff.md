# ejabberd consultation backend — connection map and handoff

Task: F12-FE01-CHAT01. Branch: `codex/chat-ejabberd`. Base: `dev@c54d129`.
Owner continuation: implement backend AND patient/dashboard frontend; use ejabberd only, retire Socket.IO, align with existing Caddy. All execution testing stays owner-reserved; PR to dev only after successful testing.

## Connections inspected before implementation

| Boundary | Current consumers / source | Required preservation |
| --- | --- | --- |
| Patient UI | `apps/app/src/app/(app)/chat/page.tsx`, `src/lib/chat-api.ts`; home and appointment detail/waiting-room links | Existing appointment and conversation IDs; shared StanzaJS connection implemented |
| Dashboard | `apps/dashboard/src/features/messages/messages-page.tsx`, `src/lib/chat-api.ts`, patient workspace links | Same room, current physician/clinic authorization; shared StanzaJS connection implemented |
| Clinical appointment context | `apps/api/src/modules/appointments/assigned/assigned-appointment.service.ts` | Existing `chatConversation` relation and consultation context |
| Conversation / policy | `communications/chat/chat.service.ts`, `chat.controller.ts`, `waiting-room/*` | ONLINE only; patient ownership/assigned doctor/clinic admin; UTC window and terminal read-only |
| Durable data | Prisma ChatConversation, ChatMessage, participants, receipts, reports, blocks, moderation actions and audit | Immutable retained history and UUIDs; no delete/backfill |
| Realtime | `chat-realtime.gateway.ts`, publisher, socket registry | Replacement mode rejects old admission; expiry/revocation remain effective |
| Identity | identity module factories, session revoke/revoke-all, password change/reset, user-status management | Existing registry dependency retained; live engine policy also verifies persisted sessions |
| Notifications | `CHAT_MESSAGE_COMMITTED` outbox, existing receipt/notification functions | Existing transactional event semantics retained; no medical text in new diagnostics |
| API contracts | DTO/Swagger, `packages/api-client` | New backend session DTO; generation command handed to owner if execution deferred |
| Deployment | existing release artifacts, environment validation, reverse proxy | Required single-engine companion profile; private API/admin network and independent SQL database |

## Authorized continuation and handoff

Same CLIENT-INTEGRATION / F12-FE01 coordinator and scoped F12-FE01-CHAT01, no new batch. Owner explicitly expanded frontend scope and rejected dual transports. Owned paths now include API chat/config/health/log registration, both chat pages/wrappers, shared engine/client contracts and lockfile, removal of obsolete Socket.IO transport tests/dependencies, narrow installer/deployment integration and governance evidence. Preserve unrelated changes and original clinical/retention rules.

Patient and dashboard use one dynamically loaded StanzaJS adapter. Canonical PostgreSQL history and moderation remain; native room delivery is the only send transport. Old Gateway, browser Socket.IO code/dependencies and public REST send operation are removed. Server history supports latest/before/after pagination with an incremental checkpoint. Engine leases have distinct connection nonces and expire/revoke through existing identity ownership.

Deployment review found Caddy in installation/manager.py and deploy/vps/README.md. Replaced the unused nginx example with an API-domain Caddy snippet and persistent per-environment imports. Dev/release scripts require a companion chat.compose.yaml; installer operations include it and environment audit includes its settings. Owner must still provision isolated engine SQL, keys, proxy settings and a built/published engine image. Existing release automation promotes four application images; engine-image publication is an explicit prerequisite. Missing engine settings fail startup. Chat health is separate from ordinary API readiness.

Exact setup and owner acceptance: deploy/ejabberd/README.md. No media endpoint/public upload was enabled. No native-engine or browser runtime success is claimed. Source OpenAPI was synchronized and TypeScript client generated; full Swagger export/contract parity is pending owner execution. Dependency/lock operations used ignored lifecycle scripts.

Status: IMPLEMENTED_UNVERIFIED / REWORK, unchecked. No tests, typecheck, build, Erlang compile, migration, container/browser/deployment activation or runtime PASS. Retired Socket.IO-specific transport tests were removed with their implementation; remaining old REST-send integration fixtures need native-engine adaptation by the owner. No final task commit, push or PR before successful owner acceptance.


Local-startup continuation (same task, owner-authorized): root pnpm dev/dev:api now use scripts/dev.mjs to prepare ignored local credentials, a separate local-only engine SQL container and ejabberd, wait for container health, build shared client and launch Turbo. Ctrl+C stops only this checkout's engine project without deleting volumes. Development loopback WS is allowed; other environments still require WSS. Turbo forwards engine settings. Git and Docker ignore .local; original application DB/VPS startup profiles remain unchanged by the helper. Source-only, no Docker/build/test execution by agent; owner runtime acceptance still pending. See docs/DEVELOPMENT.md and deploy/ejabberd/README.md.


### Local startup verification supersedes the earlier execution deferral (2026-10-23)

Owner explicitly required complete launch fixes and verification. Completed actual local Docker/pnpm startup twice and Ctrl+C stop. Fixed native room option allowpm, missing mod_muc_admin provider, v2 option-map parsing, shared adapter TypeScript/nullable cursor contracts and Stanza browser resolver metadata via pinned pnpm patch. Docker API/Next templates include patches before installation; Windows Node watch is scoped to dist and TypeScript ignores generated trees; Turbo no longer requires interactive task input to launch. Offline Swagger exporter supplies and deletes a temporary export-only key; official chat schemas/operations synchronized while unrelated commerce drift remains preserved.

PASS: engine/PostgreSQL healthy; strict API and shared-client compile; web, patient chat, dashboard messages and API live/ready/chat HTTP200; native WebSocket negotiation; disposable private-room creation/retry/member add-remove/cleanup;3 targeted API-client regressions; unauthorized policy401; frozen lockfile consistency. Repeated cold start and Ctrl+C release all owned listeners/containers/lock while retaining keys/volumes. No app migration/seed or manual medical/financial mutation. The synthetic engine probe was cleaned up. Full authenticated patient/doctor/browser/moderation acceptance remains pending, so overall task stays REWORK/unchecked with no final commit/PR.
