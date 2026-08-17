import type { MezajType } from "@/lib/types";

export const MEZAJ_TYPES: MezajType[] = [
  { id: "safravi", name: "صفراوی", emoji: "🔥", color: "bg-orange-50 border-orange-200 text-orange-800", badge: "bg-orange-500", desc: "گرم و خشک · انرژی بالا · تصمیم‌گیری سریع" },
  { id: "balgami", name: "بلغمی", emoji: "💧", color: "bg-blue-50 border-blue-200 text-blue-800", badge: "bg-blue-500", desc: "سرد و تر · آرام · حافظه قوی" },
  { id: "damavi", name: "دموی", emoji: "🌸", color: "bg-rose-50 border-rose-200 text-rose-800", badge: "bg-rose-500", desc: "گرم و تر · شاداب · اجتماعی" },
  { id: "sodavi", name: "سوداوی", emoji: "🌍", color: "bg-slate-50 border-slate-200 text-slate-800", badge: "bg-slate-600", desc: "سرد و خشک · دقیق · فکور" },
];

export const DEFAULT_MEZAJ = "sodavi";
