import { describe, expect, it } from "vitest";

import type { AdminProductContent } from "../../lib/commerce-product-content-api";
import {
  canApproveContent,
  contentDraftFromServer,
  contentPatchBody,
  contentVisibilityNote,
  draftProvenance,
  emptyContentDraft,
  hasAnyContent,
  isContentDirty,
  provenanceError,
} from "./product-content-draft";

const server: AdminProductContent = {
  brand: "برند",
  manufacturer: null,
  shortDescription: null,
  description: "توضیح قدیمی",
  ingredients: null,
  usageInstructions: null,
  warnings: null,
  contraindications: null,
  contentRevision: 2,
  status: "PENDING_APPROVAL",
  provenance: null,
  approvedContentRevision: null,
  contentApprovedAt: null,
  contentApprovedByUserId: null,
};

describe("product content draft rules", () => {
  it("maps server nulls to editable empty strings and back to explicit nulls", () => {
    const draft = contentDraftFromServer(server);
    expect(draft.manufacturer).toBe("");
    expect(draft.description).toBe("توضیح قدیمی");
    const body = contentPatchBody({ ...emptyContentDraft(), brand: "  برند  " });
    expect(body.fields.brand).toBe("  برند  ");
    expect(body.fields.manufacturer).toBeNull();
    expect(body.provenance).toBeNull();
  });

  it("treats whitespace-only edits as unchanged and detects real changes", () => {
    const baseline = contentDraftFromServer(server);
    expect(isContentDirty({ ...baseline, brand: "برند " }, baseline)).toBe(false);
    expect(isContentDirty({ ...baseline, brand: "برند تازه" }, baseline)).toBe(true);
    expect(isContentDirty({ ...baseline, sourceReference: "x" }, baseline)).toBe(true);
  });

  it("requires the complete provenance pair and never a half pair", () => {
    expect(provenanceError({ ...emptyContentDraft(), sourceKind: "PACKAGING", sourceReference: "" })).toContain("مرجع");
    expect(provenanceError({ ...emptyContentDraft(), sourceKind: "", sourceReference: "x" })).toContain("نوع");
    expect(provenanceError(emptyContentDraft())).toBeNull();
    expect(draftProvenance({ ...emptyContentDraft(), sourceKind: "PACKAGING", sourceReference: "  بسته  " })).toEqual({
      sourceKind: "PACKAGING",
      sourceReference: "بسته",
    });
  });

  it("allows approval only for clean saved revisions with content", () => {
    expect(canApproveContent("PENDING_APPROVAL", false, false, { ...emptyContentDraft(), brand: "x" })).toBe(true);
    expect(canApproveContent("APPROVED", false, false, { ...emptyContentDraft(), brand: "x" })).toBe(false);
    expect(canApproveContent("PENDING_APPROVAL", true, false, { ...emptyContentDraft(), brand: "x" })).toBe(false);
    expect(canApproveContent("PENDING_APPROVAL", false, true, { ...emptyContentDraft(), brand: "x" })).toBe(false);
    expect(canApproveContent("PENDING_APPROVAL", false, false, emptyContentDraft())).toBe(false);
    expect(hasAnyContent(emptyContentDraft())).toBe(false);
  });

  it("explains public visibility per status without approval claims", () => {
    expect(contentVisibilityNote("APPROVED")).toContain("نمایش داده می‌شود");
    expect(contentVisibilityNote("PENDING_APPROVAL")).toContain("عمومی نیست");
    expect(contentVisibilityNote("LEGACY_UNREVIEWED")).toContain("پنهان می‌ماند");
  });
});
