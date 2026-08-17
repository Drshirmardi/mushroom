import {
  CalendarDays, ShoppingCart, X, Wallet,
  ClipboardList, AlertTriangle, MessageSquare, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NotifType =
  | "appointment" | "order" | "cancel" | "payment"
  | "assessment" | "stock" | "message";

export interface Notif {
  id: number;
  type: NotifType;
  text: string;
  time: string;
  read: boolean;
}

export const NOTIFS: Notif[] = [
  { id: 1, type: "appointment", text: "درخواست نوبت جدید از رضا کمالی", time: "۳۰ دقیقه پیش", read: false },
  { id: 2, type: "order", text: "سفارش جدید #ORD-۱۲۴۷ ثبت شد", time: "۱ ساعت پیش", read: false },
  { id: 3, type: "cancel", text: "امیر تهرانی نوبت خود را لغو کرد", time: "۲ ساعت پیش", read: false },
  { id: 4, type: "payment", text: "پرداخت ۷۳۰,۰۰۰ تومان توسط زهرا محمدی", time: "۳ ساعت پیش", read: true },
  { id: 5, type: "assessment", text: "ارزیابی درد مزمن توسط فاطمه کریمی تکمیل شد", time: "۵ ساعت پیش", read: true },
  { id: 6, type: "stock", text: "پچ حرارتی کمردرد — موجودی کم (۳ عدد)", time: "۶ ساعت پیش", read: true },
  { id: 7, type: "message", text: "علی رضایی پیام جدید فرستاد", time: "۷ ساعت پیش", read: true },
];

export const NOTIF_ICON_MAP: Record<string, { icon: LucideIcon; bg: string }> = {
  appointment: { icon: CalendarDays, bg: "bg-primary/10 text-primary" },
  order: { icon: ShoppingCart, bg: "bg-orange-100 text-orange-600" },
  cancel: { icon: X, bg: "bg-red-100 text-red-600" },
  payment: { icon: Wallet, bg: "bg-emerald-100 text-emerald-700" },
  assessment: { icon: ClipboardList, bg: "bg-violet-100 text-violet-600" },
  stock: { icon: AlertTriangle, bg: "bg-amber-100 text-amber-600" },
  message: { icon: MessageSquare, bg: "bg-teal-100 text-teal-700" },
};

export const NOTIF_ICON_FALLBACK: { icon: LucideIcon; bg: string } = {
  icon: Bell,
  bg: "bg-secondary text-muted-foreground",
};
