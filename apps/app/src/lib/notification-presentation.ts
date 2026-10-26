import { Bell, BookOpen, Calendar, FileText, Wallet, type LucideIcon } from "lucide-react";
import type { NotificationCategory } from "./follow-up-api";

type NotificationPresentation = { icon: LucideIcon; color: string; label: string; description: string };
const presentations: Record<NotificationCategory, NotificationPresentation> = {
  FINANCIAL: { icon: Wallet, color: "bg-blue-50 text-blue-700", label: "مالی و کیف پول", description: "تغییرات موجودی، پرداخت‌ها و بازپرداخت‌ها" },
  REMINDER: { icon: Calendar, color: "bg-blue-50 text-blue-600", label: "یادآوری‌ها", description: "یادآوری نوبت و کارهای زمان‌بندی‌شده" },
  TREATMENT: { icon: FileText, color: "bg-green-50 text-green-600", label: "به‌روزرسانی درمان", description: "تغییرات برنامهٔ درمان" },
  CONTENT: { icon: BookOpen, color: "bg-purple-50 text-purple-600", label: "محتوای آموزشی", description: "مقاله‌ها و محتوای جدید" },
  SYSTEM: { icon: Bell, color: "bg-muted text-muted-foreground", label: "اعلان‌های سیستمی", description: "پیام‌های ضروری سامانه" },
};

export function notificationPresentation(category: string | null | undefined): NotificationPresentation {
  return category && Object.prototype.hasOwnProperty.call(presentations, category)
    ? presentations[category as NotificationCategory]
    : presentations.SYSTEM;
}
