import { create } from "zustand";
import type { SheetState } from "@/lib/types";

type UiState = {
  sheet: SheetState;
  setSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
  splashSeen: boolean;
  markSplashSeen: () => void;
  onboardingSeen: boolean;
  completeOnboarding: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  sheet: null,
  setSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  splashSeen: false,
  markSplashSeen: () => set({ splashSeen: true }),
  onboardingSeen: false,
  completeOnboarding: () => set({ onboardingSeen: true }),
}));
