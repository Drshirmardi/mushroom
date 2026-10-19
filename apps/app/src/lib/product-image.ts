import type { components } from "@sabz-zendegi/api-client";

import { apiBaseUrl } from "./api";

export type ProductImageMeta = components["schemas"]["ProductImageDto"] | null | undefined;

/**
 * Neutral local placeholder (no remote assets, no Digikala/test URLs).
 * Rendered through the same <img> path so sizing, aspect boxes and layout
 * never shift between real and missing images.
 */
export const PRODUCT_IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Crect width='320' height='320' fill='white'/%3E%3Cg fill='none' stroke='%23858D93' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='124' y='124' width='72' height='72' rx='8'/%3E%3Ccircle cx='147' cy='146' r='7'/%3E%3Cpath d='m125 179 20-20 18 18 12-12 20 20'/%3E%3C/g%3E%3C/svg%3E";

/**
 * Resolve the frozen-contract contentPath (e.g. `/v1/commerce/products/<id>/images/<imageId>`)
 * against the configured API origin. Returns null when the product carries no image.
 * Never constructs R2/object URLs and never exposes storage credentials.
 */
export function productImageUrl(product: { id: string; image?: ProductImageMeta } | null | undefined): string | null {
  const path = product?.image?.contentPath;
  if (typeof path !== "string" || path.trim() === "") return null;
  const clean = path.trim();
  if (/^https?:\/\//iu.test(clean)) return clean;
  return `${apiBaseUrl}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

/** Persian metadata alt text when present, otherwise the caller-provided title. */
export function productImageAlt(image: ProductImageMeta, fallbackTitle: string): string {
  const alt = typeof image?.altText === "string" ? image.altText.trim() : "";
  return alt.length > 0 ? alt : fallbackTitle;
}
