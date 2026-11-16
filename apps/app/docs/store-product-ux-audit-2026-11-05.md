# Store and product UX review — 2026-11-05

VERDICT: **Incomplete** for exhaustive UX certification; concrete findings below are reproduced. Review and design recommendation only: no implementation, commit or deployment.

Persona: Persian-speaking patient/customer on a phone, low-to-medium technical confidence, wants to recognize a product, understand its details and continue buying without losing their place. Also reviewed as a first-time shopper.

Scope: live authenticated `dev-app.drshirmardi.com/store`, catalogue/search at `/store?view=all`, and `/store/products/40000000-0000-4000-8000-000000000102?sku=40000000-0000-4000-8000-000000000103`. `/store/products` has no separate index page in the current router; catalogue lives under `/store`. Current catalogue exposes one sample product: findings do not certify every product or variant.

## Evidence and limits

- Main session operated the real logged-in browser. Search, no-results/recovery, address sheet/Escape, catalogue-to-product navigation, product handle/section links, add/remove quantity, toast expiry, and Back were exercised.
- Local evidence folder: `apps/app/.local/store-ux-audit/` (ignored). Manifest: 35 entries over 8.06 minutes, median gap12.707s, 15 screenshots. See `interaction-manifest.json`, `network.json`, `product-axe.json`, `store-axe.json`.
- Observed console reads: errors0/warnings0. Captured network buffer:103 events, no captured HTTP4xx/5xx; buffer reports earlier entries truncated, so this is not full-session network certification. No audit allowlist found in scoped app discovery.
- WCAG-tagged axe checks on the app shell: no reported violations on sampled product/store states. This is not screen-reader certification or proof of complete WCAG conformance.
- Both routes: document overflow0 at320/375/768/1024/1280/1440. Product action footer remains inside the measured viewport. Expanded product also observed at459px. No physical-device or200%-text certification in this review.
- Fixed375×812 page-load observation on `/store`: LCP964ms, CLS0.00563. Slowest sampled interaction in an earlier observation144ms; this is not a certified INP percentile. An earlier CLS0.524 sample included viewport changes and was discarded. Metrics are unthrottled live-dev observations, not field performance claims.
- Full scenario battery, multiple roles/lifecycles,100–1000-item data, multi-SKU/out-of-stock content, offline/slow/error injection and all interactive controls were not exhausted. Sharing and existing wishlist data were left alone. Primary cart action used one reversible item in an initially empty cart; each audit item was removed and the store badge returned to0. No order/payment/address was submitted.
- The last attempt to revisit the searched product was interrupted when the active user tab changed to Profile. No finding is inferred from that interference. Browser viewport override was reset; the user's current tab was left in place.

## Top five, ranked by impact and effort

1. **H1: Section navigation misses its destination.** An existing control fails at the moment the shopper seeks important product information.
2. **M1: Cart access disappears with the toast.** A persistent next step removes a concrete interruption between adding and checkout.
3. **H2: Current sample content contradicts itself.** Approved copy must be trustworthy before a visual redesign can improve confidence; this requires editorial ownership.
4. **M2: Desktop gallery delays product assessment.** Large empty space consumes the area that could show the product summary beside the image.
5. **L1: Banner retains the former storefront name.** Brand consistency is easy to address once the intended banner identity is confirmed.

Self-critique: fresh independent agent reviewed6 drafts; KEEP5, GENERIC1, DUPLICATE0. The draft claiming that products below the fold alone prove a usability defect was rejected; the measured placement is retained as a design recommendation, not a confirmed behavioral failure. Banner finding remains conditional on whether the old name is intentional artwork.

## H1 — Product section links do not reveal the requested section

Layer: Interaction. Severity: High / Nielsen3. Surface: product,375×812 and459×764. Persona: shopper trying to read usage restrictions.

Reproduce:1. Open product.2. Expand details.3. Click Warnings or Contraindications.4. Compare target position and active navigation item after scrolling settles.

Observed: at375px, Warnings remained at y816.7, below the usable viewport, with panel scroll408.8 and About still active. At459px, Contraindications remained at y942.9 with panel scroll519.2. Expected: target heading appears below sticky controls, with its own chip active and reachable in RTL.

Evidence: `product-warnings-375.png`, `product-warning-settled.png`, manifest. Suspected location: `src/components/store/product-detail-panel.tsx:42`, scroll spy at51; `.store-detail__sheet` is positioned, so section `offsetTop` uses a different origin from the scroll root.

Smallest possible patch: calculate targets and scroll-spy thresholds in the scroll root's coordinate system; account for both sticky handle and navigation strip; reveal the active RTL chip without assuming positive RTL `scrollLeft`. Verify each chip on the existing nested panel rather than replacing the mobile interaction without evidence.

## M1 — No persistent route to cart after adding a product

Layer: Interaction. Severity: Medium / Nielsen2. Surface: product,375×812. Persona: shopper who reads more details after adding.

Reproduce:1. Start with empty cart.2. Add one item.3. Wait for the3500ms success toast to expire.4. Find a cart action without leaving the product.

Observed: quantity controls remain, but there are zero cart links/buttons in the product UI; the toast held the only direct cart action. Expected: cart remains reachable with the selected quantity preserved. Checkout is still reachable elsewhere in the app; this is not a claim that checkout is impossible.

Evidence: `product-added.png`, `product-added-after-toast.png`, `product-restored.png`; observed `cartLinks:[]`, quantity1. Suspected location: `src/app/(public)/store/products/[id]/page.tsx:88`; timed toast at70 and96; `src/components/store/added-to-cart-toast.tsx`.

Smallest possible patch: add a persistent accessible cart action in the product header with current count, retaining the purchase bar and transient success feedback. Do not replace quantity controls with a conflicting second purchase action.

## H2 — Sample product copy contains an unconditional contradiction

Layer: Feedback/content. Severity: High / Nielsen3, scoped to this sample data. Surface: product content. Persona: customer deciding whether this is the right item.

Reproduce: read short description/usage, then Contraindications. Observed: usage describes applying drops, while contraindications says “از مصرف این روغن خودداری کنید اکیدا ممنوع!” without identifying a condition or audience. Expected: approved, unambiguous instructions and restrictions.

Evidence: initial live accessibility snapshot and `product-warning-settled.png`; section text recorded during the walkthrough. Rendering location: `src/components/store/product-content-sections.tsx:42`; the underlying content is editorial/API data, not an inferred frontend validation failure.

Smallest possible patch: product owner reviews and corrects the authoritative approved content before publication. Do not auto-rewrite clinical copy, infer safety/efficacy, or implement a keyword-based purchase gate. A frontend redesign cannot resolve this data contradiction.

## M2 — Desktop keeps the mobile stacked composition and oversized gallery

Layer: Visual. Severity: Medium / Nielsen2. Surface: product,1440×900. Persona: shopper assessing image and product information together.

Reproduce: load product fresh at1440×900. Observed: gallery1088×611px starts at y80; product title starts at y728, with large unused space alongside the photo. Expected: wide layout uses available horizontal space to show image and decision information together.

Evidence: `product-desktop.png`, measured rectangles. Suspected locations: `src/app/globals.css:736`,738,740 and gallery strip at685. Smallest possible patch: introduce a desktop two-column image/summary arrangement at the existing desktop breakpoint; keep mobile panel behavior and footer reservation. Avoid merely stretching the mobile gallery across the desktop shell.

## L1 — Banner artwork shows a different storefront name

Layer: Visual/content. Severity: Low / Nielsen1. Surface: `/store`, current hero artwork.

Reproduce: compare header identity with banner artwork. Observed: interface says Dr Shirmardi; artwork still includes Sabz Zendegi. Expected: consistent storefront identity, while allowing separately named product brands when intentional.

Evidence: `store-initial.png`, `store-mobile-entry.png`. Rendering location: `src/components/store/store-hero-slider.tsx`; image is managed banner content, not hardcoded header text.

Smallest possible patch: confirm intended identity of this banner and replace the approved artwork at its source if it is the former storefront brand. Do not blindly rename product manufacturers or generate replacement medical/marketing claims.

## Recommended design direction

Store: keep the current light palette, with a compact brand/search/cart header; use one shorter banner; surface products sooner; put account/order/wallet shortcuts after shopping content or in existing account access. Render personalized product content when it offers a useful next action. In the measured375px view, the first product starts near y744; this supports testing a more product-focused composition, not claiming that every below-fold product is a bug. Do not add a decorative empty recommendations card, fake categories, ratings, discount claims or unavailable sorting controls.

Catalogue: stable image proportions and card rhythm; readable name, actual variant/size when supplied, clear toman price and in-cart state. Category/filter labels should show actual selected names. Add sorting/filter choices only where backed by real data and worthwhile catalogue size.

Product: preserve usable mobile gallery/panel behavior; make name, actual selected variant, useful short description and price easy to scan. Provide persistent cart access; repair section navigation; keep usage/restrictions readable. On desktop, place summary alongside the image. Keep internal/sample SKU codes subordinate to useful customer specifications. Collect missing approved size/volume/content before showing those fields; never invent specifications or trust badges.

## Execution order proposed for discussion

- Quick wins: H1 navigation, M1 persistent cart, approved-content/brand review for H2/L1.
- Structural: M2 desktop composition and a measured product-first storefront arrangement; share typography and spacing conventions across listing and details.
- Later polish: image enlargement if useful for the available assets, richer real variant/specification presentation and empty/error/slow-network refinements. No new animation or visual effect is required to solve the observed problems.

What already worked: search kept focus and returned the matching item (`store-search.png`); empty search had recovery (`store-empty-search.png`); address sheet opened and closed through Escape (`store-address-sheet.png`); add/remove feedback updated quantity and restored cart0 (`product-added.png`, `product-restored.png`); Back preserved the search query in the observed round-trip. No code build/test suite was run because implementation was intentionally deferred.

If these pages were a physical object, the storefront would feel inviting but the product page would still have a few catches under the fingers: a navigation control that misses its target, a disappearing route to the basket and copy that makes the buyer hesitate. Fixing those catches, then arranging the same genuine information more calmly, will improve perceived quality more than adding decoration.
