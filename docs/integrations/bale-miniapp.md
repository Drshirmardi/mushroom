# Bale Mini App ↔ Mushroom patient app

Status: **feature branch / draft**. Disabled by default. Only `apps/app` and `apps/api` participate in Bale login; **no navigation through `apps/web`** is required for Bale launches.

## Official references
- Mini App SDK, signed initData and requestContact: https://docs.bale.ai/miniapp
- Bot API, Update/Contact and setWebhook: https://docs.bale.ai/

## Bot and deployment prerequisites

1. Register a Bale bot with @botfather and configure the **main mini-app** URL as `https://<public-app-domain>/bale` (the Next.js patient app, not the landing web site).
2. Set server-only `BALE_BOT_TOKEN`, `BALE_WEBHOOK_SECRET` (43+ random URL-safe characters) and `BALE_AUTH_ENABLED=true` on **apps/api**. Keep them out of source code, frontend envs, analytics and logs.
3. Add the patient app origin to `APP_ORIGINS`, verify `apiUrl` in `apps/app`'s runtime config, and use trusted HTTPS for both app and API.
4. Register the bot webhook via `setWebhook` to `https://<public-api-domain>/v1/integrations/bale/webhook/<BALE_WEBHOOK_SECRET>`. **Important:** Bale's documented `setWebhook` accepts only one URL. If the bot already has a webhook / getUpdates consumer, do not replace it; first design a single shared dispatcher/forwarder.
5. The webhook URL is a bearer secret: **mask it in all reverse-proxy/CDN/WAF logs and tracing**, including Caddy and upstream access logs. Application request serialization masks it, but proxy logs must be audited separately. Rotate it if disclosed.
6. Apply the additive Prisma migration before enabling Bale auth. If SMS login is disabled, existing accounts cannot complete the initial OTP linking flow.
7. Test the real Bale Android and Bale Web clients. Bale Web runs in an iframe; the existing `__Host-sz_refresh` cookie has `SameSite=Lax` and may be blocked as a third-party cookie. **Web iframe refresh persistence is a release blocker until confirmed or a secure, scoped alternative is implemented.** Never globally weaken the web cookie policy without a CSRF/cross-origin review.

## Flow

```text
Bale main mini-app -> https://app.example/bale
  -> window.Bale.WebApp.initData -> POST /v1/auth/bale/exchange
     linked ACTIVE patient -> existing SessionIssuerUseCase -> JWT + refresh cookie
     unknown Bale ID -> POST /v1/auth/bale/contact/request -> requestContact()
         Bale bot contact update -> secret webhook -> matching from.id/contact.user_id
         -> POST /v1/auth/bale/contact/complete
            new phone -> create user (PATIENT) + PatientProfile + identity in one transaction
                         -> existing SessionIssuerUseCase
            already registered -> in-app /v1/auth/otp/challenges and .../verify
                                  -> POST /v1/auth/bale/contact/link (fresh OTP bearer)
                                  -> existing Session + PatientEntryGate
```

## Security and privacy contracts

- Never trust `initDataUnsafe` or a browser-supplied phone. Signed initData is HMAC-SHA256 validated against the server-only bot token and a ten-minute auth_date TTL; the server rejects duplicate keys, invalid dates, malformed users and tampering.
- The user must explicitly trigger `requestContact`. Its callback indicates consent only. The verified phone is taken **only** from a secret-authenticated webhook with `message.from.id === message.contact.user_id`, matching the verified Bale user.
- A five-minute one-time contact ticket is stored only as SHA-256 in the database. Contacts arriving outside the challenge window, from other users, in non-private chats or through replayed `update_id` are ignored.
- Existing patient accounts are never auto-merged by matching phone. Linking requires fresh OTP with a server session recording `verifiedPhone` matching the webhook phone. Privileged roles (ADMIN/DOCTOR/STAFF) are denied Bale login/linking.
- No bot token, initData, ticket or contact phone belongs in frontend storage, analytics or logs. The only sessionStorage marker is a non-secret navigation hint.
- Use ordinary session expiry, logout and patient onboarding; never create a parallel Bale JWT/role system.
- Expire/prune `bale_contact_challenges` and `bale_webhook_events` with an explicit maintenance job after deciding retention; don't run large deletes on every request.

## API contracts

- `POST /v1/auth/bale/exchange` – signed `{initData}`; `AUTHENTICATED` with normal `AuthenticationResponseDto`, or `CONTACT_REQUIRED`.
- `POST /v1/auth/bale/contact/request` – signed `{initData}`; returns one-time ticket and expiration.
- `POST /v1/integrations/bale/webhook/:secret` – bot-only Update JSON, acknowledges other event types without processing them.
- `POST /v1/auth/bale/contact/complete` – signed `{initData,ticket}`; `CONTACT_PENDING`, `ACCOUNT_LINK_REQUIRED` or `AUTHENTICATED`.
- `POST /v1/auth/bale/contact/link` – signed `{initData,ticket}` and fresh OTP-verified Bearer; 204 on success.

## Manual acceptance checklist before changing draft PR to ready

- [ ] Bale BotFather URL points to `apps/app/bale`; no `apps/web` redirect.
- [ ] Real signed initData valid/tampered/expired cases tested on API.
- [ ] Actual requestContact callback and full (redacted) bot `Update` contact payload match expected shapes.
- [ ] A genuine contact reaches the configured webhook and mismatched contact.user_id is rejected.
- [ ] Existing user first-link via OTP; new user initial provisioning; second launch direct login.
- [ ] Replay/retry, two tabs, disabled/privileged accounts and changed phone cases tested.
- [ ] Refresh cookie, same-site behavior and browser reload verified on Bale Android and Bale Web iframe.
- [ ] Wallet/payment return URLs and invitations remain inside apps/app.
- [ ] Caddy/CDN logs have no raw webhook secret or sensitive request data.
- [ ] Migration, OpenAPI client generation, API/app typechecks, relevant tests and real WebView E2E pass.

## Open questions to confirm with owner/Bale

1. Bot @username and whether it is dedicated or shared with existing bot handlers / webhook.
2. Public HTTPS origins for patient app and API, including dev/staging and production.
3. Target clients: Bale Android only, or also Bale Web / other client implementations?
4. Real, **redacted** sample of the `Update.message.contact` produced by `requestContact` (never send bot token, signed initData or personal phone).
5. If SMS OTP is unavailable, what recovery process should allow existing-account linking? No auto-merge by browser phone.
6. Payment provider return behavior when launched in Bale Web iframe and Android WebView.
