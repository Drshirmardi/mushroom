import type { AppNotification, Med } from "@/lib/types";

export const MEDS: Med[] = [
  { id: "m1", name: "کپسول زعفران طلایی", dose: "۱ عدد", time: "صبح ناشتا", duration: "۳۰ روز", taken: true, sideEffects: "خواب‌آلودگی در صورت مصرف زیاد.", notes: "با معده خالی مصرف شود." },
  { id: "m2", name: "قطره گیاهی آرامش", dose: "۲۰ قطره", time: "شب قبل خواب", duration: "۳۰ روز", taken: false, sideEffects: "موارد خاصی گزارش نشده.", notes: "در آب حل کنید." },
  { id: "m3", name: "پماد گیاهی ضدالتهاب", dose: "موضعی", time: "دو بار روزانه", duration: "۲۱ روز", taken: false, sideEffects: "سوزش موضعی خفیف ممکن است.", notes: "روی ناحیه دردناک بمالید." },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n1", title: "نسخه به‌روزرسانی شد", desc: "دکتر شیرمردی نسخه شما را ویرایش کرد.", time: "۱۰ دقیقه پیش", type: "prescription", read: false },
  { id: "n2", title: "یادآوری مصرف دارو", desc: "وقت مصرف قطره گیاهی آرامش است.", time: "۳۰ دقیقه پیش", type: "medication", read: false },
  { id: "n3", title: "نوبت فردا", desc: "فردا ساعت ۱۰:۰۰ ویزیت حضوری دارید.", time: "۲ ساعت پیش", type: "appointment", read: true },
  { id: "n4", title: "مقاله جدید", desc: "فواید طب سنتی در کاهش درد مزمن", time: "دیروز", type: "article", read: true },
  { id: "n5", title: "سفارش ارسال شد", desc: "سفارش شماره ۱۰۰۲۴ از انبار خارج شد.", time: "دیروز", type: "order", read: true },
];
