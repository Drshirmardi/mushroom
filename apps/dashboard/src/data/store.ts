export interface Product {
  id: number;
  name: string;
  cat: string;
  price: number;
  stock: number;
  status: string;
  img: string;
  featured: boolean;
  recommended: boolean;
}

export const PRODUCTS: Product[] = [
  { id: 1, name: "روغن طب سوزنی گیاهی", cat: "مکمل", price: 385000, stock: 24, status: "موجود", img: "🌿", featured: true, recommended: true },
  { id: 2, name: "پچ حرارتی کمردرد", cat: "تجهیزات", price: 120000, stock: 3, status: "رو به اتمام", img: "🩹", featured: false, recommended: true },
  { id: 3, name: "چای گیاهی تسکین درد", cat: "گیاهی", price: 95000, stock: 40, status: "موجود", img: "🍵", featured: true, recommended: false },
  { id: 4, name: "کپسول ضد التهاب طبیعی", cat: "مکمل", price: 245000, stock: 0, status: "ناموجود", img: "💊", featured: false, recommended: false },
  { id: 5, name: "بالشت گردن طبی", cat: "تجهیزات", price: 620000, stock: 8, status: "موجود", img: "🛏️", featured: false, recommended: true },
];

export interface Order {
  id: string;
  patient: string;
  date: string;
  total: number;
  status: string;
  items: number;
}

export const ORDERS: Order[] = [
  { id: "ORD-۱۲۴۷", patient: "زهرا محمدی", date: "۱۴۰۳/۰۴/۱۶", total: 730000, status: "ارسال شده", items: 2 },
  { id: "ORD-۱۲۴۶", patient: "علی رضایی", date: "۱۴۰۳/۰۴/۱۵", total: 480000, status: "در حال آماده‌سازی", items: 1 },
  { id: "ORD-۱۲۴۵", patient: "پریسا نوری", date: "۱۴۰۳/۰۴/۱۵", total: 1100000, status: "در انتظار پرداخت", items: 3 },
  { id: "ORD-۱۲۴۴", patient: "کاوه صادقی", date: "۱۴۰۳/۰۴/۱۴", total: 245000, status: "تحویل داده شده", items: 1 },
  { id: "ORD-۱۲۴۳", patient: "مریم حسینی", date: "۱۴۰۳/۰۴/۱۳", total: 385000, status: "لغو شده", items: 1 },
];

export interface Banner {
  id: number;
  title: string;
  desc: string;
  btn: string;
  img: string;
  active: boolean;
  order: number;
  start: string;
  end: string;
}

export const BANNERS: Banner[] = [
  { id: 1, title: "درمان طبیعی دردهای مفصلی", desc: "محصولات پیشنهادی بر اساس طب سنتی", btn: "مشاهده محصولات", img: "🌿", active: true, order: 1, start: "۱۴۰۳/۰۴/۰۱", end: "۱۴۰۳/۰۶/۳۱" },
  { id: 2, title: "تخفیف ویژه مکمل‌های گیاهی", desc: "تا ۳۰٪ تخفیف روی کلیه مکمل‌ها", btn: "خرید کنید", img: "💊", active: true, order: 2, start: "۱۴۰۳/۰۴/۱۵", end: "۱۴۰۳/۰۵/۱۵" },
  { id: 3, title: "تجهیزات طب سوزنی خانگی", desc: "ابزار استاندارد برای استفاده خانگی", btn: "آشنایی بیشتر", img: "🩺", active: false, order: 3, start: "۱۴۰۳/۰۵/۰۱", end: "۱۴۰۳/۰۷/۳۰" },
];

export interface CrmCustomer {
  name: string;
  avatar: string;
  type: string;
  orders: number;
  total: number;
  cat: string;
  last: string;
  status: string;
}

export const CRM_CUSTOMERS: CrmCustomer[] = [
  { name: "زهرا محمدی", avatar: "ز", type: "VIP", orders: 12, total: 8500000, cat: "مکمل", last: "۲ روز پیش", status: "فعال" },
  { name: "علی رضایی", avatar: "ع", type: "بازگشتی", orders: 5, total: 3200000, cat: "تجهیزات", last: "۱ هفته پیش", status: "فعال" },
  { name: "فاطمه کریمی", avatar: "ف", type: "جدید", orders: 1, total: 385000, cat: "گیاهی", last: "۳ روز پیش", status: "فعال" },
  { name: "حسین احمدی", avatar: "ح", type: "VIP", orders: 20, total: 15800000, cat: "مکمل", last: "دیروز", status: "فعال" },
  { name: "مریم حسینی", avatar: "م", type: "بالقوه", orders: 0, total: 0, cat: "—", last: "۱ ماه پیش", status: "غیرفعال" },
  { name: "سارا ملکی", avatar: "س", type: "بازگشتی", orders: 7, total: 4650000, cat: "تجهیزات", last: "۵ روز پیش", status: "فعال" },
];
