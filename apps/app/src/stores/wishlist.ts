import { create } from "zustand";

type WishlistState = {
  ids: string[];
  toggleWishlist: (id: string) => void;
};

export const useWishlistStore = create<WishlistState>()((set) => ({
  ids: ["p2"],
  toggleWishlist: (id) =>
    set((s) => ({
      ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
    })),
}));
