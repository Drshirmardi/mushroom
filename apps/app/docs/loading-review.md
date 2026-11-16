# Loading review — F12-FE01-LD01

Coordinator/writer/reviewer: Codex /root, single task, no delegation.
Status: DONE/software; main-agent review PASS, scoped claim released (2026-11-04).
Frozen scope: apps/app only, existing backend contracts and design.
User-approved plan supersedes repository-wide status/graph writes for this slice.
Preserve existing apps/app/AGENTS.md and protected home/slider-data.ts.

Persona: Persian-speaking patient, phone-first, ordinary technical comfort; returning and first-time visitor.

## Coverage inventory

| Surface | Initial request | Operation | Refresh/error handling |
| --- | --- | --- | --- |
| Session, patient-entry, root/welcome Suspense | ECG | Existing authentication controls | Existing retry and redirect authority |
| Home/journey, assessment summary, order progress | Shaped skeleton | Existing navigation | Preserve rendered journey on background refresh |
| Store catalogue, recommendations, product, gallery | Grid/detail/image skeleton | ECG on actual pending actions | Existing scoped request generations; stable image fallback |
| Cart, checkout, orders/tracking, payment | List/form/payment skeleton | ECG and disabled controls | Preserve authoritative payment and inventory states |
| Booking, schedule, confirm, receipt | List/rows/detail/payment skeleton | ECG on booking/payment | Receipt never inferred from a loading state |
| Assessment wizard, result, offerings, couples/marriage | Existing hub shapes plus form/detail/card | ECG on pending actions | Keep answer/history guards and consent/payment rules |
| Programs, owned services, treatment | List/detail skeleton | ECG on pending actions | Existing service lifecycle labels retained |
| Profile/edit/medical/health record/security/addresses | Profile/form/settings/list skeleton | ECG on pending actions | Shared refresh retention and existing retries |
| Wallet, payment result, notifications/settings | Payment/list/settings skeleton | ECG on pending actions | Errors end loading; no mutation auto-retry |
| Articles, trackers and doctors | List/detail skeleton | Existing controls | Shared resource-state error/retry |
| Chat | Message skeleton | ECG on send/older-history | Preserve messages, input and prepend scroll anchor |

## Implementation and review

- `HeartbeatLoader`, `AppLoading` and local refresh feedback replace dots/spinners; hidden status labels and reduced-motion/forced-colors handling remain accessible.
- Eleven skeleton shapes render immediately, with no artificial wait or staggered fade. Ten route boundaries keep existing layouts/navigation available; the assessment hub's dedicated skeleton remains intact.
- `AsyncButton` supplies click-scoped feedback and a synchronous duplicate-click lock for 28 existing asynchronous controls. Existing `Button` and native operation states use the same ECG; icon-only buttons avoid overlapping icons.
- Shared resource reads retain same-source data during reload/error, report refreshing separately, ignore superseded responses and use the existing ten-second request limit. Identity changes still hide the previous resource.
- Local notification/chart/cart reloads retain known data and reject obsolete reads. Home visibility/pageshow uses background refresh. Failed logout returns to an actionable state.
- Product image placeholders reserve geometry, handle load/error/source replacement and bound visible-image waits. Lazy-image timers start only near the viewport. Success after cart addition is immediate after the authoritative response; the decorative 900ms spinner is removed.
- No API, schema, dependency, deployment, actual patient write or protected slider-data change. Existing AGENTS and unrelated worktree edits remain outside this task.

## Verification evidence

| Check | Result |
| --- | --- |
| `pnpm exec vitest run` | PASS: 210 tests / 43 files, including 7 new loading-component regressions |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm exec next build` | PASS: optimized production build |
| `node e2e/loading-lint.mjs` | PASS: 89 source files checked, zero added errors/warnings against HEAD; 35 existing errors and 25 existing warnings are retained in the baseline |
| `node e2e/loading.browser.mjs` | PASS: bootstrap and local ECG, skeleton/error/retry, seven widths (320/375/414/768/1024/1280/1440), 200% settings text, reduced motion, retained refresh data, response race, bounded stalled reads/images, 19 fetch-family routes and stable image geometry |
| Action verification in the loading browser run | PASS: four synthetic metric writes, one synthetic payment request, disabled pending controls, retained input, failure recovery; no actual API/provider writes |
| `node e2e/loading-images.browser.mjs` | PASS: existing real/missing/404 image and product-switching checks; helper URL assertions accept the existing SKU query |
| `node e2e/assessment-loading.browser.mjs` | PASS: held responses, tabs, empty/error/retry, reduced motion and seven widths |
| `node e2e/assessment-continuity.browser.mjs` | PASS: existing answer-save/exit continuity regression |
| `node e2e/app-shell.browser.mjs` | PASS: existing shell/navigation/end-action coverage at eight sizes |
| Manual browser interaction | Home notification dialog opened/closed; no overflow; axe WCAG A/AA tags returned zero violations on the populated home surface |
| Source/diff review | PASS: no old dot/spinner/animate-spin/animate-pulse/null-Suspense feedback remains in app source; only task-owned app files included |

Local, ignored artifacts: `.local/loading/manifest.json`, `lint-delta.json` and before/after screenshots (`bootstrap`, `settings-*`, `operation-ecg`, `async-action-ecg`, `image-*`, `appointments-refresh-error-retains-data`). The deterministic browser run records zero page exceptions and zero console warnings; 38 injected 503 responses are deliberate test stimuli.

## Limits and handoff

This is a loading-focused implementation with code inventory and representative controlled browser coverage, not a complete live audit of every role/action on all 70 routes. The full UX Audit verdict remains **Incomplete**: the complete skill interaction manifest/scenario battery and real-device/live gates were not run. Manual browser exploration separately exposed two Next CSS-preload warnings already observed during planning. LCP/interaction timing entries were unavailable in that browser session; performance certification is not claimed.

No remaining software blocker in this slice. Physical iOS/Android, live backend/payment-provider acceptance and broader F12-FE01 acceptance remain outside this delivery. No next task/batch selected; no push or deployment.
