import { create } from "zustand";

/**
 * TEST DATA — product images hotlinked from the Digikala CDN for UI testing only.
 * Each catalog product deterministically maps to one of these images by its id,
 * so no API change is needed for the test layout. When real product images land,
 * register them via `setImageOverride` (or a future API wiring); test URLs stay
 * untouched until then.
 */
const TEST_PRODUCT_IMAGES: string[] = [
  "https://dkstatics-public.digikala.com/digikala-products/b9ebae09430eb96a6b1285567325787a79f98611_1766703740.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/d1606783dc92b01ea5121bc6b48b6980bae1c607_1779269953.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/002fefd83c0b50e740b402af851009e1ea1d369f_1779269930.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/7dffdf4f2bac8e2f0db5f7aef47613f009c58dac_1779269769.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/95ae865fb18ce26d3958ac6da140e96e4c888cd7_1779269970.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/66731c860cd58435e9c2b9b41a5ebae595a90e4b_1744441198.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/087cb42e696ba534f03b047c00cde57ad4d14735_1779269953.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/00d17affda608abddc6c684e2939412b4e61eccf_1779269647.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/57bfcb8e3cf1a46f6bc8c2223f9a75a602890a38_1765789002.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/0ce820b6b4d7971b529a02450c752502955176d0_1742281667.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/588d5fdf86a5ffc54693c12195e31e05c28e3e20_1722929271.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/3f69e9fb568b0f87a7494b5a8c02aa5893e95bfd_1722928701.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
  "https://dkstatics-public.digikala.com/digikala-products/3406cfeaa63870d74973944d9c8730a0cb02d90c_1733910751.jpg?x-oss-process=image/resize,m_lfit,h_160,w_160/quality,q_80",
];

/** Stable hash for deterministic per-product picks. */
function hashId(productId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < productId.length; index++) {
    hash ^= productId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Stable test image for a product id (FNV-1a hash → image pool). */
export function productTestImage(productId: string): string {
  return TEST_PRODUCT_IMAGES[hashId(productId) % TEST_PRODUCT_IMAGES.length];
}

/** Deterministic distinct gallery images for layout testing (first entry matches the card image). */
export function productGalleryImages(productId: string, count = 3): string[] {
  const picked: string[] = [];
  const start = hashId(productId);
  for (let step = 0; picked.length < Math.max(1, count) && step < TEST_PRODUCT_IMAGES.length; step++) {
    const next = TEST_PRODUCT_IMAGES[(start + step * 5) % TEST_PRODUCT_IMAGES.length];
    if (!picked.includes(next)) picked.push(next);
  }
  return picked;
}

type ProductImageState = {
  /** Real image URLs by product id; take precedence over test images. */
  overrides: Record<string, string>;
  setImageOverride: (productId: string, image: string) => void;
  clearOverrides: () => void;
};

export const useProductImageStore = create<ProductImageState>()((set) => ({
  overrides: {},
  setImageOverride: (productId, image) =>
    set((state) => ({ overrides: { ...state.overrides, [productId]: image } })),
  clearOverrides: () => set({ overrides: {} }),
}));

/** Real override wins; otherwise the deterministic test image. */
export function resolveProductImage(productId: string, overrides: Record<string, string>): string {
  return overrides[productId] ?? productTestImage(productId);
}
