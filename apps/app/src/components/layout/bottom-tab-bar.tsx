"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
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
  href: string;
  /** Hidden from the dock until its screen is re-enabled; routes stay intact. */
  hidden?: boolean;
};

const TAB_ITEMS: TabItem[] = [
  { tab: "home", label: "خانه", icon: Home, href: "/" },
  { tab: "assessment", label: "ارزیابی", icon: ClipboardList, href: "/assessment", hidden: true },
  { tab: "treatment", label: "درمان من", icon: Heart, href: "/treatment", hidden: true },
  { tab: "storemain", label: "فروشگاه", icon: ShoppingBag, href: "/store" },
  { tab: "profile", label: "پروفایل", icon: User, href: "/profile" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const storePrefetched = useRef(false);
  const prefetchStore = () => {
    if (storePrefetched.current) return;
    storePrefetched.current = true;
    void router.prefetch("/store");
  };
  const cart = useCartStore((s) => s.items);
  const count = cartCount(cart);
  const visible = TAB_ITEMS.filter((item) => !item.hidden);

  return (
    <nav aria-label="ناوبری اصلی" className="patient-shell-nav relative shrink-0 z-20">
      <div className="patient-shell-nav__dock">
        {visible.map((item) => {
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
              prefetch={item.href === "/store" ? false : undefined}
              onPointerDown={item.href === "/store" ? prefetchStore : undefined}
              onFocus={item.href === "/store" ? prefetchStore : undefined}
              aria-current={isActive ? "page" : undefined}
              className="patient-shell-nav__item"
            >
              {isActive &&
                (reducedMotion ? (
                  <span className="patient-shell-nav__pill" aria-hidden="true" />
                ) : (
                  <motion.span
                    layoutId="nav-pill"
                    className="patient-shell-nav__pill"
                    aria-hidden="true"
                    transition={{ type: "spring", stiffness: 500, damping: 42 }}
                  />
                ))}
              {item.tab === "storemain" && count > 0 && (
                <span className="patient-shell-nav__badge">{toP(count)}</span>
              )}
              <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="patient-shell-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
