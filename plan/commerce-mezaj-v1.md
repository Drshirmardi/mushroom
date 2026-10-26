# Ordered Mezaj product collections v1

Owner request: 2026-10-20; F12-FE01 / CLIENT-INTEGRATION, sole `/root` writer. Add a real store linkage for all sixteen primary/secondary combinations. This extends commerce configuration and presentation, not clinical scoring or prescriptions.

## Contract

- Canonical codes: `damavi` (دموی), `safravi` (صفراوی), `balgami` (بلغمی), `sodavi` (سوداوی).
- Ordered Cartesian product: 4×4=16, including repeated codes. `damavi/safravi` and `safravi/damavi` have independent products, sources, enablement and revisions.
- Each clinic/pair has zero or one stored collection. The admin matrix always returns all sixteen, with revision0/disabled/empty for unconfigured pairs. No clinical assignments or products are seeded.
- A collection holds up to20 distinct actual products in explicit order and up to50 distinct exact questionnaire-version/result-band links. One version/band can belong to only one collection. Multiple versions/bands may map to one pair.
- Only published/retired `MEZAJ` sources in the same clinic are accepted. Store the source content hash; never infer primary/secondary from a result title, answer, score, label substring or product category.
- Enabling requires at least one source and one active product with an active category and SKU. Reads recheck product visibility; changing prices/statuses never needs copying a catalog snapshot into configuration.
- Compound foreign keys enforce clinic consistency for source versions and products. Database checks constrain four codes, positions0–19 and positive revisions. Clinic-wide transaction advisory lock plus expectedRevision prevents lost edits or competing band reassignment. Configuration writes are audited.

## Endpoints

- `GET /v1/admin/commerce/mezaj/collections`: sixteen bounded collection summaries, source display metadata and product id/title only. ADMIN + COMMERCE_MANAGE.
- `GET /v1/admin/commerce/mezaj/assessment-versions?page=1`: paginated20 source versions, with result-band id/title. No questionnaire answers, scoring weights or patient data.
- `PUT /v1/admin/commerce/mezaj/collections/{primary}/{secondary}`: `{expectedRevision,enabled,productIds,sources:[{assessmentVersionId,resultBandId}]}`. Initial revision precondition0; subsequent edits use the returned revision. A409 preserves the editor draft and requires explicit reload/reconciliation.
- `GET /v1/patients/me/commerce/recommendations`: PATIENT + COMMERCE_READ_SELF + ASSESSMENTS_READ_SELF. `{status,primary,secondary,items}`; private/no-store. No patient identifier accepted as a selection input.

## Patient selection

1. Resolve the authenticated patient's active clinic.
2. Select the latest accessible, completed, non-invalidated MEZAJ result in that clinic. Result, submission and version must agree. Reuse `assessment_submission_access_allowed`, including paid/withdrawn processing access. Select persisted provenance with private answers/score removed at the SQL boundary.
3. Reuse `assessmentResultProvenance`: exact source hash, engine identity, answer payload hash and result band must match. A review-required/unsupported/latest-unmapped result never falls back to an older recommendation.
4. Resolve the exact version/band assignment and enabled collection, verify the configured source hash, and project only currently public products via the existing catalog projection, in configured order.
5. Record a clinical READ audit with status only; do not log result labels, pair codes, answers or scores in its metadata.

Statuses: READY, NO_RESULT, RESULT_UNSUPPORTED, REVIEW_REQUIRED, NOT_CONFIGURED, NO_PRODUCTS. Non-ready responses have no product matches. Unavailable transport is an actual error with retry, distinct from an empty/configuration state.

## Interfaces and operation

Dashboard → Store → «پیشنهاد بر اساس مزاج»: choose a matrix cell; add exact source version/result links; search/page active products; choose/reorder/remove membership; explicitly enable and save. For an assessment update, map the new version's exact bands rather than reusing names. Remove an old band's link before assigning it to a different pair. Retired versions remain selectable for existing historical results.

App → Store: authenticated personal products appear before banners and general discovery. Display the ordered pair and link to the user's result. Keep the general catalog accessible. Missing result links to assessment; review/configuration/empty/error states do not invent a match. Search/all-products views remain the public catalog.

Migration: `20261020010000_commerce_mezaj_collections`; additive tables/index only. The local development DB had only this migration pending; applied after isolated PostgreSQL/constraint/type verification. No existing catalog content, clinical result, real patient, wallet or order was modified, and no real product-to-Mezaj assignments were invented.

## Verification

- `pnpm --filter @sabz-zendegi/api test:commerce-mezaj`: disposable local PostgreSQL only, guard-marked/generated database, apply all74 migrations, verify additive upgrade preserves seeded legacy products,27 new API tests +1 public-catalog regression, then Prisma schema diff.28/28 PASS; no drift. Synthetic records are discarded with that test database.
- API source/test TypeScript PASS. Generated OpenAPI/client freshness/build and5 client tests PASS. App176/176 and dashboard152/152 existing tests PASS.
- `pnpm exec playwright test -c apps/app/e2e/playwright.store-mezaj.config.ts --reporter=line`:6/6 PASS, desktop/mobile; ordered pair/reverse distinction, personal section before general catalog, empty/review/503/retry,16-cell dashboard, exact source/product save payload, conflict/draft preservation/reload and no page overflow/page errors. All API calls intercepted in these browser fixtures; no real commerce commands.
- Early fixture corrections: required authentication.phone was omitted; Playwright's exact label-text selector included nested option text, so use the actual named combobox. The existing one-published-version/lifecycle constraints were respected in source-version test fixtures. No runtime bypass was introduced for these test failures.
- Production build app46/dashboard32 pages PASS;14 broader store/browser regressions PASS. Final editor refinements passed targeted ESLint/types and2 desktop/mobile save/conflict/edge-cell navigation cases. Parent config reload and query/page-bound responses avoid synchronous effect state resets, preserve drafts across token refresh and hide stale product/version pages. Source lookups use two bounded batch reads, not per-band database queries. Graph/diff gate recorded in Phase12 log.

F12-FE01 remains unchecked: full product/provider/two-account/clinical/legal release acceptance is separate. This contract establishes configuration capability, not clinical suitability of any particular product.
