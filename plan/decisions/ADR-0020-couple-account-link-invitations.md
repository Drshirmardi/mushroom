# ADR-0020 — Adult couple account linking before assessment processing

- Status: ACCEPTED for F12-PJ-C01 technical identity/invitation/consent scope, 2026-10-16.
- Authority: continuous owner backend instruction; explicit age minimum18, invitations without automatic expiry, purchase cancellation disabled. No clinical, refund-exception or retention policy is inferred.

## Context and decision

Two participants need independent authenticated identities before an eventual paid couple assessment. Build a small same-clinic CoupleSession, CoupleParticipant and CoupleInvitation aggregate. It links two adult registered patient accounts only. It does not link/reuse an existing individual attempt, process answers, generate a result, grant entitlement or execute billing. Existing questionnaire engine/BillingIntent remain the future domain owners.

Sessions pin an immutable, active COUPLES_ACCOUNT_LINKING/fa-IR ConsentPolicyVersion. Each participant explicitly accepts that exact account-link policy under their own active session. No policy text is generated/seeded or published by implementation. Extend the existing owner-document consent publisher through an explicit purpose opt-in, retaining exact hash/environment/release-reference validation and its old medical-policy default. Missing/changed policy fails closed. Account-link consent does not authorize medical answer processing or disclosure of individual answers; those require a future assessment-specific grant/version contract.

Age18 is checked on each participant's own latest self-reported intake birth date; this is not verified legal identity/age. Do not collect a duplicate date in the couple module. Invitation issuance binds to an already registered same-clinic patient resolved from normalized phone. The phone is neither copied into invitation storage nor returned/logged; onboarding a new recipient before invitation is the minimal current boundary. No SMS/email is sent. Invitation secret is 256 random bits, only its SHA-256 stored; return plaintext once. Recover a lost initial response by explicitly issuing a replacement link, which revokes the previous pending token. Replay returns the same invitation id and no token.

Invitations have no automatic TTL. GET/open/prefetch never accepts or consumes them; the intended authenticated recipient must preview and explicitly POST acceptance. Session row locking, partial uniqueness, participant-slot uniqueness, same-clinic composite FKs and transactional audit serialize issuance/acceptance/revocation. Self-acceptance, third participants, foreign clinic/account, old/superseded token and revoked consent fail closed. Responses expose only own-session opaque ids, participant slots/consent states, and no partner identity/answers/medical data.

Consent withdrawal remains available, idempotently disables the linked session and pending invitation, and cannot be silently reversed. This is access/privacy revocation, not purchase cancellation or an automatic refund. Old session history remains a minimized own record; future joint-result reads must also require both current grants. No deletion/retention period is invented.

## Alternatives and consequences

Unbound bearer invitations and impersonation on one shared account are rejected. New user/OTP/payment engines, reusable raw-token storage, automatic expiry and guessed clinical rules are rejected. Three scoped relational models are justified by two identities, one-time invitation ownership and immutable consent evidence. Medical and account-link consent remain distinct. Frontend and new-recipient registration UX are later work; user can use two devices or authenticate accounts sequentially, with identical server checks.

## Impact and validation

One additive migration, couples Nest module, existing consent document tool opt-in, small Journey link summaries, strict/generated APIs and focused PostgreSQL tests. Validate age boundary, exact consent/hash/clinic, token hashing/no raw logging or read leakage, intended recipient/two accounts, nonexpiry/preview nonconsumption, races/replay/replacement/revocation and fail-closed audits; fresh/upgrade/no drift and current-domain regressions. No persistent DB/provider/frontend/push/deployment. Revisit before actual paid couple attempts/joint results, unregistered invitations or real retention policy activation.
