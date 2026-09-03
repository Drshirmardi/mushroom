import {
  LayoutGrid, CalendarDays, Clock, Users, FileText,
  ClipboardList, Activity, ShoppingBag, ShoppingCart,
  Tag, TrendingUp, MessageSquare, Bell, Zap, Archive, Settings,
  Layout, BarChart2, BookOpen, Volume2, Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
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
  { href: "/store-marketing", label: "آنالیز بازار", icon: BarChart2, group: "فروشگاه" },
  { href: "/orders", label: "سفارش‌ها", icon: ShoppingCart, badge: "۸", group: "فروشگاه" },
  { href: "/discounts", label: "کدهای تخفیف", icon: Tag, group: "فروشگاه" },
  { href: "/revenue", label: "درآمد و گزارشات", icon: TrendingUp, group: "مالی" },
  { href: "/messages", label: "پیام‌ها", icon: MessageSquare, badge: "۳", group: "سیستم" },
  { href: "/notifications", label: "اعلان‌ها", icon: Bell, badge: "۳", group: "سیستم" },
  { href: "/automation", label: "اتوماسیون", icon: Zap, group: "سیستم" },
  { href: "/content", label: "مدیریت محتوا", icon: Archive, group: "سیستم" },
  { href: "/settings", label: "تنظیمات", icon: Settings, group: "سیستم" },
  { href: "/bot-center", label: "مرکز ربات‌ها", icon: Cpu, badge: "۳", group: "هوش مصنوعی" },
  { href: "/bot-flows", label: "سازنده جریان", icon: Zap, group: "هوش مصنوعی" },
  { href: "/bot-assessment", label: "موتور ارزیابی", icon: ClipboardList, group: "هوش مصنوعی" },
  { href: "/bot-knowledge", label: "پایگاه دانش", icon: BookOpen, group: "هوش مصنوعی" },
  { href: "/bot-conversations", label: "مکالمات", icon: MessageSquare, badge: "۱۲", group: "هوش مصنوعی" },
  { href: "/bot-campaigns", label: "کمپین‌ها", icon: Volume2, group: "هوش مصنوعی" },
  { href: "/bot-analytics", label: "آنالیز ربات", icon: BarChart2, group: "هوش مصنوعی" },
];

export const NAV_GROUPS = [...new Set(NAV.map((n) => n.group))];
