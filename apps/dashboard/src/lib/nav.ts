import {
  LayoutGrid, CalendarDays, Clock, Users, FileText,
  ClipboardList, Activity, ShoppingBag, ShoppingCart,
  Tag, TrendingUp, MessageSquare, Bell, Archive, Settings,
  Layout, ShieldCheck, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutGrid, group: "اصلی" },
  { href: "/appointments", label: "نوبت‌ها", icon: CalendarDays, group: "اصلی" },
  { href: "/calendar", label: "تقویم", icon: CalendarDays, group: "اصلی" },
  { href: "/queue", label: "صف انتظار", icon: Clock, group: "اصلی" },
  { href: "/patients", label: "بیماران", icon: Users, group: "بالینی" },
  { href: "/prescriptions", label: "نسخه بیماران", icon: FileText, group: "بالینی" },
  { href: "/assessments", label: "ارزیابی‌ها", icon: ClipboardList, group: "بالینی" },
  { href: "/health-tracking", label: "ردیابی سلامت", icon: Activity, group: "بالینی" },
  { href: "/store", label: "محصولات", icon: ShoppingBag, group: "فروشگاه" },
  { href: "/store-builder", label: "استور بیلدر", icon: Layout, group: "فروشگاه" },
  { href: "/store-crm", label: "CRM مشتریان", icon: Users, group: "فروشگاه" },
  { href: "/orders", label: "سفارش‌ها", icon: ShoppingCart, group: "فروشگاه" },
  { href: "/discounts", label: "کدهای تخفیف", icon: Tag, group: "فروشگاه" },
  { href: "/revenue", label: "درآمد و گزارشات", icon: TrendingUp, group: "مالی" },
  { href: "/billing", label: "کیف پول و صورتحساب", icon: Wallet, group: "مالی" },
  { href: "/messages", label: "پیام‌ها", icon: MessageSquare, group: "سیستم" },
  { href: "/notifications", label: "اعلان‌ها", icon: Bell, group: "سیستم" },
  { href: "/content", label: "مدیریت محتوا", icon: Archive, group: "سیستم" },
  { href: "/audit", label: "گزارش فعالیت‌ها", icon: ShieldCheck, group: "سیستم" },
  { href: "/settings", label: "تنظیمات", icon: Settings, group: "سیستم" },
];

export const NAV_GROUPS = [...new Set(NAV.map((n) => n.group))];
