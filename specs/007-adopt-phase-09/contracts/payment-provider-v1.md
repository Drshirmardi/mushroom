# Payment Provider V1 — planned interface boundary

**Status**: Frozen for implementation in `F09-T01`; Sadad runtime remains `SADAD_GO_LIVE_BLOCKED`.
**Authority**: `plan/contracts/commerce-payment-provider-v1.md`, `plan/contracts/sadad-ipg-v1.md`, and
ADR-0009.

## Application port

```ts
interface PaymentProvider {
  readonly code: PaymentProviderCode;
  readonly capabilities: PaymentProviderCapabilities;
  createPayment(input: CreateProviderPaymentInput): Promise<CreateProviderPaymentResult>;
  parseCallback(input: ProviderCallbackInput): ProviderCallbackResult;
  verifyPayment(input: VerifyProviderPaymentInput): Promise<VerifyProviderPaymentResult>;
}
```

Inquiry, webhook, refund and partial-refund are separate capability interfaces. The application must not call
them unless both capability declaration and implementation exist. Sadad Phase 09 implements only the base
create/callback/Verify port.

All port money fields include an explicit unit. No port method accepts an ambiguous amount. Domain inputs use
integer TOMAN; provider results carry the exact provider amount/unit used for signing and verification.

## Planned HTTP surface

Final paths freeze with the repository's existing route conventions in `F09-T01`.

### ADMIN provider settings

- `GET /v1/admin/commerce/payment-providers`
  - returns safe provider status, capabilities, enabled/default/configured, supported modes and revision time
  - never returns raw MerchantId, TerminalId, TerminalKey, ciphertext, endpoint or provider payload
- `POST /v1/admin/commerce/payment-providers/{providerCode}/config-revisions`
  - requires `Idempotency-Key` and authenticated/authorized/audited ADMIN access
  - creates and activates an immutable revision; existing attempts keep their original revision
  - accepts supported mode and provider-specific write-only credentials only
  - rejects `url`, `host`, raw crypto metadata, unsupported mode and unknown fields
- `PATCH /v1/admin/commerce/payment-providers/{providerCode}`
  - atomically changes only `enabled` and `isDefault`
  - enabling/default requires a validated active revision, confirmed provider unit and every deployment/acceptance
    prerequisite; otherwise it returns `SADAD_GO_LIVE_BLOCKED`
  - disabling prevents new attempts but cannot stop Verify/reconciliation for existing attempts

### Patient payment initiation/status

- `POST /v1/patients/me/orders/{orderId}/payment-attempts`
  - requires `Idempotency-Key`
  - server loads the order snapshot and selects the one enabled/configured default provider
  - returns attempt ID, provider code, redirect action and expiry; never returns provider credentials
- `GET /v1/patients/me/payment-attempts/{attemptId}`
  - resource-owner scoped
  - returns safe pending/paid/failed/reconciliation status and receipt fields only after authoritative Verify

### Provider callback

- `POST /v1/payments/providers/sadad/callback`
  - public HTTP POST callback with strict body limits, validation, rate limiting and redaction; PDF does not
    name Content-Type, so no parser/casing profile activates until acceptance evidence is available
  - does not require or read patient cookie/session
  - resolves the persisted attempt from `OrderId`/`Token`, starts/retries Verify only for the documented
    successful callback and returns `303 See Other` to a code-owned result page without provider details

### Reconciliation/refund

Admin reconciliation and manual-refund endpoints belong to `F09-T09`; the frozen policy requires audited ADMIN
approval and non-sensitive manual-bank evidence before completion. No generic endpoint may report success for
an unsupported provider capability.

## Sadad mapping

- request fields: MerchantId, TerminalId, Amount, numeric unique OrderId, LocalDateTime, ReturnUrl, SignData
- provider `OrderId` is a generated numeric long unique per transaction and is distinct from the internal
  Order UUID
- request signature plaintext: `TerminalId;OrderId;Amount`
- crypto: TripleDES ECB with PKCS7 padding; provider key is Base64-formatted; output is Base64
- request success: `ResCode=0` with Token
- callback: HTTP POST; `ResCode=0` means proceed to Verify, not paid
- documented callback fields also include HashedCardNo, PrimaryAccNo, SwitchResCode and
  CardHolderFullName; Phase 09 neither persists nor logs those values
- Verify fields: Token and encrypted Token as SignData
- Verify success: `ResCode=0`; duplicate previously successful Verify: `ResCode=100`, also final success
- Verify `-1`: invalid parameters or unknown transaction; `101`: expired
- response receipt values: Amount, OrderId, RetrivalRefNo, SystemTraceNo, TransactionDate

The provider unit, current redirect shape (`/Purchase` in the guide versus `/Purchase/Index?token=...` in the
.NET sample), protocol version, environment, callback transport/date formatting, IP/domain and credentials are
explicitly `SADAD_GO_LIVE_BLOCKED`. The adapter must refuse enabled/default state and every real request without
those confirmations; no TOMAN conversion is inferred.

## Stable internal errors

At minimum the frozen API maps provider detail into stable internal codes:

```text
PAYMENT_PROVIDER_NOT_CONFIGURED
PAYMENT_PROVIDER_DISABLED
SADAD_GO_LIVE_BLOCKED
PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED
PAYMENT_ATTEMPT_NOT_FOUND
PAYMENT_ATTEMPT_EXPIRED
PAYMENT_CALLBACK_REJECTED
PAYMENT_VERIFICATION_PENDING
PAYMENT_VERIFICATION_FAILED
PAYMENT_VERIFICATION_MISMATCH
PAYMENT_RECONCILIATION_REQUIRED
```

Raw provider descriptions, exceptions, credentials, full callback bodies and cryptographic values never enter
client error details or operational logs.
