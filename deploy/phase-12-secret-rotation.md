# Phase 12 Secret Inventory and Rotation Procedure

## Boundary and inventory

This procedure covers VPS release readiness. Staging and production remain separate, and each environment's runtime
secrets must stay in its restricted VPS secret files or an equivalent protected secret store, never in Git, database
plaintext, source, test fixtures or logs.

| Material | Boundary | Rotation rule | Evidence owner |
|---|---|---|---|
| `DATABASE_URL` and database password | restricted VPS secret file | at least every 90 days and immediately on exposure; coordinate an application restart/connection drain | deployment owner |
| `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_PEPPER` | restricted VPS secret files | every 90 days and immediately on exposure; follow the approved session invalidation/re-authentication process | identity owner |
| `PAYMENT_CREDENTIAL_ENCRYPTION_KEY` and `PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION` | restricted VPS secret files; never database/Git | every 90 days and immediately on exposure; promote a new write key only with historic decrypt coverage | payment owner |
| `PAYMENT_CREDENTIAL_DECRYPTION_KEYS` | restricted VPS secret file; historic-key ring only | retain a version only while an encrypted credential revision remains readable/needed; remove only after the retention policy has crypto-shredded every dependent historic revision | payment owner |
| Sadad merchant/terminal material | encrypted immutable payment-provider credential revisions | rotate by a new revision; never copy to environment files or logs | merchant/payment owner |

Non-secret deployment controls (`SADAD_TRANSPORT_MODE`, callback URL, redirect profile and timeout) are not part of
the secret inventory. `SADAD_TRANSPORT_MODE` determines whether the API may contact Sadad; enabling the provider for
new attempts remains a separate dashboard action.

## Encryption-key rotation drill

1. The payment owner schedules the 90-day cycle or exposure response and records the environment, versions, start,
   owner and rollback decision outside Git without recording key material.
2. In the protected VPS secret files, create a new 32-byte canonical-base64 write key and a distinct version label. Keep the
   prior version in `PAYMENT_CREDENTIAL_DECRYPTION_KEYS` as `version:canonical-base64-key`; do not remove it before
   all dependent credential revisions are safely retired/shredded.
3. In staging, update the protected secret files to the new write key/version and historic decrypt ring. Verify a newly encrypted
   synthetic revision bears the new version, and an already encrypted synthetic prior revision still decrypts. Verify
   the rotation without printing key values or broadening file permissions. This synthetic key-rotation drill does not
   change the already tested Sadad dev configuration or perform a bank request.
4. If the staged check fails, restore the preceding protected secret files before accepting any new revision. Do
   not overwrite ciphertext, rewrite revision history, or place a recovery key in database/Git.
5. After an approved promotion, retain the old decrypt entry until `PaymentCredentialRetentionService` has
   crypto-shredded all eligible retired dependent revisions. Then remove only that historic entry in a separately
   separately reviewed secret-file change. Record the secret-free outcome and service continuity evidence.

## VPS evidence still required

The following is an F12-T07/F12-T13 gate and is not PASS merely because this procedure or its synthetic test exists:
record the restricted secret-file ownership and permissions on the personal VPS, version transition and decrypt
coverage, service continuity, audit evidence without secret values, and the actual staging and production drill.

The existing dev VPS Sadad acceptance is separate from secret rotation. This document does not claim that staging or
production key rotation, deployment or release sign-off has been completed.
