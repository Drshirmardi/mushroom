# Independent Patient App UI plan

Owner approval: 2026-10-13. This is a product-design track, not an extension of F12-T12 and not a phase transition. Phase 12 remains active. Existing AGENTS review, evidence and per-task commit gates apply.

## Coordination

Owner override 2026-10-13: all future Patient UI implementation runs in X:/Git/mushroom on branch front. Authoritative active claims: this checkout's plan/STATUS.md. The previous feat/patient-app-ui checkout is inactive, preserved for safety and not used for implementation. Historical task paths below describe past execution only. PUI-T01 and PUI-T02 commits are retained on front; dev is unchanged. Read STATUS before each claim; preserve the existing plan eligibility, review and task commit gates. No batch is active and no next task is started by this relocation.

## PUI-T01 — Patient foundations and Store catalog

- [x] PUI-T01 — DONE; batch PUI-B01; owner Codex /root.
- Dependencies: completed F09-T04-R1 public catalog, existing Phase09 commerce APIs; approved Concept A and code-first scope; committed base dev 2bb6f8f5a41e04621e2175298164cb7036e79fb0.
- Frozen contract: existing commerce-catalog-api, product/SKU IDs, first SKU, cart cap100, wishlist behavior and destinations unchanged. No auth/business/API/schema/client change.
- Scope/owned files: globals.css, root layout typography only, public Store page, ui/button.tsx and input.tsx, components/store/**, app-shell.tsx/bottom-tab-bar.tsx Store-only presentation, public/fonts/**, focused patient-ui test, this plan, logs/patient-ui.md and local STATUS pointer/handoff.
- Design: Medical Blue176B9A, Teal087F85 focus, ink173C53, canvasF6FAFC, limited warm accent. Vazirmatn OFL, zero Persian tracking; reuse Tailwind4/Lucide/Zustand. Figma QA interrupted: reference only, no pixel-perfect/finalized-component claim.
- Acceptance: catalog still uses actual API and query/categories; no fabricated capabilities. Mobile390x844/desktop1440x900, max720shell; no overflow. Named keyboard controls and visible focus, targets44/primary48, RTL/mixed text/price isolation, static/reduced-motion loading, separate error/empty/retry/disabled states. Text>=4.5:1, control/focus>=3:1. App typecheck and focused tests pass; real browser evidence and source review. Global font loading may affect text metrics elsewhere but other module screens/logic are not redesigned; document risk.
- Excluded: product detail/cart/checkout/order/payment screens; Assessment/Profile/Dashboard; backend/authentication/SMS/data, dependencies/lockfile or project config changes.
- Verification uses separate UI port3002 (3011 blocked by current CORS) and existing API3003, no real SMS/orders/payments. No secret files copied; synthetic data only.
- DoD: all acceptance evidence in logs/patient-ui.md; coordinator review; one feat(PUI-T01) commit with owned code/test/plan only, preserving user AGENTS/gitignore changes. Release authoritative claim after success, or retain BLOCKED/REWORK. Never push/merge automatically.

## Follow-up (not claimed)

Store product details and cart: propose scope after review of PUI-T01. Checkout/payment require separate safe contract and fixture evidence. Store precedes Assessment, Profile and Dashboard.

## Dev sync

Review fetched origin/dev before normal merge in the UI branch; preserve user changes, rerun affected checks. Do not merge unverified updates. No dev push or feature-to-dev merge without owner approval.

## PUI-T02 — Product Details + Cart + Favorites

- [x] PUI-T02 DONE; batch PUI-B02; owner Codex /root; approved2026-10-13.
- Dependencies: PUI-T01 DONE and existing commerce contracts. Single coherent multi-screen UI task.
- Frozen contract: product firstSKU; favorites use their savedSKU; cart 0removes/max100; product quantity1..100; existing cart totals/current API and destinations; no image/stock fields invented.
- Owned paths and central coordination: active PUI-B02 record in X:/Git/mushroom/plan/STATUS.md. Three route files, Store components, globals.css, shared shell/navigation, focused UI tests, plan/status/log only.
- Acceptance: all three rendered interfaces follow ConceptA, reusable card/price/quantity/state; shared navbar consistent across Patient modules. Real API compatibility, responsive390x844/1440x900, RTL/numeric isolation, keyboard/focus, empty/error/loading/busy, passing typecheck/tests and coordinator review. Read-only state fault simulation and reversible synthetic cart/favorite changes; no orders/payments/SMS.
- Runtime override by owner: regular Patient dev on3001, not alternate3002/3004; prior servers stopped. API existing runtime3003; no secrets copied or backend changes.
- Completion: record evidence, mark checklist after gates, one task-level commit, release central claim; stop. Checkout/order/payment next proposal only.
