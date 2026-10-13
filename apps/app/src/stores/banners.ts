import { create } from "zustand";

export type BannerSlide = {
  id: string;
  image: string;
  alt: string;
};

/**
 * TEST DATA — hero banners hotlinked from the Digikala CDN for UI testing only.
 * Do not treat these as catalog content. When the backend exposes banners,
 * populate the store via `setSlides` instead of editing this list; no API
 * contract change is involved.
 */
const TEST_SLIDES: BannerSlide[] = [
  { id: "dk-0", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/6a6089998cf47a8ce054db1c0870915419c51326_1791377946.gif?x-oss-process=image", alt: "بنر فروشگاه ۱" },
  { id: "dk-1", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/abfb2e4e262d8496c93f871b4ebf3349d62ec1cf_1791655271.png?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۲" },
  { id: "dk-2", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/6e396ecc42a1ec9b4b2c4e66f415178229c20e23_1791709818.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۳" },
  { id: "dk-3", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/9374dabd233d10f531439d0d8747c461535c8eba_1791374004.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۴" },
  { id: "dk-4", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/97d0d0c5374d576b47bf15007bb9cf6d8599d647_1791134363.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۵" },
  { id: "dk-5", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/f9e24d42dd4f08c49707a3c41f1a70779de0fe14_1791058216.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۶" },
  { id: "dk-6", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/609cf511c8ac70d5161d7f1c518a7f369cbe0543_1791365161.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۷" },
  { id: "dk-7", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/df291fefd341f20881f5ff512135e1e681c6c71f_1791616930.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۸" },
  { id: "dk-8", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/e45d7acbf038e11ca84e2d3984effcfa905241a8_1791373966.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۹" },
  { id: "dk-9", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/fdba60120e365a2cdf3969339cf64103a1e992ad_1791613338.gif?x-oss-process=image", alt: "بنر فروشگاه ۱۰" },
  { id: "dk-10", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/8df9155f6aa558cd2893c62a7516efd8dfc3ee4d_1791365608.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۱۱" },
  { id: "dk-11", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/68c6a336afe81ef13d650124915311c95728a556_1791279430.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۱۲" },
  { id: "dk-12", image: "https://dkstatics-public.digikala.com/digikala-adservice-banners/7b4f5e7b320f6517bea042e1391706c920a0ca15_1791734996.jpg?x-oss-process=image/quality,q_95", alt: "بنر فروشگاه ۱۳" },
];

type BannerState = {
  slides: BannerSlide[];
  /** Future API wiring point: replace test slides with server-provided banners. */
  setSlides: (slides: BannerSlide[]) => void;
};

export const useBannerStore = create<BannerState>()((set) => ({
  slides: TEST_SLIDES,
  setSlides: (slides) => set({ slides }),
}));
