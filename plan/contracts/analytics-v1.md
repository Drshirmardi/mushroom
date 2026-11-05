# Analytics v1 — approved browser-first plan

Owner authorizes implementation 2026-11-06. Branch codex/analytics-ga4, sole /root.
No raw click/page database, replay, new service, or analytics dashboard. GA4 first;
future destinations implement the same event boundary, not page-specific vendor calls.

AN01: shared browser contract, GA4 initialization, logical route tracking and explicit
landing CTA tracking. No raw URL query, title, DOM text, form values, account IDs,
medical answers/results, or credentials. Disabled without explicit runtime configuration.
One page owner; disable GA4 enhanced history pageviews in the property. No outbound
request to the application API for browser analytics. Consent/opt-out changes stop sends.

AN02 (dependent on AN01): domain events for app/commerce and attribution context.
AN03 (dependent on AN02): confirmed server conversions and bounded existing Outbox.
AN04 (dependent on AN03): real browser/integration/release verification and operator setup.
These tasks remain unchecked until their respective evidence gates pass. No production
activation, push, or deployment is authorized by the implementation request.

Sources: https://developers.google.com/analytics/devguides/collection/ga4/views
and https://developers.google.com/tag-platform/gtagjs/reference.


AN02 frozen implementation contract (2026-11-06): browser operation registry reports
request attempts/results, not authoritative financial/medical completion. First CTA,
validated campaign slugs and origin-only HTTPS referrer travel in tab-scoped, bounded
30-minute context to the configured app origin. GA identifiers are optional and property-
scoped; missing SDK never blocks navigation. Only opaque public catalogue/SKU identifiers
are allowed in commerce metadata. Existing API request/body/response ownership and
invitation/session headers must remain unchanged. See config/ANALYTICS.md for event names
and limits. AN03/AN04 remain separate, dependent tasks; no original architecture change.

AN03 implementation contract (2026-11-06): optional validated, redacted context rides
existing requests; financial conversions enqueue only with authoritative settlement
inside its transaction. Actual GA identifiers and event times are required; missing
context skips analytics. Existing PostgreSQL Outbox owns partitioned bounded retries,
payload purge and short-lived attribution/tombstones; no schema or service added.
Owner explicitly chose short retention: refunds after context expiry remain financial
records only and are not forwarded to GA4. No long-term order attribution is added.
At-least-once HTTP submission is not proof of ingestion or exactly-once reporting.
Signup/completion capture after successful handlers is best-effort with a crash gap.
See config/ANALYTICS.md for the precise event, rial, retention, consent and operator limits.
AN04 remains a separate acceptance gate; no real property/production activation.
