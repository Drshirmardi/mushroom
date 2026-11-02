# Marriage service v1

Owner-approved2026-11-01, MZ06. Existing schema engines/standalone/entry offerings unchanged. Service purpose MARRIAGE, semantic role keys FIRST/SECOND (labels editable), two genders allowed per role from MALE/FEMALE, minimumAgeYears18–120, required genericJointText. Only COUPLES inline publications may enable it. Texts/policies/publication hashes pin the rules. Ordered pair texts follow role order, not inviter order. Unresolved assessments do not fabricate interpretation. No prior-result reuse.

Request lifecycle: PENDING, ACCEPTED, CANCELLED, REPLACED. An optional eligibility-failed projection is private to its own actor; the other participant receives no gender/account-existence/DOB information. Phone bound before account exists, encrypted with configured authenticated encryption; links are opaque locators requiring independent verified phone login. Issuer consent and recipient acceptance are independent. New financial access follows both acceptances, processing and sharing consent, then existing one-payment/two-beneficiary flow. Old service contexts keep old rules.

Both link copy and explicit SMS send are supported. Durable invitation-specific delivery; provider ACCEPTED is not DELIVERED. Default60s cooldown,3 sends/invitation,10/day issuer,5/day recipient. SMS settings independent of OTP. UNKNOWN is not automatically replayed. No automatic invitation expiry; cancellation/replacement invalidates acceptance. Pagination, ownership, idempotency, audit minimization and clinic scoping required.

Implementation tasks serialized C01 contracts, C02 offering config/dashboard/result, C03 phone request/app/acceptance, C04 durable SMS, C05 integration/acceptance. Nothing marked DONE until its slice passes review. Owner now authorizes task-isolated staging/commits after each acceptance gate (2026-11-02); no push/deploy.

User flow: [marriage-service-flow.md](marriage-service-flow.md).
