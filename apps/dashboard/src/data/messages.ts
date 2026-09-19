export interface Conversation {
  id: number;
  patient: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  pinned: boolean;
}

export const MESSAGES_LIST: Conversation[] = [
  { id: 1, patient: "زهرا محمدی", avatar: "ز", lastMsg: "ممنون دکتر، درد خیلی بهتر شده", time: "۱۰:۳۲", unread: 2, pinned: true },
  { id: 2, patient: "علی رضایی", avatar: "ع", lastMsg: "آیا می‌توانم فردا نوبت بگیرم؟", time: "دیروز", unread: 0, pinned: false },
  { id: 3, patient: "فاطمه کریمی", avatar: "ف", lastMsg: "برای پیگیری نوبت پیام داده است", time: "دیروز", unread: 1, pinned: false },
  { id: 4, patient: "حسین احمدی", avatar: "ح", lastMsg: "داروها را گرفتم، تشکر", time: "۲ روز", unread: 0, pinned: false },
];

export interface ChatMessage {
  id: number;
  from: "patient" | "doctor";
  text: string;
  time: string;
  type: "text";
}

export const CHAT: ChatMessage[] = [
  { id: 1, from: "patient", text: "سلام دکتر، درد زانویم این هفته بدتر شده", time: "۱۰:۱۵", type: "text" },
  { id: 2, from: "doctor", text: "سلام. می‌توانید دردتان را از ۱ تا ۱۰ ارزیابی کنید؟", time: "۱۰:۱۸", type: "text" },
  { id: 3, from: "patient", text: "حدوداً ۷ از ۱۰ است، مخصوصاً وقتی راه می‌روم", time: "۱۰:۲۰", type: "text" },
  { id: 4, from: "doctor", text: "آیا تمرینات تجویزشده را انجام می‌دهید؟", time: "۱۰:۲۵", type: "text" },
  { id: 6, from: "doctor", text: "خوب است. لطفاً جلسه بعدی را زودتر بگیرید", time: "۱۰:۳۰", type: "text" },
  { id: 7, from: "patient", text: "ممنون دکتر، درد خیلی بهتر شده", time: "۱۰:۳۲", type: "text" },
];
