import type { Metadata } from "next";

export interface PageMeta {
  title: string;
  subtitle: string;
}

export const PAGE_META = {
  dashboard: { title: "داشبورد", subtitle: "خلاصه فعالیت‌های امروز کلینیک" },
  appointments: { title: "نوبت‌ها", subtitle: "مدیریت و پیگیری نوبت‌های ویزیت" },
  calendar: { title: "تقویم", subtitle: "برنامه زمانبندی ویزیت‌ها" },
  queue: { title: "صف انتظار", subtitle: "وضعیت لحظه‌ای صف بیماران" },
  patients: { title: "بیماران", subtitle: "فضای کاری بیمار — مدیریت کامل" },
  prescriptions: { title: "نسخه بیماران", subtitle: "نسخه‌نویسی، درمان، رژیم و ورزش" },
  assessments: { title: "ارزیابی‌ها", subtitle: "ساخت و بررسی پرسشنامه‌های بالینی" },
  programs: { title: "خدمات متنی مزاج", subtitle: "محتوا، مزاج‌های مرتبط و عرضهٔ خدمات آموزشی" },
  "health-tracking": { title: "ردیابی سلامت", subtitle: "پایش شاخص‌های سلامت از اپ موبایل" },
  store: { title: "مدیریت محصولات", subtitle: "فروشگاه، انبار و دسته‌بندی‌ها" },
  "store-builder": { title: "استور بیلدر", subtitle: "طراحی صفحه فروشگاه، بنرها و بخش‌ها" },
  "store-crm": { title: "CRM مشتریان", subtitle: "تحلیل و مدیریت مشتریان فروشگاه" },
  "store-marketing": { title: "آنالیز بازاریابی", subtitle: "ترافیک، تبدیل و عملکرد محصولات" },
  orders: { title: "سفارش‌ها", subtitle: "پیگیری و مدیریت سفارشات" },
  discounts: { title: "کدهای تخفیف", subtitle: "مدیریت کوپن‌ها و تخفیف‌ها" },
  revenue: { title: "درآمد و گزارشات", subtitle: "تحلیل مالی کلینیک" },
  billing: { title: "کیف پول و صورتحساب", subtitle: "کیف پول بیماران، پرداخت‌ها و تطبیق مالی" },
  messages: { title: "پیام‌ها", subtitle: "گفتگوی امن با بیماران" },
  notifications: { title: "اعلان‌ها", subtitle: "مرکز مدیریت اعلان‌های سیستم" },
  automation: { title: "اتوماسیون", subtitle: "جریان‌های کاری خودکار" },
  content: { title: "مدیریت محتوا", subtitle: "مقالات، ویدیوها، بنرها و FAQ" },
  audit: { title: "گزارش فعالیت‌ها", subtitle: "ردیابی عملیات ثبت‌شده در سامانه" },
  settings: { title: "تنظیمات", subtitle: "پیکربندی کلینیک و سیستم" },
  "bot-center": { title: "مرکز ربات‌های هوشمند", subtitle: "مدیریت ربات‌های تلگرام، بله و روبیکا" },
  "bot-flows": { title: "سازنده جریان ربات", subtitle: "طراحی بصری مکالمات خودکار" },
  "bot-assessment": { title: "موتور ارزیابی مزاج", subtitle: "پرسشنامه‌های طب سنتی ایرانی" },
  "bot-knowledge": { title: "پایگاه دانش هوش مصنوعی", subtitle: "مدیریت اسناد و منابع دانش" },
  "bot-conversations": { title: "مکالمات ربات‌ها", subtitle: "مانیتورینگ و مدیریت گفتگوها" },
  "bot-campaigns": { title: "کمپین‌های بازاریابی", subtitle: "ارسال هدفمند به کاربران ربات" },
  "bot-analytics": { title: "آنالیز ربات‌ها", subtitle: "آمار و تحلیل عملکرد ربات‌ها" },
} as const satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof PAGE_META;

/** metadata هر مسیر برای export در فایل‌های page.tsx */
export function pageMetadata(key: PageKey): Metadata {
  return { title: PAGE_META[key].title };
}

/** استخراج meta از pathname فعلی (برای هدر) */
export function metaForPathname(pathname: string): PageMeta {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return PAGE_META[segment as PageKey] ?? PAGE_META.dashboard;
}
