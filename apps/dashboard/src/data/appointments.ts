export interface Appointment {
  id: number;
  patient: string;
  time: string;
  type: "حضوری" | "آنلاین";
  status: string;
  avatar: string;
  phone: string;
}

export const APPTS: Appointment[] = [
  { id: 1, patient: "زهرا محمدی", time: "۰۸:۳۰", type: "حضوری", status: "پایان یافته", avatar: "ز", phone: "۰۹۱۲۱۲۳۴۵۶۷" },
  { id: 2, patient: "علی رضایی", time: "۰۹:۰۰", type: "آنلاین", status: "پایان یافته", avatar: "ع", phone: "۰۹۳۵۸۷۶۵۴۳۲" },
  { id: 3, patient: "فاطمه کریمی", time: "۰۹:۳۰", type: "حضوری", status: "پایان یافته", avatar: "ف", phone: "۰۹۱۷۳۴۵۶۷۸۹" },
  { id: 4, patient: "حسین احمدی", time: "۱۰:۰۰", type: "حضوری", status: "در حال انجام", avatar: "ح", phone: "۰۹۱۱۵۵۵۴۴۴۳" },
  { id: 5, patient: "مریم حسینی", time: "۱۰:۳۰", type: "آنلاین", status: "تایید شده", avatar: "م", phone: "۰۹۳۶۷۸۹۰۱۲۳" },
  { id: 6, patient: "محمد رضایی", time: "۱۱:۰۰", type: "حضوری", status: "تایید شده", avatar: "م", phone: "۰۹۱۲۹۸۷۶۵۴۳" },
  { id: 7, patient: "سارا ملکی", time: "۱۱:۳۰", type: "حضوری", status: "تایید شده", avatar: "س", phone: "۰۹۳۳۱۲۳۴۵۶۷" },
  { id: 8, patient: "رضا کمالی", time: "۱۲:۰۰", type: "آنلاین", status: "در انتظار تایید", avatar: "ر", phone: "۰۹۱۴۵۵۵۶۶۷۷" },
  { id: 9, patient: "نیلوفر جعفری", time: "۱۴:۰۰", type: "حضوری", status: "تایید شده", avatar: "ن", phone: "۰۹۳۷۸۸۷۷۶۶۵" },
  { id: 10, patient: "کاوه صادقی", time: "۱۴:۳۰", type: "آنلاین", status: "تایید شده", avatar: "ک", phone: "۰۹۱۹۱۲۳۴۵۶۷" },
  { id: 11, patient: "شیرین موسوی", time: "۱۵:۰۰", type: "حضوری", status: "تایید شده", avatar: "ش", phone: "۰۹۳۵۹۸۷۶۵۴۳" },
  { id: 12, patient: "امیر تهرانی", time: "۱۵:۳۰", type: "حضوری", status: "لغو شده", avatar: "ا", phone: "۰۹۱۲۳۳۳۴۴۴۵" },
];
