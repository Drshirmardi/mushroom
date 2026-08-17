import {
  ClipboardList, Stethoscope, FileText, ShoppingCart,
  Activity, Leaf, Dumbbell, Edit, CalendarDays,
  MessageSquare, Moon, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TimelineEvent {
  icon: LucideIcon;
  color: string;
  text: string;
  detail: string;
  date: string;
}

export interface ActivityItem {
  icon: LucideIcon;
  color: string;
  text: string;
  time: string;
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  { icon: ClipboardList, color: "bg-violet-100 text-violet-700", text: "ارزیابی درد مزمن تکمیل شد", detail: "امتیاز: ۷۲/۱۰۰", date: "۱۴۰۳/۰۴/۱۶ — ۱۱:۲۰" },
  { icon: Stethoscope, color: "bg-teal-100 text-teal-700", text: "جلسه طب سوزنی انجام شد", detail: "نقاط: BL23، KD3، GV4", date: "۱۴۰۳/۰۴/۱۵ — ۱۰:۰۰" },
  { icon: FileText, color: "bg-blue-100 text-blue-700", text: "نسخه به‌روزرسانی شد", detail: "اضافه: ویتامین D3", date: "۱۴۰۳/۰۴/۱۴ — ۱۲:۳۰" },
  { icon: ShoppingCart, color: "bg-orange-100 text-orange-700", text: "محصول خریداری شد", detail: "روغن طب سوزنی گیاهی", date: "۱۴۰۳/۰۴/۱۲ — ۱۵:۴۵" },
  { icon: Activity, color: "bg-red-100 text-red-700", text: "سطح درد ثبت شد", detail: "شدت درد: ۳/۱۰ (بهبود)", date: "۱۴۰۳/۰۴/۱۱ — ۰۹:۰۰" },
  { icon: Leaf, color: "bg-emerald-100 text-emerald-700", text: "رژیم غذایی به‌روزرسانی شد", detail: "کاهش گلوتن، افزایش امگا ۳", date: "۱۴۰۳/۰۴/۱۰ — ۱۱:۰۰" },
  { icon: Dumbbell, color: "bg-indigo-100 text-indigo-700", text: "برنامه ورزشی اضافه شد", detail: "حرکات کششی کمر — روزانه", date: "۱۴۰۳/۰۴/۰۸ — ۱۰:۳۰" },
  { icon: Edit, color: "bg-yellow-100 text-yellow-700", text: "یادداشت پزشک اضافه شد", detail: "پیشرفت خوب، ادامه پروتکل", date: "۱۴۰۳/۰۴/۰۷ — ۱۴:۰۰" },
];

export const ACTIVITY_FEED: ActivityItem[] = [
  { icon: ClipboardList, color: "bg-violet-100 text-violet-700", text: "فاطمه کریمی ارزیابی را تکمیل کرد", time: "۵ دقیقه پیش" },
  { icon: ShoppingCart, color: "bg-orange-100 text-orange-700", text: "پریسا نوری ۳ محصول سفارش داد", time: "۱۲ دقیقه پیش" },
  { icon: Activity, color: "bg-red-100 text-red-600", text: "علی رضایی سطح درد ۳ را ثبت کرد", time: "۲۰ دقیقه پیش" },
  { icon: CalendarDays, color: "bg-blue-100 text-blue-700", text: "رضا کمالی نوبت جدید رزرو کرد", time: "۳۵ دقیقه پیش" },
  { icon: MessageSquare, color: "bg-teal-100 text-teal-700", text: "زهرا محمدی پیام فرستاد", time: "۴۸ دقیقه پیش" },
  { icon: Moon, color: "bg-indigo-100 text-indigo-700", text: "مریم حسینی کیفیت خواب ۸ را ثبت کرد", time: "۱ ساعت پیش" },
  { icon: Heart, color: "bg-pink-100 text-pink-700", text: "حسین احمدی تمرین را کامل کرد", time: "۱.۵ ساعت پیش" },
  { icon: Leaf, color: "bg-emerald-100 text-emerald-700", text: "سارا ملکی رژیم امروز را دنبال کرد", time: "۲ ساعت پیش" },
];
