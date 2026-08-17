export interface Automation {
  id: number;
  trigger: string;
  action: string;
  active: boolean;
  runs: string;
}

export const AUTOMATIONS: Automation[] = [
  { id: 1, trigger: "ارزیابی تکمیل شد", action: "اعلان به پزشک", active: true, runs: "۳۴" },
  { id: 2, trigger: "نسخه به‌روزرسانی شد", action: "اطلاع‌رسانی به بیمار", active: true, runs: "۸۹" },
  { id: 3, trigger: "درمان به‌روزرسانی شد", action: "بروزرسانی اپ موبایل", active: true, runs: "۵۶" },
  { id: 4, trigger: "نوبت فردا", action: "یادآوری خودکار", active: true, runs: "۲۱۰" },
  { id: 5, trigger: "یادآوری دارو", action: "نوتیفیکیشن پوش", active: false, runs: "۰" },
  { id: 6, trigger: "موجودی کم", action: "اعلان به مدیر", active: true, runs: "۱۲" },
];
