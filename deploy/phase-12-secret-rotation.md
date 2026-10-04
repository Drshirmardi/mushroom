# Phase 12 Secret Inventory and Rotation Procedure

## Boundary and inventory

This procedure describes secret-free release readiness only. It neither provisions Liara nor demonstrates a Liara
managed-secret capability. Production and staging remain separate, and all runtime values below must be supplied by
their environment's managed secret store rather than Git, database plaintext, source, test fixture or log.

| Material | Boundary | Rotation rule | Evidence owner |
|---|---|---|---|
| `DATABASE_URL` and database password | deployment managed secret | at least every 90 days and immediately on exposure; coordinate an application restart/connection drain | deployment owner |
| `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_PEPPER` | deployment managed secret | every 90 days and immediately on exposure; follow the approved session invalidation/re-authentication process | identity owner |
| `PAYMENT_CREDENTIAL_ENCRYPTION_KEY` and `PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION` | deployment managed secret; never database/Git | every 90 days and immediately on exposure; promote a new write key only with historic decrypt coverage | payment owner |
| `PAYMENT_CREDENTIAL_DECRYPTION_KEYS` | deployment managed secret; historic-key ring only | retain a version only while an encrypted credential revision remains readable/needed; remove only after the retention policy has crypto-shredded every dependent historic revision | payment owner |
| Sadad merchant/terminal material | encrypted immutable payment-provider credential revisions | rotate by a new revision; never copy to environment files or logs | merchant/payment owner |

Non-secret deployment controls (`SADAD_TRANSPORT_MODE`, callback URL, redirect profile and timeout) are not secret
inventory. They remain fail-closed and cannot enable/default or contact Sadad.

## Encryption-key rotation drill

1. The payment owner schedules the 90-day cycle or exposure response and records the environment, versions, start,
   owner and rollback decision outside Git without recording key material.
2. In the managed secret store, create a new 32-byte canonical-base64 write key and a distinct version label. Keep the
   prior version in `PAYMENT_CREDENTIAL_DECRYPTION_KEYS` as `version:canonical-base64-key`; do not remove it before
   all dependent credential revisions are safely retired/shredded.
3. In staging, atomically reference the new write key/version and historic decrypt ring. Verify a newly encrypted
   synthetic revision bears the new version, and an already encrypted synthetic prior revision still decrypts. Verify
   the Sadad provider remains `SADAD_GO_LIVE_BLOCKED`; no merchant credential or external request is used.
4. If the staged check fails, restore the preceding managed-secret references before accepting any new revision. Do
   not overwrite ciphertext, rewrite revision history, or place a recovery key in database/Git.
5. After an approved promotion, retain the old decrypt entry until `PaymentCredentialRetentionService` has
   crypto-shredded all eligible retired dependent revisions. Then remove only that historic entry in a separately
   reviewed managed-secret change. Record the secret-free outcome and service continuity evidence.

## Provider evidence still required

The following is an external F12-T07/F12-T13 gate and is not PASS merely because this procedure or its synthetic
test exists: written Liara evidence that the selected staging and production service supports managed runtime secrets,
versioned updates/references, auditability, and a rotation method that does not expose values in build logs or require
committing them. The project owner must retain that written evidence and authorize the actual environment drill.

Until then, this repository has only software-level synthetic rotation coverage. It does not claim provider readiness,
production rotation, Sadad activation, deployment, or release sign-off.
