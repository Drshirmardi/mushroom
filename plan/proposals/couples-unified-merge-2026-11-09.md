# Couples unified test — integration review (2026-11-09)

Final integration branch: `codex/couples-unified-final` → Draft PR #47 → `dev`.

## Base retained from PR #45
- Canonical entry `/assessment/couples?start=<publication UUID>`, including strict validation and login/profile-return handling.
- Paid `MARRIAGE` offering guard for new invitations; legacy FREE and pre-existing grants remain accessible via historical routes.
- `CouplesHome` component separation and the unified invitation detail / educational workspace.
- Read-only SQL audit, grandfathered legacy educational routes, privacy/consent/payment safeguards, and original browser/unit regression tests.

## Changes selected from PR #46
- Dedicated `classifyCoupleRequests` and actor-specific status labels with associated unit tests.
- Improved invitation cards: incoming inviter context, masked recipient phone, creation date, link status, responsive card styling.
- Home dashboard service labels, journey activity labels, pending action copy and payment-result return CTA.
- Wording improvements for invitation form and educational couple experience.
- Align browser assertions for payment return and request polling with the current visible text.

## Intentionally not overwritten from PR #46
- Alternate `?newTestId=` routing (would split canonical URL validation and login return state).
- Alternative single-file couples page and duplicate invitation history code (keep PR #45's separated component).
- The `MarriageOffers` non-paid filtering from PR #46 (PR #45 has strict `MARRIAGE/PAID` guard).
- Legacy educational redirect and result page behavior from PR #45 (prevents regressions of old stored sessions).
- Separate user-level consent/payment logic, API contracts and DB schema (none changed).

## Review before merge
- [ ] CI `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- [ ] Browser tests including `couples-unified.browser.mjs` executed explicitly (not inferred from CI smoke)
- [ ] Real 2-account Dev flow: link → login/registration → profile → accept → independent consent → payment → result
- [ ] Inspect real Dev DB inventory using existing read-only SQL before removing any legacy route
- [ ] Verify pagination across incoming and historical requests: current first-page overview displays the matching entries on that page; full list can be paginated from history
- [ ] Preserve backend authority for eligibility, payments, separate grants, independent consents and partner privacy

Only merge PR #47 into `dev` after these checks. Prefer **Squash and Merge** for a single rollback commit. Do not separately merge #45 or #46.
