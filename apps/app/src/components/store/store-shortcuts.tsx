"use client";

import Link from "next/link";
import { StoreIcon } from "./store-icon";

export function StoreShortcuts() {
  return <nav className="store-quick-links" aria-label="دسترسی‌های فروشگاه">
    <Link href="/store?view=all"><StoreIcon name="shoppingBag" size={17} />همهٔ محصولات</Link>
    <Link href="/store/orders"><StoreIcon name="deliveryBox" size={17} />سفارش‌های من</Link>
    <Link href="/profile/wallet"><StoreIcon name="wallet" size={17} />کیف پول</Link>
  </nav>;
}
