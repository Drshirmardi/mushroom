import type {
  AdminProductContent,
  ProductContentFields,
  ProductContentProvenance,
  ProductContentSourceKind,
  ProductContentStatus,
} from "../../lib/commerce-product-content-api";

export type ContentFieldKey =
  | "brand"
  | "manufacturer"
  | "shortDescription"
  | "description"
  | "ingredients"
  | "usageInstructions"
  | "warnings"
  | "contraindications";

export type ContentSectionId = "general" | "descriptions" | "ingredients" | "warnings" | "source";

export type ContentFieldDef = {
  key: ContentFieldKey;
  label: string;
  maxLength: number;
  multiline: boolean;
  section: ContentSectionId;
  help: string;
};

export const CONTENT_FIELD_DEFS: ContentFieldDef[] = [
  { key: "brand", label: "برند", maxLength: 240, multiline: false, section: "general", help: "نام برند طبق منبع؛ هیچ تأییدیه‌ای را القا نمی‌کند." },
  { key: "manufacturer", label: "تولیدکننده", maxLength: 240, multiline: false, section: "general", help: "نام تولیدکننده طبق منبع." },
  { key: "shortDescription", label: "توضیح کوتاه", maxLength: 500, multiline: false, section: "descriptions", help: "یک خط برای کارت و فهرست." },
  { key: "description", label: "توضیح کامل", maxLength: 5000, multiline: true, section: "descriptions", help: "متن قدیمی محصول همین‌جاست؛ با اولین ویرایش وارد چرخه مدیریت می‌شود." },
  { key: "ingredients", label: "ترکیبات / مواد", maxLength: 5000, multiline: true, section: "ingredients", help: "فقط وقتی کاربرد دارد." },
  { key: "usageInstructions", label: "دستور مصرف", maxLength: 5000, multiline: true, section: "ingredients", help: "دستور مصرف مصوب؛ توصیه پزشکی شخصی نیست." },
  { key: "warnings", label: "هشدارها", maxLength: 5000, multiline: true, section: "warnings", help: "هشدارهای مستند به منبع." },
  { key: "contraindications", label: "موارد منع مصرف", maxLength: 5000, multiline: true, section: "warnings", help: "موارد منع مستند به منبع." },
];

export const CONTENT_SECTIONS: { id: ContentSectionId; title: string }[] = [
  { id: "general", title: "الف — اطلاعات عمومی محصول" },
  { id: "descriptions", title: "ب — توضیحات" },
  { id: "ingredients", title: "ج — ترکیبات و مصرف" },
  { id: "warnings", title: "د — هشدارها و منع مصرف" },
  { id: "source", title: "هـ — منبع محتوا و تأیید" },
];

export const SOURCE_KIND_OPTIONS: { value: ProductContentSourceKind; label: string }[] = [
  { value: "MANUFACTURER_DOCUMENT", label: "سند تولیدکننده" },
  { value: "PACKAGING", label: "بسته‌بندی" },
  { value: "SUPPLIER_DOCUMENT", label: "سند تأمین‌کننده" },
  { value: "OTHER_DOCUMENT", label: "سند دیگر" },
];

export const CONTENT_STATUS_LABEL: Record<ProductContentStatus, string> = {
  LEGACY_UNREVIEWED: "بررسی‌نشده (قدیمی)",
  PENDING_APPROVAL: "در انتظار تأیید",
  APPROVED: "تأییدشده",
};

export type ContentDraft = Record<ContentFieldKey, string> & {
  sourceKind: "" | ProductContentSourceKind;
  sourceReference: string;
};

export function emptyContentDraft(): ContentDraft {
  return {
    brand: "",
    manufacturer: "",
    shortDescription: "",
    description: "",
    ingredients: "",
    usageInstructions: "",
    warnings: "",
    contraindications: "",
    sourceKind: "",
    sourceReference: "",
  };
}

const textOrEmpty = (value: string | null | undefined): string => (typeof value === "string" ? value : "");

export function contentDraftFromServer(content: AdminProductContent): ContentDraft {
  return {
    brand: textOrEmpty(content.brand),
    manufacturer: textOrEmpty(content.manufacturer),
    shortDescription: textOrEmpty(content.shortDescription),
    description: textOrEmpty(content.description),
    ingredients: textOrEmpty(content.ingredients),
    usageInstructions: textOrEmpty(content.usageInstructions),
    warnings: textOrEmpty(content.warnings),
    contraindications: textOrEmpty(content.contraindications),
    sourceKind: content.provenance?.sourceKind ?? "",
    sourceReference: textOrEmpty(content.provenance?.sourceReference),
  };
}

/** Whitespace-only text is explicitly null, never an ambiguous empty value. */
const cleanText = (value: string): string | null => (value.trim() === "" ? null : value);

export function draftProvenance(draft: ContentDraft): ProductContentProvenance | null {
  if (draft.sourceKind === "" || draft.sourceReference.trim() === "") return null;
  return { sourceKind: draft.sourceKind, sourceReference: draft.sourceReference.trim() };
}

export function isContentDirty(draft: ContentDraft, baseline: ContentDraft): boolean {
  return (Object.keys(baseline) as (keyof ContentDraft)[]).some((key) => {
    if (key === "sourceKind") return draft.sourceKind !== baseline.sourceKind;
    if (key === "sourceReference") return draft.sourceReference.trim() !== baseline.sourceReference.trim();
    return draft[key].trim() !== (baseline[key] as string).trim();
  });
}

/** PATCH body: all eight fields (null clears), provenance pair-or-null. Omission is never used. */
export function contentPatchBody(draft: ContentDraft): {
  fields: ProductContentFields;
  provenance: ProductContentProvenance | null;
} {
  return {
    fields: {
      brand: cleanText(draft.brand),
      manufacturer: cleanText(draft.manufacturer),
      shortDescription: cleanText(draft.shortDescription),
      description: cleanText(draft.description),
      ingredients: cleanText(draft.ingredients),
      usageInstructions: cleanText(draft.usageInstructions),
      warnings: cleanText(draft.warnings),
      contraindications: cleanText(draft.contraindications),
    },
    provenance: draftProvenance(draft),
  };
}

/** Client-side provenance completeness (server remains authoritative). */
export function provenanceError(draft: ContentDraft): string | null {
  const kind = draft.sourceKind !== "";
  const reference = draft.sourceReference.trim() !== "";
  if (kind && !reference) return "برای ثبت منبع، مرجع منبع را هم بنویسید.";
  if (!kind && reference) return "برای ثبت مرجع، نوع منبع را هم انتخاب کنید.";
  return null;
}

export function hasAnyContent(draft: ContentDraft): boolean {
  return (
    (["brand", "manufacturer", "shortDescription", "description", "ingredients", "usageInstructions", "warnings", "contraindications"] as const).some(
      (key) => draft[key].trim() !== "",
    ) || draftProvenance(draft) !== null
  );
}

/** Approval needs a clean, saved revision; never while edits are unsaved or a save runs. */
export function canApproveContent(status: ProductContentStatus, dirty: boolean, busy: boolean, draft: ContentDraft): boolean {
  return status !== "APPROVED" && !dirty && !busy && hasAnyContent(draft);
}

export function contentVisibilityNote(status: ProductContentStatus): string {
  if (status === "APPROVED") return "محتوای تأییدشده برای مشتریان نمایش داده می‌شود.";
  if (status === "PENDING_APPROVAL") return "پیش‌نویس عمومی نیست؛ تا تأیید صریح، مشتری نسخه تأییدشده (یا هیچ) را می‌بیند.";
  return "توضیحات قدیمی بدون ادعای تأیید نمایش داده می‌شود؛ با اولین ویرایش، محتوای عمومی تا تأیید پنهان می‌ماند.";
}
