import { create } from "zustand";
import type { SheetState } from "@/lib/types";

type UiState = {
  sheet: SheetState;
  setSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
  onboardingSeen: boolean;
  completeOnboarding: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  sheet: null,
  setSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  onboardingSeen: false,
  completeOnboarding: () => set({ onboardingSeen: true }),
}));
