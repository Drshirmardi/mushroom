import { create } from "zustand";
import type { CartItem, Product } from "@/lib/types";

type CartState = {
  items: CartItem[];
  /** setState-style setter kept for compatibility with legacy screens. */
  setItems: (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const INITIAL_ITEMS: CartItem[] = [
  { id: "p1", name: "روغن ماساژ لاوندر", price: 185000, qty: 1, img: "photo-1608571423902-eed4a5ad8108", doctorRec: true },
  { id: "p3", name: "مکمل زنجبیل و زردچوبه", price: 145000, qty: 1, img: "photo-1584308666744-24d5c474f2ae", doctorRec: true },
];

export const useCartStore = create<CartState>()((set) => ({
  items: INITIAL_ITEMS,
  setItems: (updater) =>
    set((s) => ({ items: typeof updater === "function" ? updater(s.items) : updater })),
  addItem: (product) =>
    set((s) => {
      const existing = s.items.find((c) => c.id === product.id);
      if (existing) {
        return {
          items: s.items.map((c) =>
            c.id === product.id ? { ...c, qty: c.qty + 1 } : c
          ),
        };
      }
      return {
        items: [
          ...s.items,
          { id: product.id, name: product.name, price: product.price, qty: 1, img: product.img, doctorRec: product.doctor },
        ],
      };
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((c) => c.id !== id) })),
  setQty: (id, qty) =>
    set((s) => ({
      items: s.items.map((c) => (c.id === id ? { ...c, qty: Math.max(0, qty) } : c)),
    })),
  clear: () => set({ items: [] }),
}));

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, c) => sum + c.price * c.qty, 0);

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, c) => sum + c.qty, 0);
