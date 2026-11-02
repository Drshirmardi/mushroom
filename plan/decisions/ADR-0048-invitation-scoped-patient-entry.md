# ADR-0048 — Invitation-scoped initial-entry exception

Date: 2026-11-03. Status: accepted by owner implementation plan MZ10.

Invited recipients may complete the specific marriage service after verified-phone authentication and their required profile, without completing the general entry assessment. General entry is never marked complete or deferred by this exception.

The optional X-Marriage-Request-Id header is a locator, not a credential. The entry guard verifies the active patient/session, verified current phone, clinic and stored recipient fingerprint, then matches each permitted resource to the accepted request. Pending invitations only allow their own read/review/accept. Accepted requests additionally allow their versioned consent policies and the recipient's related educational participation, grant/submission, purchase and billing intent. Existing controller permissions, consent, eligibility, version and financial checks still apply. Unrelated lists, independent top-ups and other services remain gated.

After acceptance, the stored recipient patient ID is authoritative; a later holder of the original number cannot read the request or list it. The original recipient retains ownership after verifying a changed phone.

The patient UI carries the locator in internal continuation URLs. A per-account, per-intent, per-tab sessionStorage fallback recovers payment return navigation; it conveys no server authority. The dedicated web login reuses OTP and accepts only exact invitation paths on the configured patient origin. Anonymous visitors receive no invitation identities. No schema migration or automatic legacy conversion.

Verification requires real PostgreSQL access/payment/assessment tests and separate browser navigation checks. MZ09 polling and MZ11 presentation remain independent tasks.
