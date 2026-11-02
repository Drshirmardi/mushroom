# ADR-0047 — Versioned marriage service and phone-bound invitations

Status: Accepted by owner implementation request,2026-11-01. Scope F12-FE01-MZ06.

Extend existing COUPLES offering text snapshots with optional versioned MARRIAGE configuration: two stable semantic roles, allowed MALE/FEMALE sets, minimum ages18–120 and mandatory generic shared interpretation. Ordered profile-pair texts are role-sensitive for these versions only. Each request uses new independent assessment grants; existing pricing/consents/billing remain authoritative.

New service requests bind a publication, initiator role and encrypted canonical recipient phone before the recipient has an account. Only the verified matching account may accept. No phantom accounts, public phone lookup or disclosure of the recipient profile. Requests materialize existing linking/educational participation after both independent acceptances; historical offers and invitations remain unchanged. Roles are distinct from initiator/partner slots. New explicit SMS dispatch uses separate invitation pattern and durable delivery state; OTP unchanged. No automatic expiry. Cancellation/replacement are final. No raw phone/answers in audit or URL.

Privacy, consent, source-current, eligibility and payment checks remain server authoritative. Owner now authorizes independent completed-task commits (2026-11-02); no push/deploy. Required proofs: real PostgreSQL migration preservation, account/no-account and mismatch/age/gender/self boundaries, acceptance/payment replay and races, role-order/fallback/withdrawal, SMS queue/limits/failure and browser flows. Actual carrier delivery is external acceptance, not inferred from provider acceptance.
