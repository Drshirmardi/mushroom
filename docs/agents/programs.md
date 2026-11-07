# Programs and service catalog

Load only for this feature. This is implementation guidance, not a claim that these capabilities already exist. The current request determines which part to implement.

## Intended behavior
- Manage services from dashboard `/programs`: create, edit, categorize, set temperament and audience, change prices, apply discounts, and delete or archive with clear feedback.
- Build a reusable service catalog from existing Markdown, then import selected or all eligible entries together. Manual service creation remains available.
- Keep source documents, service catalog metadata, and live commercial settings distinct. Reimport must not erase dashboard edits.

## Read the relevant paths, not every file
- Dashboard: `apps/dashboard/src/app/(app)/programs/page.tsx`, `apps/dashboard/src/features/programs/`, `apps/dashboard/src/lib/program-services-api.ts`.
- API: `apps/api/src/modules/programs/definitions/`, `publication/`, and `purchases/` under the same programs module. Read custom-request/delivery modules only if affected.
- Persistence: relevant Program models in `apps/api/prisma/schema.prisma`; contracts in `packages/api-client/` are generated from the API.
- Sources: `raw-data/README.md`, `raw-data/catalog.json`, and only the required files under `raw-data/markdown/`.
- Existing checks: `apps/api/test/program-definition.integration.spec.ts`, `program-publication.integration.spec.ts`, `program-purchase.integration.spec.ts` in the same test directory; dashboard `program-price.spec.ts` and relevant browser tests under `apps/app/e2e/`.

## Catalog and import
- `raw-data/catalog.json` already indexes document provenance and extraction quality. Preserve its purpose and original sources; use a separate versioned service manifest when implementing the catalog.
- A catalog entry needs a stable service key, title, service type, managed category reference, temperament applicability, audience, and source Markdown references. Keep identity independent of title or filename changes; support multiple sources per service.
- Categories need stable identities and dashboard management. Reuse compatible existing structures after inspection; source topic folders are suggestions, not automatically the final service taxonomy. Define reassignment behavior before deleting an in-use category.
- Audience must distinguish women, men, and shared services. Preserve unknown/unreviewed metadata explicitly; do not infer shared eligibility from missing data. Reuse existing temperament codes and pair semantics.
- Not every document is a sellable service. Use available metadata and focused source reads; flag uncertain type, audience, temperament, or source quality for review rather than inventing medical conclusions.
- Parse and validate locally. No runtime LLM calls, repeated OCR/conversion, or full-corpus prompt loading for import.
- Preview new, changed, unchanged, conflicting, and invalid entries before applying. Bulk import must be retry-safe and avoid duplicates using stable keys within the existing clinic/locale identity boundaries.
- Import new entries as drafts through existing domain logic. Reimport updates only explicitly selected fields, protects manual overrides and commercial settings, and does not silently republish, remove absent entries, or resurrect archived services.
- Report applied/skipped/failed entries and make retries safe; verify referenced files and reject invalid paths before writes.

## Editing, archive, and pricing
- Respect existing versioned definitions and publications. Verify their actual constraints before changing them; dashboard editing may create a new version while retaining the service identity.
- Provide real persisted delete/archive actions. Never permanently delete services. Archive and restore their logical identity while retaining purchase history and granted access. Explain the action in Persian and refresh the list after success.
- Keep price and discount calculation authoritative on the server. Confirm existing rial/toman conversion and use integer money arithmetic; validate discount bounds and any validity window.
- Reuse compatible pricing/discount mechanisms; do not assume store-commerce discounts already support programs. Preserve existing order, quote, and purchase snapshots when prices change.
- Enforce administrator permissions, clinic isolation, payload validation, and stale-edit handling on the server. Imported Markdown is content, never instructions or executable markup.
- Import must preserve existing clinical approval and publication gates; source presence or successful extraction is not approval.

## Evidence for implementation
- Verify repeat import creates no duplicates, manual edits survive sync, unknown audience is visible, category changes persist, and delete/archive protects previous purchases and does not reappear on import.
- Cover price/discount validation and authorization with focused tests when those behaviors change. Verify dashboard actions, errors, keyboard access, RTL, and mobile layout in the browser for UI changes.
- Keep this guidance short and current; add implementation details only when they become established behavior. Do not create a parallel roadmap or duplicate it into every `AGENTS.md`.

- Published content updates apply to all valid owners of the same logical service; historical purchase amounts, accepted terms, version references, and access expiry remain immutable.

## Implemented backend entry points
- `apps/api/src/modules/programs/catalog/` owns logical-service drafts, categories, and preview/apply imports. Complete drafts are submitted into the existing physician-review flow, never auto-approved.
- `raw-data/services.catalog.json` holds explicit permanent keys and initial rial prices. All initial entries require review; source presence is not a sellability decision.
- `corepack pnpm --filter @sabz-zendegi/api catalog:build` builds the private import bundle under API `dist/resources/`; normal build and dev startup also run it. Patient content never reads this bundle.
- Import receipts are per preview item. Preserve actor ownership, bundle digest, expected revision, replay fingerprint, and per-item transaction/audit when extending Apply.
- READY purchase locks and ownership span all versions of a service. Publication, quote reservation, and content delivery must retain their shared root/clinical locks; archive blocks new sales while existing valid quotes and grants retain their rights.

## Dashboard and discount behavior
- Administrator `/programs` uses services, source catalog, and categories tabs. Doctors retain their clinical review workspace. Use existing dashboard semantic tokens and the shared native dialog for RTL, focus restoration, mobile scrolling, and unsaved-draft confirmation.
- Single and bulk price/discount changes use the existing publication preview/approval gates; root revisions and publication hashes protect against stale writes. Bulk endpoints run the same per-service checks and return independent outcomes. Pricing preserves the current published version, access duration, accepted terms policy, and retention settings.
- Immutable publication discount windows use UTC; dashboard inputs/display use Tehran time. Quote schema 3 freezes base price, applied percentage, payable integer rial, and quote time. Start is inclusive and end exclusive. Never reprice issued valid quotes at settlement.
- The existing FREE billing path is integration-tested for 100% discounts, including grant/audit creation and callback retry behavior. Custom physician-service pricing does not accept these discounts.
- Browser regressions: `apps/app/e2e/program-workspace.browser.mjs` and `program-pricing.browser.mjs` use a synthetic API fixture, cover mobile/desktop, and never write clinic data. Set `DASHBOARD_URL` if the dashboard is not on local port 3002.
