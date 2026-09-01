import type { AppNotification, Med, Product } from "@/lib/types";

export const PRODUCTS: Product[] = [
  { id: "p1", name: "روغن ماساژ لاوندر", price: 185000, rating: 4.8, reviews: 124, img: "photo-1608571423902-eed4a5ad8108", doctor: true, cat: "روغن‌ها", desc: "روغن گیاهی ۱۰۰٪ طبیعی با عصاره لاوندر فرانسوی" },
  { id: "p2", name: "دمنوش آرامش‌بخش", price: 95000, rating: 4.6, reviews: 89, img: "photo-1563459802257-2a97df940f11", doctor: false, cat: "گیاهی", desc: "ترکیب بابونه، بادرنجبویه و اسطوخودوس" },
  { id: "p3", name: "مکمل زنجبیل و زردچوبه", price: 145000, rating: 4.9, reviews: 201, img: "photo-1584308666744-24d5c474f2ae", doctor: true, cat: "مکمل‌ها", desc: "ضدالتهاب قوی با ترکیب زنجبیل و کورکومین" },
  { id: "p4", name: "کرم گیاهی ضدالتهاب", price: 120000, rating: 4.7, reviews: 67, img: "photo-1556228578-8c89e6adf883", doctor: false, cat: "گیاهی", desc: "کرم موضعی با عصاره آرنیکا و اکالیپتوس" },
  { id: "p5", name: "قرص ویتامین D3", price: 98000, rating: 4.5, reviews: 312, img: "photo-1584308666744-24d5c474f2ae", doctor: true, cat: "مکمل‌ها", desc: "ویتامین D3 2000 واحد - ۶۰ عدد" },
  { id: "p6", name: "دستگاه طب فشاری", price: 480000, rating: 4.4, reviews: 45, img: "photo-1576091160399-112ba8d25d1d", doctor: false, cat: "تجهیزات", desc: "دستگاه ماساژ نقاط طب فشاری خانگی" },
];

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
