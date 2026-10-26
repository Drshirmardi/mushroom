# Store Product Details V1 — version 1.0

Date: 2026-10-14. Authority: explicit Product Details V1 owner approval and
[ADR-0016](../decisions/ADR-0016-store-product-details-v1.md).

Status: FROZEN_FOR_FUTURE_IMPLEMENTATION for B1 content, authorization, visibility and compatibility;
B2 architecture/order integrity gates accepted, concrete category definitions and B2 wire appendix
PENDING_OWNER_DECISION. This freeze is documentation only, not an implementation/start/deployment grant.
Any change to a frozen rule requires an explicit versioned addendum and the normal review gate.

Baselines: backend 44d472e, Dashboard media e49e615, local R2 acceptance e80573c, customer images ee0a21c.
No original Commerce/media contract is rewritten. The B2 snapshot extension below is limited future
change control; it is inactive until its appendix, eligibility, implementation and acceptance pass.

## 1. Scope, ownership and exclusions

- B1: shared optional CommerceProduct content, provenance, revision/approval, admin editor, honest PDP.
- B2: category templates, Product/SKU typed attributes, manual variant selection, availability and
  immutable selected-SKU order snapshots.
- Price/tax remain integer TOMAN. Checkout remains server-priced, owned and idempotent; inventory
  reservations/ledger remain authoritative. Availability is a read-time hint, not a stock reservation.
- Keep one Product image and its existing endpoints, nullable metadata, ETag/idempotency, no-store
  delivery, private R2, cleanup and default-disabled configuration unchanged.
- No UGC, seller marketplace, warranty/campaign engine, arbitrary EAV/schema/script, generated
  variants, rich-text engine, new role, medical module, production activation or database operation.

## 2. B1 fields and limits

All content values are optional, nullable plain text on CommerceProduct:

| Field | Maximum characters | Meaning |
| --- | --- | --- |
| brand | 240 | Source-supported brand name; no implied verification/certification |
| manufacturer | 240 | Source-supported manufacturer name |
| shortDescription | 500 | Brief product description |
| description | 5,000 | Existing full-description field; do not rename or rewrite legacy data |
| ingredients | 5,000 | Ingredients/materials when applicable |
| usageInstructions | 5,000 | Approved product-use instructions, not personalized medical advice |
| warnings | 5,000 | Source-supported warnings when applicable |
| contraindications | 5,000 | Source-supported contraindications when applicable |

Reject unknown members and wrong types. Managed writes use NFKC and edge trimming while preserving
paragraph breaks; whitespace-only text must be explicitly null, not an ambiguous empty value. Length
checks apply after normalization. Bound the content request to 128 KiB UTF-8; reject excess with 413.
Render as escaped plain text, never HTML. No automatic translation, diagnosis or claim generation.
Migration does not normalize existing values. Product title/slug/category/status and media are not
B1 approval-controlled fields; no data is moved out of their accepted ownership.

## 3. Provenance, revisions and approval

Product metadata additions (exact database columns finalized in B1A within these invariants):

- contentRevision: nonnegative integer; migration-existing rows start at 0.
- legacyContent: true only for migration-existing untouched content. New products start false.
- sourceKind: nullable enum MANUFACTURER_DOCUMENT, PACKAGING, SUPPLIER_DOCUMENT, OTHER_DOCUMENT.
- sourceReference: nullable plain text, max 1,000 characters; nonempty sourceKind/reference required
  for approval of nonempty content. It must identify the checked source; it is not automatically fetched
  or uploaded and must contain no secrets/patient data. Clearing provenance invalidates approval.
- approvedContentRevision, contentApprovedAt (UTC), contentApprovedByUserId: nullable, server-owned.
- A canonical content digest covering all eight controlled fields and provenance is computed server-side.
  Approval audit retains revision/digest/actor/time; edits retain previous/new revision/digest and changed
  field names, not full texts. This is not a full historical-content archive or certification system.

Derived administrative status:

- LEGACY_UNREVIEWED: legacyContent=true, contentRevision=0, approval tuple absent.
- PENDING_APPROVAL: managed content without approval of the current revision.
- APPROVED: approvedContentRevision equals contentRevision and approver/time are present.

New product creation with nonempty content starts revision 1/PENDING_APPROVAL; empty new content starts
revision 0/PENDING_APPROVAL and cannot be approved until nonempty, source-supported content exists.
No migration auto-approves legacy content. No return to LEGACY_UNREVIEWED after a managed edit.

Every material controlled-field/provenance change increments contentRevision atomically, clears the
approval tuple and sets legacyContent=false. A normalized no-op does not increment or invalidate.
This includes existing create/PATCH description paths: they must call the same content policy, not
bypass it. Price, inventory and image edits alone do not invalidate B1 content approval.

Approval is a separate explicit server-authorized action on expectedContentRevision. Client-supplied
approver, timestamps, approval status, digest or approved revision are rejected. An authenticated user
must have the existing ADMIN release role AND COMMERCE_MANAGE AND access to the product's active clinic.
The same authorized administrator may edit and approve; separation of duties is not required in V1.
Administrative approval means source review, never clinical efficacy or certification.

Save, approval invalidation and audit share one transaction. Approval compares/locks the same revision
and commits metadata/audit atomically. A racing edit cannot inherit approval. Repeating approval of the
already-approved expected revision returns the current state without a duplicate effective approval;
an older expected revision conflicts. No idempotency/media header contract is repurposed for content.

## 4. Public visibility and legacy compatibility

Existing Product/category/clinic/SKU eligibility remains unchanged. Content approval does not activate
or archive a Product, alter price, reserve inventory, or grant image access.

| Content state | Customer existing description | New public editorial fields |
| --- | --- | --- |
| LEGACY_UNREVIEWED | Existing value unchanged | Absent/null; no approval or verification claim |
| PENDING_APPROVAL | null | Absent/null; draft must not leak |
| APPROVED | Current approved description, possibly null | Current approved values only |

Migration leaves every existing description/status intact and publicly projects the old description
as legacy, not approved. A later explicit content edit moves that product to managed/pending state;
the editor must warn that controlled public content will be hidden until explicit approval. Product
itself, legitimate title/pricing/media and unrelated Store functionality remain available under their
existing rules. No last-approved-content archive/fallback is promised by this minimal V1 model.

All public projections, including catalog/detail/cart/wishlist, use this policy for description and
new editorial fields. Never spread the Prisma record. Source references, approval actor IDs, draft
values and internal audit data are admin-only. Legacy text is not copied into structured medical fields.

## 5. B1 API and generated-client contract

Existing paths, base response fields, IDs, pagination and nullable description/image remain compatible.
All new members are optional/additive to existing DTOs. New strict content endpoints:

| Endpoint | Request | Result |
| --- | --- | --- |
| GET /v1/admin/commerce/products/{productId}/content | Authorized UUID product | 200 draft fields, provenance, contentRevision, derived status and approval metadata |
| PATCH same path | expectedContentRevision plus fields and/or provenance | 200 current admin content; material edit invalidates approval |
| POST same path + /approve | expectedContentRevision only | 200 approval bound to that revision |

PATCH fields is a bounded object with the eight optional values above. Omission means unchanged;
null explicitly clears an optional value. provenance is either null (clear) or the complete
sourceKind/sourceReference pair (replace). Empty patch is 422; empty/wrong-shaped values are 400/422
as below. expectedContentRevision is required, nonnegative and equal to current revision.

Existing admin product read responses gain optional content metadata. Existing product creation
accepts optional content (fields/provenance); legacy top-level description remains accepted. Supplying
description in both locations is rejected, not silently prioritized. Creation never implicitly approves.
Existing product PATCH can accept an optional content update using the strict expected revision;
simultaneous top-level/nested description is rejected. Legacy description-only PATCH retains its
existing request shape, but participates in revision/invalidation/audit. Without an expected revision,
old clients cannot detect a previously stale form; new Dashboard editors must use the strict endpoint.
Atomic revision handling still prevents these compatibility writes from preserving stale approval.

The public detail response gains nullable content containing the approved revision and all approved
editorial fields; no separate content/provenance/template fetch is required. Public list, cart and
wishlist may gain nullable brand/shortDescription only, with the same projection; do not embed long
warnings in every card. Admin DTOs deliberately include draft content; public DTOs never do.
Do not promise verified brand/manufacturer badges merely from an APPROVED state.

Generated OpenAPI/client must describe nullability, nested validation, response shapes and every error.
Relevant proposed stable content codes (registered, documented and tested in B1A):

| HTTP | Code/behavior |
| --- | --- |
| 400 | BAD_REQUEST via existing validation envelope; malformed/unknown members |
| 401/403 | UNAUTHORIZED / FORBIDDEN from existing authentication/permission checks |
| 404 | COMMERCE_PRODUCT_NOT_FOUND for absent/out-of-scope product |
| 409 | COMMERCE_CONTENT_REVISION_CONFLICT; return safe current revision, never draft/public leakage |
| 413 | PAYLOAD_TOO_LARGE, no raw body |
| 422 | COMMERCE_CONTENT_INVALID or COMMERCE_CONTENT_SOURCE_REQUIRED; safe field names only |

Common-envelope names match the existing registry; preserve them rather than invent replacements.
Approval of empty content is COMMERCE_CONTENT_INVALID.
No raw content, source reference, database exception or health text appears in operational errors/logs.

## 6. B2 template and attribute invariants (definitions pending)

Relational template identity/version rows belong to a clinic/category, with unique category/version
and bounded definition JSONB. A category's selected published version and each product's pinned
version must belong to that same category/clinic. Foreign keys/checks and transactional validation
protect identity; referenced published versions cannot be deleted. Published rows are immutable;
changes produce a new version. Selecting it as the category default does not repin existing products.

System-owned finite field types: TEXT, INTEGER, DECIMAL, BOOLEAN, ENUM. Units come from a finite
dimension-aware system registry; none of its category assignments are approved yet. Decimal values
use canonical decimal strings, not localized text/floating money. Field definitions contain stable key,
Persian label, scope PRODUCT/SKU, type, optional allowed unit/options/bounds, required flag, display
order and variantDefining flag. variantDefining implies SKU scope. A key cannot exist at both scopes.
No arbitrary regex, JSON Schema, script, expression or embedded health/safety document.

Product/SKU store validated JSONB value maps. Requests use bounded typed key/value entries so duplicate
keys can be rejected before conversion to a map. Unknown, duplicate, wrong-scope/type/unit/option keys
are rejected. Sort order and labels come from the pinned template, not uncontrolled stored values.
Category/repin changes validate Product and all SKU values in one transaction; incompatibility is 422,
not silent key deletion or automatic medical conversion. Drafts may be incomplete; public variant
enablement requires the owner-approved completeness/publication rules. Health-related fields may not
escape approval by being classified as attributes; B2 definitions must explicitly settle this mapping.

No concrete category, medical requirement, unit assignment or required key is seeded by this contract.
No attribute search/index/filter engine is included. Query indexes require actual approved query evidence.
The B2 appendix must freeze payload bounds, key/value DTOs, template lifecycle/version concurrency,
category transitions, health-attribute approval linkage and chosen template definitions before claim.

## 7. B2 variant/order compatibility acceptance gate

Manual differentiated SKU selection binds selected attributes, SKU title/code, price, availability,
wishlist and cart to one skuId. One-SKU products do not get an unnecessary selector. Availability
uses active catalog/SKU eligibility and onHandQuantity-reservedQuantity; missing inventory is unavailable.
Only the existing checkout/reservation transaction can confirm a purchase; catalog hints do not reserve.

Before enabling this customer flow, a frozen B2 wire/migration appendix must define additive nullable
order-line snapshots for selected SKU title and meaningful variant attributes. Snapshot entries must
carry canonical key/type/value/unit and contemporaneous display label plus template identity/version;
the owner-approved template determines which attributes are meaningful. Snapshot values are produced
server-side from the chosen SKU in the existing order/reservation transaction, not accepted from clients.

Order snapshot payload versioning must explicitly distinguish old version 1 and the new form; new
digests are computed at creation, existing payloads/hashes are not rewritten. New customer/admin order
response members are optional/nullable; old orders use stored skuCode/productTitle and never fabricate
missing volume/title by joining the current catalog. Snapshot readers must continue reading old orders,
including orders whose SKU was renamed/archived/deleted. Variant identity attributes of a SKU already
used by an order/reservation cannot be repurposed; create a new SKU for a different identity.

Required B2 evidence: chosen volume -> chosen price -> cart skuId -> stock reservation -> immutable
SKU-title/variant snapshot; later edits do not mutate receipts; old/new orders and previous application
compatibility; rollback/upgrade; idempotent checkout replay; stock insufficiency/races. No differentiated
multi-SKU purchase is enabled until all these gates pass. B1 never changes checkout/snapshot code.

## 8. UI integrity, acceptance and execution boundary

B1B uses the existing Dashboard product editor/components/session/error conventions, Persian RTL and
accessible fields. Save and explicit approve are distinct actions; show revision/status/source and the
public-visibility consequence, preserve form data on failure and refresh conflict state deliberately.
B1C embeds real approved content in the PDP, omits null sections and retires demo ratings/counts,
reviews/Q&A, fictional seller verification/satisfaction/warranties and hardcoded specifications.
Remove corresponding fake seller claims in cart, preserve product images and unrelated Store behavior.
Do not build the excluded backends or remove legitimate static assets, banners/offers or unrelated UI.

B1A requires isolated PostgreSQL migration replay/upgrade, legacy preservation, permissions/ownership,
approval/no-op/null/clear/provenance cases, edit/approval races, strict/compatibility writes, public
projection on every affected endpoint, error registry and OpenAPI/client consistency. B1B requires
focused editor/session/conflict/RTL tests; B1C requires real/mock fixture-based approved/pending/legacy
rendering and Store regressions, including image fallback. Browser/migration/test execution happens
only after a separately started eligible implementation task, never during this documentation run.

Tasks/owned paths/gates are in the existing [Phase 12 checklist](../phases/12-PRODUCTION-HARDENING.md#product-details-v1--approved-governance-and-planned-batches-2026-10-14).
One agent; no subagents. Each batch needs its own eligibility, normal claim, evidence, review and task
commit; stop before the next unless separately instructed. Full V1 is not delivered by B1A or B1B alone.
B2 remains blocked on explicit owner template decisions and its contract appendix. Independent frozen
initial-release and production gates remain unchanged. No implementation batch is claimed in G01.
