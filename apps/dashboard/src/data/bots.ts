export interface Bot {
  id: number;
  name: string;
  platform: string;
  icon: string;
  users: number;
  convs: number;
  conv_rate: string;
  status: string;
  lastActivity: string;
  color: string;
}

export const BOTS: Bot[] = [
  { id: 1, name: "ربات تلگرام", platform: "Telegram", icon: "✈️", users: 25000, convs: 1840, conv_rate: "۱۲٪", status: "فعال", lastActivity: "۵ دقیقه پیش", color: "bg-blue-500" },
  { id: 2, name: "ربات بله", platform: "Bale", icon: "🟦", users: 12500, convs: 920, conv_rate: "۹٪", status: "فعال", lastActivity: "۱۵ دقیقه پیش", color: "bg-sky-500" },
  { id: 3, name: "ربات روبیکا", platform: "Rubika", icon: "🔴", users: 8200, convs: 540, conv_rate: "۷٪", status: "غیرفعال", lastActivity: "۳ روز پیش", color: "bg-red-500" },
];

export type BotConvStatus = "AI" | "انتقال" | "تکمیل";

export interface BotConversation {
  id: number;
  user: string;
  platform: string;
  lastMsg: string;
  time: string;
  status: BotConvStatus;
  unread: number;
  temperament: string;
}

export const BOT_CONVS: BotConversation[] = [
  { id: 1, user: "@ali_tehrani", platform: "Telegram", lastMsg: "مزاج من چیست؟", time: "۵ دقیقه پیش", status: "AI", unread: 2, temperament: "دموی" },
  { id: 2, user: "@zahra_m", platform: "Bale", lastMsg: "میخوام نوبت بگیرم", time: "۱۲ دقیقه پیش", status: "انتقال", unread: 0, temperament: "صفراوی" },
  { id: 3, user: "@hossein_84", platform: "Telegram", lastMsg: "قیمت روغن طبی چقدره؟", time: "۲۵ دقیقه پیش", status: "AI", unread: 1, temperament: "—" },
  { id: 4, user: "@maryam_kh", platform: "Rubika", lastMsg: "برنامه غذایی می‌خوام", time: "۱ ساعت پیش", status: "تکمیل", unread: 0, temperament: "بلغمی" },
  { id: 5, user: "@reza_karimi22", platform: "Telegram", lastMsg: "ممنون از راهنمایی‌تون", time: "۲ ساعت پیش", status: "تکمیل", unread: 0, temperament: "سوداوی" },
];

export interface BotChatMessage {
  from: "user" | "bot";
  text: string;
  time: string;
}

export const BOT_CHAT: BotChatMessage[] = [
  { from: "user", text: "سلام، می‌خوام مزاجم رو بدونم", time: "۱۰:۰۰" },
  { from: "bot", text: "سلام! خوش آمدید به دستیار هوشمند کلینیک دکتر شیرمردی 🌿\nبرای تعیین مزاج شما، چند سوال می‌پرسم.", time: "۱۰:۰۰" },
  { from: "user", text: "بفرمایید", time: "۱۰:۰۱" },
  { from: "bot", text: "طبیعت بدن شما بیشتر چگونه است؟\n۱. گرم\n۲. سرد\n۳. معتدل", time: "۱۰:۰۱" },
  { from: "user", text: "۱. گرم", time: "۱۰:۰۲" },
  { from: "bot", text: "چه سوال بعدی دارید؟", time: "۱۰:۰۲" },
  { from: "user", text: "مزاج من چیست؟", time: "۱۰:۰۵" },
];

export interface BotDailyActivity {
  day: string;
  users: number;
  assessments: number;
  bookings: number;
  sales: number;
}

export const BOT_DAILY: BotDailyActivity[] = [
  { day: "ش", users: 180, assessments: 42, bookings: 12, sales: 8 },
  { day: "ی", users: 220, assessments: 58, bookings: 18, sales: 14 },
  { day: "د", users: 195, assessments: 48, bookings: 15, sales: 11 },
  { day: "س", users: 310, assessments: 84, bookings: 25, sales: 19 },
  { day: "چ", users: 280, assessments: 72, bookings: 22, sales: 16 },
  { day: "پ", users: 390, assessments: 98, bookings: 31, sales: 24 },
];
