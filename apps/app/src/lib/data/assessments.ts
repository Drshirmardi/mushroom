import {
  Activity,
  Brain,
  Moon,
  Sparkles,
  Sun,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AssessmentType = {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
};

export const ASSESSMENT_TYPES: AssessmentType[] = [
  { id: "individual", title: "ارزیابی فردی", desc: "بررسی کامل وضعیت سلامت شما", icon: User, color: "from-primary to-[#2d7a52]" },
  { id: "pain", title: "ارزیابی درد", desc: "تحلیل دقیق منبع و شدت درد", icon: Activity, color: "bg-rose-50 text-rose-600 border-rose-100" },
  { id: "sleep", title: "ارزیابی خواب", desc: "بررسی کیفیت و الگوی خواب", icon: Moon, color: "bg-blue-50 text-blue-600 border-blue-100" },
  { id: "stress", title: "ارزیابی استرس", desc: "سنجش سطح استرس و اضطراب", icon: Brain, color: "bg-purple-50 text-purple-600 border-purple-100" },
  { id: "lifestyle", title: "ارزیابی سبک زندگی", desc: "تغذیه، ورزش و عادات روزانه", icon: Sun, color: "bg-amber-50 text-amber-600 border-amber-100" },
  { id: "tradmed", title: "تشخیص مزاج", desc: "تعیین مزاج با طب سنتی ایرانی", icon: Sparkles, color: "bg-orange-50 text-orange-600 border-orange-100" },
  { id: "couple", title: "ارزیابی زوجین", desc: "تست مزاج شناسی زوجین", icon: Users, color: "bg-pink-50 text-pink-600 border-pink-100" },
  { id: "followup", title: "ارزیابی پیگیری", desc: "پیگیری پیشرفت درمان", icon: TrendingUp, color: "bg-green-50 text-green-600 border-green-100" },
];

export const WIZARD_CONFIGS: Record<string, { title: string; steps: string[] }> = {
  individual: { title: "ارزیابی فردی", steps: ["اطلاعات شخصی", "علائم", "شدت درد", "خواب", "استرس", "سابقه پزشکی"] },
  pain: { title: "ارزیابی درد", steps: ["محل درد", "شدت درد", "نوع درد", "عوامل تشدید"] },
  sleep: { title: "ارزیابی خواب", steps: ["الگوی خواب", "کیفیت خواب", "عوامل اختلال", "نتیجه"] },
  stress: { title: "ارزیابی استرس", steps: ["علائم استرس", "منابع استرس", "مکانیسم‌های مقابله"] },
  tradmed: { title: "تشخیص مزاج", steps: ["ظاهر جسمی", "خلق‌وخو", "ترجیحات غذایی", "الگوهای خواب", "نتیجه"] },
  couple: { title: "ارزیابی زوجین", steps: ["اطلاعات نفر اول", "اطلاعات نفر دوم", "سلامت مشترک", "نتیجه"] },
  lifestyle: { title: "سبک زندگی", steps: ["تغذیه", "ورزش", "محیط کار", "روابط اجتماعی"] },
  followup: { title: "ارزیابی پیگیری", steps: ["تغییرات علائم", "اثربخشی درمان", "کیفیت زندگی"] },
};
