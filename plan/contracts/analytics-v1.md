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
