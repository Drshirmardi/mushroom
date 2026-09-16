import { create } from "zustand";

type WishlistState = {
  ids: string[];
  /** Ephemeral cache of server-authoritative wishlist SKU IDs. */
  replace: (ids: string[]) => void;
};

export const useWishlistStore = create<WishlistState>()((set) => ({
  ids: [],
  replace: (ids) => set({ ids }),
}));
