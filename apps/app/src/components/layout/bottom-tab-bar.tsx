"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toP } from "@/lib/format";
import { screenToHref, TAB_ROOT_SCREENS } from "@/lib/navigation";
import { cartCount, useCartStore } from "@/stores/cart";
import type { TabId } from "@/lib/types";

type Glyph = "home" | "bag" | "person";

type TabItem = {
  tab: TabId;
  label: string;
  glyph: Glyph;
  href: string;
  /** Hidden from the dock until its screen is re-enabled; routes stay intact. */
  hidden?: boolean;
};

const TAB_ITEMS: TabItem[] = [
  { tab: "home", label: "خانه", glyph: "home", href: "/" },
  { tab: "assessment", label: "ارزیابی", glyph: "home", href: "/assessment", hidden: true },
  { tab: "treatment", label: "درمان من", glyph: "home", href: "/treatment", hidden: true },
  { tab: "storemain", label: "فروشگاه", glyph: "bag", href: "/store" },
  { tab: "profile", label: "پروفایل", glyph: "person", href: "/profile" },
];

function NavGlyph({ name, active }: { name: Glyph; active: boolean }) {
  return (
    <span className="patient-shell-nav__glyph" aria-hidden="true">
      <i className={`icon-${name}-${active ? "bold" : "linear"}`} />
    </span>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const storePrefetched = useRef(false);
  const [pending, setPending] = useState<{ from: string; href: string } | null>(null);
  if (pending && pending.from !== pathname) setPending(null);
  const prefetchStore = () => {
    if (storePrefetched.current) return;
    storePrefetched.current = true;
    void router.prefetch("/store");
  };
  const pendingHref = pending?.from === pathname ? pending.href : null;
  const cart = useCartStore((s) => s.items);
  const count = cartCount(cart);
  const visible = TAB_ITEMS.filter((item) => !item.hidden);

  return (
    <nav aria-label="ناوبری اصلی" className="patient-shell-nav relative shrink-0 z-20">
      <div className="patient-shell-nav__dock">
        {visible.map((item) => {
          const root = TAB_ROOT_SCREENS[item.tab];
          const href = screenToHref(root) ?? "/";
          const routeActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const isActive = pendingHref != null ? item.href === pendingHref : routeActive;
          const arm = () => {
            if (!routeActive) setPending({ from: pathname, href: item.href });
          };
          return (
            <Link
              key={item.label}
              href={href}
              prefetch={item.href === "/store" ? false : undefined}
              onPointerDown={() => {
                if (item.href === "/store") prefetchStore();
                arm();
              }}
              onClick={arm}
              onFocus={item.href === "/store" ? prefetchStore : undefined}
              aria-current={isActive ? "page" : undefined}
              className="patient-shell-nav__item"
            >
              {item.tab === "storemain" && count > 0 && (
                <span className="patient-shell-nav__badge">{toP(count)}</span>
              )}
              <NavGlyph name={item.glyph} active={isActive} />
              <span className="patient-shell-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
