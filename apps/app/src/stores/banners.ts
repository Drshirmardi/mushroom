import { create } from "zustand";

export type BannerSlide = {
  id: string;
  image: string;
  alt: string;
  /** Optional destination; null/undefined falls back to opening the catalog. */
  href?: string | null;
};

type BannerState = {
  slides: BannerSlide[];
  setSlides: (slides: BannerSlide[]) => void;
};

export const useBannerStore = create<BannerState>()((set) => ({
  slides: [],
  setSlides: (slides) => set({ slides }),
}));
