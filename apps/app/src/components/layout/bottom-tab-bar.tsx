"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ClipboardList,
  Heart,
  Home,
  ShoppingBag,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toP } from "@/lib/format";
import { screenToHref, TAB_ROOT_SCREENS } from "@/lib/navigation";
import { cartCount, useCartStore } from "@/stores/cart";
import type { TabId } from "@/lib/types";

type TabItem = {
  tab: TabId;
  label: string;
  icon: LucideIcon;
  /** Real route once the tab root is migrated. */
  href: string;
};

const TAB_ITEMS: TabItem[] = [
  { tab: "home", label: "خانه", icon: Home, href: "/" },
  { tab: "assessment", label: "ارزیابی", icon: ClipboardList, href: "/assessment" },
  { tab: "treatment", label: "درمان من", icon: Heart, href: "/treatment" },
  { tab: "storemain", label: "فروشگاه", icon: ShoppingBag, href: "/store" },
  { tab: "profile", label: "پروفایل", icon: User, href: "/profile" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const cart = useCartStore((s) => s.items);
  const count = cartCount(cart);

  return (
    <nav aria-label="ناوبری اصلی" className="patient-shell-nav absolute bottom-0 left-0 right-0 bg-white border-t border-border z-20">
      <div className="flex items-end justify-around px-1 pt-2 pb-4">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const root = TAB_ROOT_SCREENS[item.tab];
          const href = screenToHref(root) ?? "/";
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center gap-1 min-w-[52px] relative"
            >
              {isActive && (reducedMotion ? <div className="absolute -top-2 w-8 h-1 bg-primary rounded-full" /> : <motion.div layoutId="nav-indicator" className="absolute -top-2 w-8 h-1 bg-primary rounded-full" />)}
              {item.tab === "home" && count > 0 && (
                <span className="absolute -top-1 right-1 w-4 h-4 bg-primary rounded-full text-[8px] text-white font-bold flex items-center justify-center">{toP(count)}</span>
              )}
              <Icon aria-hidden="true" size={22} className={isActive ? "text-primary" : "text-muted-foreground"} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
