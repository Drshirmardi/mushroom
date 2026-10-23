import { create } from "zustand";
import type { SheetState } from "@/lib/types";

type UiState = {
  sheet: SheetState;
  setSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
  onboardingSeen: boolean;
  completeOnboarding: () => void;
  /** Full-height route that hides the bottom navigation (e.g. an open chat room). */
  immersive: boolean;
  setImmersive: (immersive: boolean) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  sheet: null,
  setSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  onboardingSeen: false,
  completeOnboarding: () => set({ onboardingSeen: true }),
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
}));
