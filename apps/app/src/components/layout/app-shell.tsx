"use client";

import { usePathname } from "next/navigation";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { GlobalSheet } from "@/components/shared/global-sheet";
import { useUiStore } from "@/stores/ui";

/**
 * Phone-sized app shell shared by all migrated routes: page headers,
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
        <div className={`patient-app-shell patient-viewport-shell flex justify-center ${isStore ? "patient-store-shell" : ""} ${isHome ? "patient-home-shell" : ""} ${isStorefront ? "patient-storefront-shell" : ""}`}>
            <div className="patient-app-frame relative w-full max-w-[720px] bg-background flex flex-col shadow-2xl overflow-hidden">
                {/* Screen content */}
                <div className={`patient-shell-content min-h-0 flex-1 scrollbar-hide ${immersive ? "overflow-hidden" : "overflow-y-auto"}`}>{children}</div>

                {!isProduct && !immersive && <BottomTabBar />}
                <GlobalSheet />
            </div>
        </div>
    );
}
