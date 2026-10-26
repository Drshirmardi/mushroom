import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RecentProduct = {
  productId: string;
  skuId?: string;
  title: string;
  /** Unit price snapshot in toman at view time. */
  price: number | string;
  /** Resolved API image URL snapshot (string only; never binary). Absent for legacy entries. */
  imageUrl?: string | null;
  viewedAt: number;
};

type RecentState = {
  items: RecentProduct[];
  push: (item: Omit<RecentProduct, "viewedAt">) => void;
};

const MAX_ITEMS = 10;

/** Recently viewed products (device-local; a future API can replace this store). */
export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      push: (item) =>
        set((state) => ({
          items: [
            { ...item, viewedAt: Date.now() },
            ...state.items.filter((entry) => entry.productId !== item.productId),
          ].slice(0, MAX_ITEMS),
        })),
    }),
    { name: "sabz-recently-viewed" },
  ),
);
