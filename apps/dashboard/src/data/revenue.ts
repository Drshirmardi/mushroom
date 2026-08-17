export interface RevenuePoint {
  month?: string;
  day?: string;
  h?: string;
  inPerson: number;
  online: number;
  store: number;
}

export const MONTHLY_REV: RevenuePoint[] = [
  { month: "فروردین", inPerson: 18000000, online: 12000000, store: 5000000 },
  { month: "اردیبهشت", inPerson: 22000000, online: 15000000, store: 6500000 },
  { month: "خرداد", inPerson: 19000000, online: 11000000, store: 4800000 },
  { month: "تیر", inPerson: 25000000, online: 18000000, store: 7200000 },
  { month: "مرداد", inPerson: 21000000, online: 14000000, store: 6000000 },
  { month: "شهریور", inPerson: 28000000, online: 20000000, store: 8500000 },
];

export const WEEKLY_REV: RevenuePoint[] = [
  { day: "شنبه", inPerson: 1200000, online: 800000, store: 350000 },
  { day: "یکشنبه", inPerson: 1800000, online: 1200000, store: 500000 },
  { day: "دوشنبه", inPerson: 1600000, online: 950000, store: 420000 },
  { day: "سه‌شنبه", inPerson: 2100000, online: 1400000, store: 650000 },
  { day: "چهارشنبه", inPerson: 1900000, online: 1100000, store: 580000 },
  { day: "پنجشنبه", inPerson: 2400000, online: 1600000, store: 700000 },
];

export const DAILY_REV: RevenuePoint[] = [
  { h: "۸", inPerson: 850000, online: 0, store: 0 },
  { h: "۹", inPerson: 850000, online: 500000, store: 120000 },
  { h: "۱۰", inPerson: 850000, online: 500000, store: 95000 },
  { h: "۱۱", inPerson: 850000, online: 0, store: 245000 },
  { h: "۱۲", inPerson: 0, online: 500000, store: 385000 },
  { h: "۱۴", inPerson: 850000, online: 500000, store: 0 },
  { h: "۱۵", inPerson: 1700000, online: 500000, store: 120000 },
];

export interface NamedValue {
  name: string;
  value: number;
}

export const PIE_DATA: NamedValue[] = [
  { name: "حضوری", value: 58 },
  { name: "آنلاین", value: 28 },
  { name: "فروشگاه", value: 14 },
];
export const PIE_COLORS = ["#1B5E42", "#7C3AED", "#F97316"];

export const DISEASE_DATA: NamedValue[] = [
  { name: "کمردرد", value: 38 }, { name: "میگرن", value: 24 },
  { name: "آرتروز", value: 18 }, { name: "اضطراب", value: 12 },
  { name: "بی‌خوابی", value: 8 },
];

export const CONSTITUTION_DATA: NamedValue[] = [
  { name: "دموی", value: 35 }, { name: "صفراوی", value: 28 },
  { name: "بلغمی", value: 22 }, { name: "سوداوی", value: 15 },
];
