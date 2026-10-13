"use client";

import { AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { GlobalSheet } from "@/components/shared/global-sheet";
import { SplashScreen } from "@/components/shared/splash-screen";
import { useScreenNavigation } from "@/lib/navigation";
import { useUiStore } from "@/stores/ui";

/**
 * Phone-sized app shell shared by all migrated routes: fixed header,
 * scrollable content area, bottom tab bar, splash overlay and global sheet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStore = pathname === "/store" || pathname.startsWith("/store/products/") || pathname === "/store/cart" || pathname === "/store/wishlist";
  const splashSeen = useUiStore((s) => s.splashSeen);
  const markSplashSeen = useUiStore((s) => s.markSplashSeen);
  const navigateScreen = useScreenNavigation();

  return (
    <div className={`min-h-screen bg-[#e8ede8] flex items-center justify-center ${isStore ? "patient-store-shell" : ""}`}>
      <div className="relative w-full max-w-[720px] h-[100dvh] bg-background flex flex-col shadow-2xl overflow-hidden">
        <AnimatePresence>
          {!splashSeen && <SplashScreen onDone={markSplashSeen} />}
        </AnimatePresence>

        {/* Header */}
        <div className="patient-shell-header flex items-center justify-between px-5 pt-3 pb-1 bg-background flex-shrink-0">
          <div>
            {isStore ? <p className="text-xl font-bold text-foreground">دکتر شیرمردی</p> : <h1 className="text-xl font-bold text-foreground">دکتر شیرمردی</h1>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="اعلان‌ها" onClick={() => navigateScreen("NotificationCenter")} className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-border flex items-center justify-center relative">
              <Bell aria-hidden="true" size={20} className="text-foreground/70" />
              <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">{children}</div>

        <BottomTabBar />
        <GlobalSheet />
      </div>
    </div>
  );
}
