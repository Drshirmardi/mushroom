# ADR-0016 — Store Product Details V1

- Status: ACCEPTED (architecture and governance only; implementation NOT_STARTED)
- Date: 2026-10-14
- Decision makers: Product owner (explicit Product Details V1 approval in the Store chat), Codex /root
- Phase/tasks: Phase 12 scoped extension; F12-PD-G01, F12-PD-B1A, F12-PD-B1B, F12-PD-B1C, F12-PD-B2
- Supersedes: none. ADR-0009 and ADR-0015 retain their accepted historical scope.

## Context

The independent review at front@ee0a21c found real Product/SKU pricing, inventory, media and checkout,
but no structured product content or variant attributes. The customer PDP selects skus[0] and consumes
demo specifications, seller verification, warranties, reviews and Q&A. Putting volume only on Product
would contradict different-volume SKUs. Existing order lines snapshot SKU code and product title,
not SKU title or meaningful variant attributes.

The owner explicitly accepted the revised architecture and authorized documentation, ADR/contract
freezing and implementation planning only. Initial category definitions remain undecided.

## Decision

1. Keep shared optional editorial fields on CommerceProduct: brand, manufacturer, shortDescription,
   existing description, ingredients, usageInstructions, warnings and contraindications. Separate
   health/editorial text from generic attributes; do not infer facts, certificates or claims.
2. Use explicit, revision-bound administrative content approval. Existing ADMIN release-role gate,
   COMMERCE_MANAGE and clinic/resource ownership all apply. No new role, unrestricted approver,
   automatic approval, clinical approval claim or mandatory second-approver workflow is introduced.
3. Preserve migration-existing descriptions and product publication as LEGACY_UNREVIEWED, without
   approval badges. Actual controlled-field/provenance edits move content into the managed approval
   lifecycle. Pending managed content is not public; product/media/purchasing visibility remains
   governed by existing catalog rules. Exact compatibility and visibility are frozen in the contract.
4. B2 uses relational, database-backed category template versions containing a bounded, validated
   definition document, and validated JSONB value maps on Product and SKU. Code owns the small type
   and unit registry; admins configure templates through existing Commerce administration.
5. Published template versions are immutable. Products pin exact versions; each field has one scope.
   A variant-defining field is SKU-owned. No free-form EAV, arbitrary schema/script, automatic variant
   generator, filtering engine, or automatic category migration is included.
6. Manual SKU creation and existing pricing/inventory authority continue. Before differentiated
   multi-SKU purchase is enabled, B2 must snapshot selected SKU title and meaningful variant values
   immutably, prove historical compatibility and preserve server-priced checkout/idempotency rules.
   This targeted B2 extension is not permission to alter checkout during B1.
7. Hide/remove unsupported PDP and cart demo claims in B1C. This is authorized retirement of excluded
   mock features, not a requirement to build UGC, marketplace seller or warranty backends.
8. All migrations are additive. B1A -> B1B -> B1C -> B2 are sequential, independently claimed, tested,
   reviewed, evidenced and committed under existing Phase 12 governance. Backend/dashboard slice
   acceptance does not declare the full feature delivered. No implementation starts in G01.

Authoritative contract: [store-product-details-v1](../contracts/store-product-details-v1.md).
Task checklist/ownership: [Phase 12](../phases/12-PRODUCTION-HARDENING.md#product-details-v1--approved-governance-and-planned-batches-2026-10-14).

## Alternatives Considered

- Product-only attributes: rejected; cannot represent SKU-specific volumes and selected prices.
- Unconstrained key/value rows: rejected; typing, units, scope and definitions remain ungoverned EAV.
- All templates in application code: rejected for current database-managed categories; routine
  administrative template changes would otherwise require deployments.
- Fully relational definition/value tables: deferred; additional joins and value machinery are not
  justified for V1 display/edit needs. Revisit when approved attribute queries warrant it.
- Unvalidated JSONB or arbitrary JSON Schema: rejected; flexible storage must not mean arbitrary rules.
- New marketplace, review, warranty, campaign or medical approval engines: excluded.

## Consequences

### Positive

- Product/SKU identity remains aligned with existing inventory and purchasing.
- Approved public content has a precise administrative source and revision boundary.
- Database templates can evolve without silently changing existing products.
- Existing products, media and financial history survive the additive upgrade.

### Costs and trade-offs

- Server-side nested/domain validation and generated DTOs are required; IsObject alone is insufficient.
- Editing managed content temporarily hides its controlled public fields until explicit reapproval.
- Compatibility clients may still edit the legacy description shape, but cannot silently approve it.
- Initial category definitions and B2 API appendices must be owner-approved before B2 eligibility.

### Risks

- Raw Prisma serialization could leak pending content/provenance; public projection is centralized.
- Approval/edit races could approve a different revision; compare-and-set and atomic audit are required.
- Mutable live SKU data must never be used to reconstruct historical order variants.

## Implementation Impact

- Future owned surfaces: Commerce catalog/content validation, additive Prisma migrations, API DTOs,
  stable errors, generated OpenAPI/client, existing Dashboard Store editor and customer PDP/cart.
- B2 additionally owns category templates, SKU attributes/availability and the narrowly scoped order
  snapshot extension. B1 has no SKU/order/media/storage/payment contract changes.
- No additional service, database, runtime provider or dependency is required by this decision.
- Initial-release boundaries, closed Phase 09, ADR-0015 media contract and independent Phase 12
  backup/secrets/production gates remain intact. No deployment or real storage operation is authorized.

## Validation

Each planned batch has gates in Phase 12 and the contract: additive migration replay/upgrade,
revision/approval races, legacy compatibility, permission/ownership matrix, private/public projection,
OpenAPI drift/client generation, focused Dashboard/customer tests and scoped browser acceptance.
B2 must additionally demonstrate a selected-SKU -> cart -> checkout -> immutable order snapshot chain,
including catalog changes after ordering and old snapshot reads. These checks are planned, not run.

## Revisit Trigger

Revisit for approved attribute filtering requiring indexed queries, variant-specific safety content,
multi-language authored content, SKU media, automatic variant generation, delegated approvers or
historical-content retention requirements beyond revision/digest/audit evidence. These are not V1 scope.
