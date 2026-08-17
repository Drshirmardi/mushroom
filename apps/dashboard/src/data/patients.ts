export interface Patient {
  id: number;
  name: string;
  phone: string;
  age: string;
  weight: string;
  height: string;
  visits: string;
  lastVisit: string;
  diagnosis: string;
  avatar: string;
  status: string;
  revenue: number;
  constitution: string;
  bloodType: string;
}

export const PATIENTS: Patient[] = [
  { id: 1, name: "زهرا محمدی", phone: "۰۹۱۲۱۲۳۴۵۶۷", age: "۳۵", weight: "۶۲", height: "۱۶۵", visits: "۱۲", lastVisit: "۱۴۰۳/۰۴/۱۵", diagnosis: "کمردرد مزمن، درد مفاصل", avatar: "ز", status: "فعال", revenue: 12500000, constitution: "دموی - صفراوی", bloodType: "A+" },
  { id: 2, name: "علی رضایی", phone: "۰۹۳۵۸۷۶۵۴۳۲", age: "۴۲", weight: "۷۸", height: "۱۷۸", visits: "۸", lastVisit: "۱۴۰۳/۰۴/۱۴", diagnosis: "میگرن مزمن، اضطراب", avatar: "ع", status: "فعال", revenue: 8200000, constitution: "صفراوی", bloodType: "O+" },
  { id: 3, name: "فاطمه کریمی", phone: "۰۹۱۷۳۴۵۶۷۸۹", age: "۲۸", weight: "۵۵", height: "۱۶۰", visits: "۵", lastVisit: "۱۴۰۳/۰۴/۱۰", diagnosis: "نازایی، اختلالات هورمونی", avatar: "ف", status: "فعال", revenue: 5400000, constitution: "بلغمی", bloodType: "B+" },
  { id: 4, name: "حسین احمدی", phone: "۰۹۱۱۵۵۵۴۴۴۳", age: "۵۸", weight: "۸۵", height: "۱۷۲", visits: "۲۰", lastVisit: "۱۴۰۳/۰۴/۱۶", diagnosis: "آرتروز زانو، فشار خون", avatar: "ح", status: "فعال", revenue: 21000000, constitution: "سوداوی - دموی", bloodType: "AB+" },
  { id: 5, name: "مریم حسینی", phone: "۰۹۳۶۷۸۹۰۱۲۳", age: "۳۱", weight: "۵۸", height: "۱۶۳", visits: "۳", lastVisit: "۱۴۰۳/۰۳/۲۵", diagnosis: "اختلال خواب، افسردگی خفیف", avatar: "م", status: "فعال", revenue: 3200000, constitution: "بلغمی - سوداوی", bloodType: "A-" },
  { id: 6, name: "سارا ملکی", phone: "۰۹۳۳۱۲۳۴۵۶۷", age: "۳۸", weight: "۶۵", height: "۱۶۸", visits: "۷", lastVisit: "۱۴۰۳/۰۴/۰۸", diagnosis: "درد گردن، سردرد تنشی", avatar: "س", status: "فعال", revenue: 7300000, constitution: "دموی", bloodType: "O-" },
];
