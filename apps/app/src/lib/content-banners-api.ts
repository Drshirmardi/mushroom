import { withRequestTimeout } from "@sabz-zendegi/api-client";

import { apiClient, apiBaseUrl } from "./api";
import { PATIENT_CATALOG_TTL_MS, patientCacheKey, patientCachedData } from "./patient-request";

export type StoreBanner = import("@sabz-zendegi/api-client").components["schemas"]["PublicBannerDto"];

export const storeBannersCacheKey = () => patientCacheKey("public", "store-banners");

export async function listStoreBanners(): Promise<StoreBanner[]> {
  try {
    return await patientCachedData(storeBannersCacheKey(), PATIENT_CATALOG_TTL_MS, async () => {
      const result = await withRequestTimeout(apiClient.GET("/v1/content/banners", { cache: "no-store", signal: AbortSignal.timeout(10000) }));
      if (result.response.ok && result.data) return result.data.items;
      throw new Error("STORE_BANNERS_UNAVAILABLE");
    });
  } catch {
    // Banners are optional marketing content; never block the store on them.
    return [];
  }
}

export function storeBannerImageUrl(banner: StoreBanner): string | null {
  const path = `/v1/content/banners/${encodeURIComponent(banner.id)}/image`;
  return banner.contentPath === path ? new URL(path, apiBaseUrl).toString() : null;
}

export function safeBannerHref(value?: string | null): string | null {
  if (!value || /[\\\s\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const base = "https://banner.invalid"; const url = new URL(value, base);
    if (value.startsWith("/") && !value.startsWith("//") && url.origin === base) return value;
    return /^https?:\/\//iu.test(value) && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? value : null;
  } catch { return null; }
}
