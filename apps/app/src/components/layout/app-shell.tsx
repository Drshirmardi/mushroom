"use client";

import { usePathname } from "next/navigation";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { GlobalSheet } from "@/components/shared/global-sheet";

/**
 * Phone-sized app shell shared by all migrated routes: fixed header,
 * scrollable content area, bottom tab bar and global sheet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isStore = pathname === "/store" || pathname.startsWith("/store/products/") || pathname === "/store/cart" || pathname === "/store/wishlist";

    return (
        <div className={`patient-app-shell min-h-screen flex items-center justify-center ${isStore ? "patient-store-shell" : ""}`}>
            <div className="relative w-full max-w-[720px] h-[100dvh] bg-background flex flex-col shadow-2xl overflow-hidden">
                {/* Screen content */}
                <div className="flex-1 overflow-y-auto pb-[calc(96px+env(safe-area-inset-bottom,0px))] scrollbar-hide">{children}</div>

                <BottomTabBar />
                <GlobalSheet />
            </div>
        </div>
    );
}
