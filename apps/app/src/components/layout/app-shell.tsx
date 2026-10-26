"use client";

import { usePathname } from "next/navigation";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { GlobalSheet } from "@/components/shared/global-sheet";
import { useUiStore } from "@/stores/ui";

/**
 * Phone-sized app shell shared by all migrated routes: fixed header,
 * scrollable content area, bottom tab bar and global sheet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const isStorefront = pathname === "/store";
    const isStore = pathname === "/store" || pathname.startsWith("/store/");
    const isProduct = pathname.startsWith("/store/products/");
    const immersive = useUiStore((state) => state.immersive);

    return (
        <div className={`patient-app-shell min-h-screen flex items-center justify-center ${isStore ? "patient-store-shell" : ""} ${isHome ? "patient-home-shell" : ""} ${isStorefront ? "patient-storefront-shell" : ""}`}>
            <div className="patient-app-frame relative w-full max-w-[720px] h-[100dvh] bg-background flex flex-col shadow-2xl overflow-hidden">
                {/* Screen content */}
                <div className={`flex-1 scrollbar-hide ${immersive ? "min-h-0 overflow-hidden" : "overflow-y-auto pb-[calc(96px+env(safe-area-inset-bottom,0px))]"}`}>{children}</div>

                {!isProduct && !immersive && <BottomTabBar />}
                <GlobalSheet />
            </div>
        </div>
    );
}
