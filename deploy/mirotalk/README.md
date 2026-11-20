# Mushroom consultation communications

The patient app and dashboard use the same appointment-bound chat API. MiroTalk C2C handles one-to-one WebRTC signaling. Text, attachments, receipts and call state use independent communications storage. Previous appointments are listed from the current appointment, within the same clinic and the existing patient, assigned physician or authorized operator scope.

## Local development

Run **corepack pnpm dev** from the repository root with Docker running. The launcher provisions a separate PostgreSQL container, an S3 bucket, ClamAV and the pinned MiroTalk service on loopback. Their volumes and the local credentials under .local/chat survive startup and shutdown. The first ClamAV signature download can take several minutes. Until the scanner responds, attachment uploads fail closed. Use synthetic appointments and two separately authenticated browser profiles.

## VPS profiles

1. Build and publish the image in this directory through the existing image registry. Set CHAT_VIDEO_IMAGE to its digest. Copy compose.yaml from this directory to the target environment root as communications.compose.yaml. Apply env.example to the environment's private runtime.env. Use a dedicated password consisting of URL-safe characters for the separate PostgreSQL container.
2. Create a private S3 bucket and a dedicated service account with object get and put access. Enable encryption and backups at the storage provider. Run the normal dev or release workflow to apply the separate Prisma migration. Back up and restore the communications database and bucket together.
3. Adapt call.caddy.example for your domains. Deny /v1/chat/internal/* at the public API proxy and expose only the call client assets and Socket.IO on the call origin. Set CHAT_VIDEO_EMBED_ORIGINS to the exact patient and dashboard origins, without paths or wildcards. The call origin must be separate. Keep bridge access on the Docker network. Configure Coturn separately with turnserver.conf.example, a public relay address and firewall rules for the listeners and relay range.
4. Set CHAT_VIDEO_ENABLED=true after verifying text and file delivery, both call seats, media permissions and forced TURN from the target clients. Setting it to false disables video and expires live video leases while chat remains accessible. The initial release uses one API process and one MiroTalk process. Presence and unused grants are kept in process memory.

The standalone installer accepts a private MiroTalk profile via `mushroom setup-chat --environment <environment> --communications-env <file>` or the same flags on `install`. See the pinned installer documentation for the profile fields. The subsequent VPS workflow starts communications and applies its migration.
