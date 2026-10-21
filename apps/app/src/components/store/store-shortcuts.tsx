"use client";

import Link from "next/link";
import { Grid2X2, Package, Wallet } from "lucide-react";

export function StoreShortcuts() {
  return <nav className="store-quick-links" aria-label="دسترسی‌های فروشگاه">
    <Link href="/store?view=all"><Grid2X2 size={17} strokeWidth={1.5} aria-hidden="true" />همهٔ محصولات</Link>
    <Link href="/store/orders"><Package size={17} strokeWidth={1.5} aria-hidden="true" />سفارش‌های من</Link>
    <Link href="/profile/wallet"><Wallet size={17} strokeWidth={1.5} aria-hidden="true" />کیف پول</Link>
  </nav>;
}
