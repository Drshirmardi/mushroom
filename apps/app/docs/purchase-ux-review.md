# F12-FE01-CU01 — Cart to purchase completion

VERDICT: Incomplete (full live UX Audit); focused software verification PASS.

Persona: Persian-speaking patient buying on a phone, ordinary technical comfort, cautious about duplicate charges. Includes a first-time buyer lens.
Scope: apps/app only; existing financial, stock, consent and payment contracts preserved. No live payment, external message, provider or database write. Single coordinated task, ownership released after main review; no next task selected.

Two gpt-6.1-sol / medium workers handled isolated checkout layout and payment behavior. Root drove browser interactions, receipt changes, integration and final review. A fresh gpt-6.1-sol / low reviewer pruned findings: Drafted 6, Kept 5, Generic 1, Duplicate 0. Header consistency remains explicitly requested polish, not an inflated usability finding.

## Top five and reproduction

All findings below are fixed. Controlled fixture evidence is in `.local/purchase-ux/`; commands are intercepted and never reach a real API. The browser test's JSON manifest records action times and URLs.

| ID / severity / layer | Reproduce and observed behavior | Expected and smallest patch | Evidence / source |
| --- | --- | --- | --- |
| H1 High / Interaction | Open a shared payment from a non-wallet origin, use its Back control; it linked to wallet and lost the originating flow. | Use tracked same-document app history; use purpose/resource fallback for direct entry and preserve exact invitation context. | manifest: shared payment Back; `lib/payment-return.ts`, wallet/pay and payment-result pages |
| H2 High / Feedback | Order completion receives a receipt object that is not VERIFIED or belongs to another order; inline text previously claimed payment confirmation while the popup used stricter checks. | Accept/render only matching VERIFIED proof; generation checks reject obsolete reads and rendering rechecks receipt ownership. | Browser unverified receipt check; `store/order-success/page.tsx` |
| M1 Medium / Feedback | Keep shared payment pending for successive five-second polls; resource.refreshing rendered a recurring visible ECG. | Keep background reads and errors but suppress background-only loading feedback; retain mounted payment controls and confirmation. | Browser virtual-time poll check; `profile/wallet/pay/page.tsx` |
| M2 Medium / Interaction | Enter checkout with a long summary; the submit action was in scrolling content. | One submit action in existing ShellAction portal, total visible, at least 20px bottom padding above the native app navigation/safe area. | checkout.png and seven-width geometry assertions; `store/checkout/page.tsx`, purchase-flow.module.css |
| M3 Medium / Interaction | Finish purchase, inspect receipt/short-height dialog; primary tracking action scrolled away. | Dock receipt-page tracking action and keep dialog actions sticky within its bounded scroller. | receipt-manual.png, receipt-confirm.png; receipt-page.module.css and order-payment-success.tsx |

## Additional polish and implementation

- Cart and checkout use the existing centered sticky PageHeader, with scoped full-bleed wrappers instead of the older left-aligned StoreHeader. Cart and checkout footer spacing now match.
- ServicePage accepts optional onBack without altering ordinary back links. Its button receives the same inline icon layout as links.
- Existing shell flow, measured footer clearance and keyboard support are reused; no extra viewport-fixed overlay or duplicated checkout submit.
- Receipt responses that arrive after navigation cannot overwrite a newer request. Cached receipts are matched to the current order before any inline success display.

## Verification and practical limits

- Typecheck and optimized Next build PASS. All 216 unit tests PASS, including six focused payment/back tests.
- `node e2e/purchase-ux.browser.mjs` PASS: cart → checkout → payment → Back; discount typing/error recovery; open/close wallet confirmation; shared payment polling and Back to actual origin; verified completion and rejection of unverified receipt. Seven widths: 320/375/414/768/1024/1280/1440. One checkout submit in the action slot; comfortable gap above navigation; no page exceptions or warnings in this deterministic run.
- Existing assessment continuity and eight-size app-shell browser regressions PASS. Additive history export did not alter assessment guards.
- Scoped lint delta: zero added errors or warnings; five baseline errors and one baseline warning in touched source remain separate.
- Main-session browser interactions reproduced baseline cart/checkout structure, typed and removed a discount, opened payment confirmation, and inspected completion. Baseline exploratory console showed Next CSS-preload warnings and a deliberately injected invalid-discount 422; these are recorded separately from zero-warning deterministic checks.
- Checkout axe scan: zero Critical/Serious; a moderate region landmark finding on the portal action area was corrected with a named region. No complete all-route axe/performance/role/scenario certification is claimed.

Full UX Audit remains Incomplete because the deployed authenticated session, full per-route skill manifest, complete scenario battery and representative performance measurements were not all available/run. Local synthetic evidence must not be read as live bank or physical-device acceptance. No deployment/push performed.

## Roadmap and handoff

Quick wins completed: header consistency, silent polling, accurate Back, primary actions. Structural fixes completed: shared safe payment-return helper and receipt identity/race protection. No advanced decoration added; physical iOS/Android keyboard/safe-area and deployed gateway return remain acceptance work outside this software slice.

As a handheld purchase flow, the result feels more settled: the next action stays within reach, Back respects where the patient came from, and ordinary background checks no longer look like payment is restarting. That confidence depends on the displayed proof remaining authoritative; this implementation preserves that boundary rather than guessing success.
