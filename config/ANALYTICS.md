# Browser analytics — AN01

AN01 and AN02 deliver the browser foundation, attribution and request-level UX events.
AN03–AN04 still own confirmed server conversions/Outbox and end-to-end acceptance.
This is not yet the completed analytics feature. Do not enable production
analytics until those gates and the collection/consent policy are accepted.

## Runtime configuration

`PUBLIC_GA4_MEASUREMENT_ID=G-...` and `PUBLIC_ANALYTICS_CONSENT=granted`
populate the existing `/runtime-config.js` in Docker and VPS dev startup. Both
default to disabled/denied. No API secret belongs in this public configuration.
Runtime changes take effect on reload/restart without rebuilding the frontend.
This technical gate does not obtain a visitor's consent; the consent integration
must supply the applicable policy before enabling collection.

The visitor preference `localStorage['mushroom.analytics']='denied'` is checked
at route/action dispatch. This slice does not add a consent banner or claim
immediate revocation of data already collected by Google's script.

In the GA4 web stream disable Enhanced Measurement automatic history/pageview
tracking (and other automatically collected interactions pending policy review).
Our route observer owns page views; query-only login changes do not count as pages.

## Event boundary

`createAnalytics(adapter)` owns enabled state, logical paths, consecutive route
deduplication and allowed metadata. `page` and `track` are vendor-independent.
Only explicitly annotated CTA elements are observed; no DOM-text autocapture,
form fields, raw query strings, account IDs or medical results are collected.
Browser events make no application API request and perform no database write.
Google's loader is asynchronous, once per document, and its pre-load buffer is
bounded to 100 commands if the script is blocked. This does not guarantee delivery.

AN02 preserves only validated source/medium/campaign slugs, first explicit landing
CTA and HTTPS referrer origin; raw referrer paths/queries remain excluded. Context
is tab-scoped sessionStorage with a 30-minute handoff validity window. Only the
configured app origin receives ma_* handoff parameters; they are removed upon app
initialization while product query/hash parameters stay unchanged. GA4 client/session
IDs come from the documented gtag get callback and are accepted only for the same
measurement ID. Missing/blocked SDK callbacks never delay navigation; in that case
native GA4 cross-domain identity is not guaranteed, although CTA/campaign context
still survives. Same-origin cookie-domain and cross-domain property settings require
operator validation with real GA4 in AN04. No purchase is
emitted from the success page. Nothing is installed on the staff dashboard.

## Verification

`node --experimental-strip-types --test config/analytics.test.mjs`

`node --test config/analytics-browser.test.mjs` (installed Playwright Chromium)

The browser test uses the actual compiled SDK in Chromium and intercepts remote
resources. It verifies dispatch/metadata and lack of API calls, not ingestion
into a real GA4 property or the complete authenticated app journey.

Sources:
- https://developers.google.com/analytics/devguides/collection/ga4/views
- https://developers.google.com/tag-platform/gtagjs/reference

## AN02 behavior semantics

- page_view: logical route including home/checkout/schedule; query-only changes do not count.
- cta_impression: explicit CTA at least 50% intersecting the viewport, once per observer/route.
- cta_click / navigation_click: explicit action or internal known-origin link, never DOM labels.
- feature_engagement: visible intervals >=1s, flushed on visibility loss, pagehide and route cleanup.
- action_attempt / action_result: registered existing request, duration, HTTP status and accepted,
  rejected, unavailable or network_error outcome. Accepted HTTP is NOT purchase/assessment
  completion. Retries are separate attempts. No response or request body is read for observation.
- cart_quantity_set: after a successful cart mutation, opaque public SKU and absolute quantity;
  zero represents removal. It is not an invented add-to-cart quantity delta.
- Public catalogue/product reads expose registered operation and opaque catalogue product ID;
  no product titles, searches, prices, diagnoses or private patient resource identifiers.

The existing app session-aware transport, auth headers, marriage context, response object and
body ownership are preserved. No additional application API call, database write, server
collector or new infrastructure is introduced. GA4 reports need custom definitions for custom
metadata. This slice does not add generic DOM/form capture, session replay, monetary conversions,
or server-side purchase events. New app endpoint categories require explicit registry entries.

Tests: analytics-context.test.mjs (pure sanitization/outcomes), analytics-journey.test.mjs
(actual Chromium cross-origin handoff and unchanged request transport), existing API/auth
regressions. Remote GA4 script/API are intercepted; live ingestion is not asserted.
