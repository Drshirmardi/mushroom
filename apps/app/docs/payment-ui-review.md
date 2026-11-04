# Payment UI — F12-FE01-PU01

2026-11-05 · DONE/software · sole writer /root, claim released. Scope: shared payment chooser and the store/payment and profile/wallet/pay surfaces. No API, financial calculation or navigation changes. Preserve pre-existing edits in payment-chooser.tsx (removed redundant copy and secondary confirmation button), AGENTS and unrelated worktree changes.

Persona: Persian-speaking patient on a phone, wants to verify the charge and choose a payment method without repeated amounts.

Live baseline: opened the existing authenticated store payment, opened/closed wallet confirmation without submitting, followed Home → pending payment → profile/wallet/pay. Store repeats final amount in hero, order total and chooser; shared payment repeats it in an oversized service introduction/card and chooser. Method hint runs into title because both are inline spans. No console warnings/errors observed. No real payment or cancellation.

Fix: one prominent amount per pending payment; existing compact page header; native collapsible order breakdown; block method titles/hints and explicit action arrows. Keep bank ambiguity, insufficient balance, cancellation, confirmation and return behavior.

Audit scope is deliberately focused per owner request. Full UX audit verdict: Incomplete (full scenario battery and performance certification are out of scope). Fresh critique consolidated duplicate amount findings; kept observed method-text collision; warned to keep purpose visible and order details keyboard-accessible.

Verification: app typecheck and optimized build PASS. Scoped lint: zero new errors/warnings (one existing error and warning). Local browser using existing intercepted purchase fixture: both routes at 320/375/414/768/1024/1280/1440, zero horizontal overflow; wallet text200%/reduced motion overflow0; disclosure expands/collapses; wallet confirmation opens/Escape closes; fake final payment invokes exactly one wallet command and reaches success. No real writes. Zero page errors; Next dev emitted existing font/CSS preload warnings, so no clean-console/full-audit certification. No new test suite or exhaustive rerun, per owner request.

Screenshots: `apps/app/.local/payment-ui-store.png`, `apps/app/.local/payment-ui-wallet.png` (ignored local evidence). The two pages now feel like the same small, understandable payment form: one charge to verify, a clearly separated balance, and two recognizable methods. Physical-device and deployed-after-change review remain unverified. No next batch selected.

Additional focused checks: zero-balance wallet disabled with readable deficit; TOPUP exposes bank only and no recursive topup action. A first fixture override lacked CORS headers and timed out; fixing the test interception then using the visible Retry action recovered. This harness failure is excluded from product findings, not from raw logs. Pre-existing chooser copy/button removals remain in the worktree and are excluded from this task's commit.
