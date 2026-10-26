# ADR-0042 — Sadad merchant-origin browser departure and pending attempt resumption

- Status: ACCEPTED
- Date: 2026-10-26
- Decision makers: product owner explicitly approved the proposed correction in this chat; Codex /root implements it.
- Task: F12-FE01-PAY02
- Supersedes: none; extends PAY01 deployment routing.

## Context

Owner browser evidence shows successful PaymentRequest/token creation followed by a bank domain rejection. Purchase navigation sends Referer from dev-app although ReturnUrl is configured on the registered merchant root domain. This establishes the actual navigation origin; the bank's exact rejection rule remains unconfirmed. Interrupted browser payments also leave REDIRECT_READY attempts; a new click uses a new idempotency key and previously conflicted with that existing financial attempt.

## Decision

Return a browser URL on the explicitly configured Sadad callback origin. GET /v1/payments/providers/sadad/start serves a real HTML document with Referrer-Policy origin, nonce CSP, no external resources and no-store. Only the server-configured allowlisted Sadad purchase destination is used. The token is carried in the fragment, read client-side, cleared from history and encoded into the bank destination. It never enters merchant proxy/API request logs or outgoing Referer. The public page is rate limited; it creates no financial records and conveys no payment success.

Under the existing intent lock, authenticated gateway-attempt creation resumes the active attempt instead of creating another PSP request. Ambiguous attempts remain ambiguous, wallet/cancellation protections remain, and only bank Verify or existing reviewed administrator reconciliation may resolve them. Include ready attempts in the existing authorized reconciliation list for stale-token recovery.

## Alternatives considered

- A server 302 does not establish the required browser document origin; do not rely on it.
- Expiring/failing an attempt based on browser navigation failure could permit duplicate payment; rejected.
- Registering dev-app with the PSP remains an operational alternative, outside this change.

## Consequences and implementation impact

No schema, dependency or payment-settlement change. The main-domain proxy must forward exactly callback and start routes to the same environment API. Existing app navigation consumes redirectUrl unchanged. Legacy and shared payment responses both use the merchant page; the provider adapter retains the confirmed bank protocol profiles. OpenAPI/client gain the public HTML endpoint. Live bank acceptance remains external and is not guaranteed solely by browser tests.

## Validation and revisit trigger

Real Chromium navigation asserts merchant-origin Referer and fragment privacy without contacting a bank. Real PostgreSQL tests cover different-key/concurrent resumption, ownership, uncertain outcomes, definitive failure recovery and exactly-once settlement. Test Caddy routing and regenerate OpenAPI. Revisit if PSP documentation contradicts the inferred origin rule or if concurrent environments need distinct merchant addresses.
