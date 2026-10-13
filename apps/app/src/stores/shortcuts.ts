/**
 * TEST DATA — shortcut icons hotlinked from the Digikala CDN for UI testing only.
 * Labels and targets below are OURS (internal screens); only the icon artwork is
 * borrowed. When the backend exposes shortcuts, replace this list via the same
 * shape ({ id, image, label, target }); no API contract change is involved.
 * `target: "catalog"` opens the in-page catalog; anything else is a screen name.
 */
export type StoreShortcut = {
  id: string;
  image: string;
  label: string;
  target: string;
};

export const TEST_SHORTCUTS: StoreShortcut[] = [
  { id: "shop", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/adebec16b689d713eb4a4e9b9e3473a92b39134f_1790155115.png", label: "فروشگاه", target: "catalog" },
  { id: "book", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/d66e60056aa3aef7648b73a51dfad05f00d4364b_1790864775.png", label: "رزرو نوبت", target: "BookStep1" },
  { id: "magazine", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/326f30e8e54d9ebb9ee57932d3d41de4907aed11_1791640382.png", label: "مجله سلامت", target: "ArticlesList" },
  { id: "assess", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/d4a6781389012df550da96d11faa35a558a16ff9_1775996740.png", label: "ارزیابی سلامت", target: "AssessmentHub" },
  { id: "cart", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/bcfb2f367141fb0e3db4e1a3def0bb987513e678_1769854388.png", label: "سبد خرید", target: "CartScreen" },
  { id: "wishlist", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/18a7e3a7b52cbf0b63f535e82f619a25291dfd60_1791815363.jpg", label: "علاقه‌مندی‌ها", target: "WishlistScreen" },
  { id: "tracking", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/43cb30ad38f35cf3fd2716d0ed5df1e9975376b4_1791272087.png", label: "پیگیری سفارش", target: "OrderTracking" },
  { id: "notifs", image: "https://dkstatics-public.digikala.com/digikala-bellatrix/a01229372571d1005f6ffc06bed6488775dcf11b_1791289021.jpg", label: "اعلان‌ها", target: "NotificationCenter" },
];
