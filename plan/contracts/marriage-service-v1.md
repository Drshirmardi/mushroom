# Marriage service v1

Owner-approved2026-11-01, MZ06. Existing schema engines/standalone/entry offerings unchanged. Service purpose MARRIAGE, semantic role keys FIRST/SECOND (labels editable), two genders allowed per role from MALE/FEMALE, minimumAgeYears18–120, required genericJointText. Only COUPLES inline publications may enable it. Texts/policies/publication hashes pin the rules. Ordered pair texts follow role order, not inviter order. Unresolved assessments do not fabricate interpretation. No prior-result reuse.

Request lifecycle: PENDING, ACCEPTED, CANCELLED, REPLACED. An optional eligibility-failed projection is private to its own actor; the other participant receives no gender/account-existence/DOB information. Phone bound before account exists, encrypted with configured authenticated encryption; links are opaque locators requiring independent verified phone login. Issuer consent and recipient acceptance are independent. New financial access follows both acceptances, processing and sharing consent, then existing one-payment/two-beneficiary flow. Old service contexts keep old rules.

Both link copy and explicit SMS send are supported. Durable invitation-specific delivery; provider ACCEPTED is not DELIVERED. Default60s cooldown,3 sends/invitation,10/day issuer,5/day recipient. SMS settings independent of OTP. UNKNOWN is not automatically replayed. No automatic invitation expiry; cancellation/replacement invalidates acceptance. Pagination, ownership, idempotency, audit minimization and clinic scoping required.

Implementation tasks serialized C01 contracts, C02 offering config/dashboard/result, C03 phone request/app/acceptance, C04 durable SMS, C05 integration/acceptance. Nothing marked DONE until its slice passes review. Owner now authorizes task-isolated staging/commits after each acceptance gate (2026-11-02); no push/deploy.

User flow: [marriage-service-flow.md](marriage-service-flow.md).


## SMS transport review — 2026-11-02

Owner explicitly requests raw text using the installed farazsms1.1.0 adapter. Add TEXT_SEND/sendSimple alongside existing PATTERN_SEND, without changing OTP pattern configuration. Invitation-only non-secret settings: invitationMode=TEXT|PATTERN, invitationSenderLine for TEXT, invitationPatternCode for PATTERN. With no explicit mode, existing invitationPatternCode retains PATTERN behavior; TEXT requires an explicit configured sender line. Message content is constructed on the server from the service label and verified-origin invitation locator, never arbitrary patient text. PUBLIC_APP_URL must be an HTTP(S) origin without credentials/path/query/fragment, HTTPS in production. Missing/invalid configuration rejects enqueue while preserving link sharing.

Each queued delivery pins provider revision/credential identity and records startedAt when claimed. CreatedAt is not a lease clock. Terminal statuses cannot be replayed or rewritten; a crashed SENDING attempt becomes UNKNOWN without retransmission. Adapter uses SDK helpers with abortable, HTTP-status-aware transport; empty/malformed/unacknowledged responses are UNKNOWN, explicit rejection FAILED, provider acknowledgment ACCEPTED only. No carrier delivery inference.

One owner-authorized raw connection test was actually submitted using the accessible SDK-default sender line; provider reference26604507. Owner reported no arrival. Read-only provider reports show request pending-approval, item not-started, sent_count=0 and delivered_count=0. API connection/raw submission are verified; carrier delivery is NOT verified. Raw sending on this actual request requires provider approval; do not silently resend or switch lines. Approved invitation patterns remain an independent alternative. No real invitation/profile/account was fabricated for the live transport proof.

## Operator handoff — approved invitation pattern

Owner authorizes task-isolated commits and push to origin/dev on2026-11-02; no manual deployment. Software acceptance is complete. Live invitation pattern approval and carrier receipt are explicitly deferred by owner. Configure the existing default SMS provider with invitationMode=PATTERN and the approved invitationPatternCode whose only variable is link. Keep the OTP patternCode and API credential unchanged. A generic service-invitation text can be used; provider approval is external and not guaranteed by local tests. PUBLIC_APP_URL is passed to the API in both base and dev Compose and must be the actual public HTTPS app origin. Publish a new marriage-service version explicitly; no old offering/request is converted automatically. Copy-link remains independent of SMS configuration. After approval, an operator performs a separate explicit send and confirms actual receipt; do not replay UNKNOWN or pending-approval automatically.
