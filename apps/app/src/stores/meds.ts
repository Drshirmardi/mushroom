import { create } from "zustand";
import { MEDS } from "@/lib/data/catalog";
import type { Med } from "@/lib/types";

type MedsState = {
  meds: Med[];
  markMed: (id: string) => void;
};

export const useMedsStore = create<MedsState>()((set) => ({
  meds: MEDS,
  markMed: (id) =>
    set((s) => ({
      meds: s.meds.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)),
    })),
}));
