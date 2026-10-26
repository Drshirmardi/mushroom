# Sadad live activation runbook

The deployment switch and the administrator switch are separate by design:

- `SADAD_TRANSPORT_MODE=live` permits this API deployment to contact Sadad. It does not enable a clinic provider.
- Dashboard **Settings → Payment gateways → Sadad → Enable adapter** creates/promotes the active immutable revision to `RIAL/goLiveReady` and enables new attempts.
- Disabling the adapter stops new attempts. Callback and Verify remain available for attempts already sent to Sadad.

## Shared dev values

Use these non-secret values in `/home/deploy/mushroom/dev/runtime.env` after Sadad confirms the merchant redirect profile and the VPS outbound IP is registered:

```dotenv
PUBLIC_API_URL=https://dev-api.roxco.ir
SADAD_TRANSPORT_MODE=live
SADAD_REQUEST_TIMEOUT_MS=5000
SADAD_RETURN_URL=https://dev-api.roxco.ir/v1/payments/providers/sadad/callback
SADAD_RESULT_URL=https://dev-app.roxco.ir/store/order-success
SADAD_REDIRECT_PROFILE=PHP_VPG_PURCHASE
```

`PHP_VPG_PURCHASE` produces `https://sadad.shaparak.ir/VPG/Purchase?Token=...`. Replace it with `PDF_PURCHASE` or `DOTNET_PURCHASE_INDEX` only when the current merchant acceptance document explicitly names that profile. The API refuses to start in live mode when any required value is empty or malformed, and it refuses activation when `SADAD_RETURN_URL` does not exactly match `PUBLIC_API_URL` plus `/v1/payments/providers/sadad/callback`.

Merchant ID, Terminal ID and Terminal Key are entered only in Dashboard. They are encrypted as payment-provider credential revisions and must not be placed in `runtime.env`, Compose, GitHub variables or logs. The AES payment-credential key remains in `secrets/payment_credential_encryption_key`.

After editing `runtime.env`, rerun the normal `Sync shared dev VPS` workflow or run the repository's `deploy/vps/deploy-dev.sh` with the same deployment environment. Confirm API readiness, then open Dashboard and enable Sadad. Select it as the default adapter if checkout should use it.

## Acceptance transaction

1. Create a low-value real order using an authorized test customer.
2. Confirm the create-attempt response redirects only to an allowlisted `sadad.shaparak.ir` URL.
3. Complete or cancel the payment at Sadad.
4. Confirm the browser POST reaches the exact Return URL with form fields `OrderId`, `Token` and `ResCode`.
5. Confirm the API performs server-to-server Verify before creating a Payment, marking the order `PAID`, consuming inventory reservations or issuing a receipt.
6. Confirm a repeated callback is idempotent and does not create a second Payment.
7. Confirm a timeout remains `REQUIRES_RECONCILIATION`; retry uses the same attempt, token and provider order ID.
8. Disable Sadad in Dashboard and confirm new attempts return `SADAD_GO_LIVE_BLOCKED` while an already-created callback can still finish Verify.

Do not treat the redirect or callback alone as proof of payment. The authoritative success condition is a matching successful Verify response persisted as a single Payment.
