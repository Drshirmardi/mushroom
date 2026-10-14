import { create } from "zustand";
export type CartItem = {
  id: string;
  skuId: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  /** Resolved API image URL snapshot; embedded metadata, never an extra request. */
  imageUrl?: string | null;
};

type CartState = {
  items: CartItem[];
  /** Ephemeral cache of the server-authoritative cart; never persisted locally. */
  replace: (items: CartItem[]) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  replace: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, c) => sum + c.price * c.qty, 0);

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, c) => sum + c.qty, 0);
