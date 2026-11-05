# Browser analytics — AN01

This is the first delivery of the original browser-first analytics plan, not the
completed analytics feature. AN02–AN04 track attribution, semantic domain events,
server conversions/Outbox and end-to-end acceptance. Do not enable production
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

AN01 deliberately strips referrer/query data: acquisition and entry-CTA continuity
are AN02 work, not verified capabilities of this first commit. No purchase is
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
