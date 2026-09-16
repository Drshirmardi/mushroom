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
