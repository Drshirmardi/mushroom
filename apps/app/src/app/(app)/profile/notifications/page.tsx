"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { followUpErrorMessage, listNotificationPreferences, updateNotificationPreference, type NotificationCategory, type NotificationPreference } from "@/lib/follow-up-api";

const labels: Record<NotificationCategory, { label: string; description: string }> = { REMINDER: { label: "یادآوری‌ها", description: "یادآوری نوبت و کارهای زمان‌بندی‌شده" }, TREATMENT: { label: "به‌روزرسانی درمان", description: "تغییرات برنامهٔ درمان" }, CONTENT: { label: "محتوای آموزشی", description: "مقاله‌ها و محتوای جدید" }, SYSTEM: { label: "اعلان‌های سیستمی", description: "پیام‌های ضروری سامانه" } };

export default function NotifSettingsPage() {
  const router = useRouter(); const { authentication } = useAuthSession(); const [items, setItems] = useState<NotificationPreference[] | null>(null); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState<NotificationCategory | null>(null);
  const reload = () => { setItems(null); setError(null); void listNotificationPreferences(authentication.accessToken).then((value) => setItems(value.items), (reason: unknown) => setError(followUpErrorMessage(reason))); };
  useEffect(reload, [authentication.accessToken]);
  const toggle = async (item: NotificationPreference) => { setSaving(item.category); setError(null); try { const updated = await updateNotificationPreference(authentication.accessToken, item.category, !item.inAppEnabled); setItems((current) => current?.map((value) => value.category === item.category ? updated : value) ?? null); } catch (reason) { setError(followUpErrorMessage(reason, "ذخیرهٔ تنظیمات ممکن نشد؛ دوباره تلاش کنید.")); } finally { setSaving(null); } };
  return <div><PageHeader title="تنظیمات اعلان" onBack={() => router.back()} /><div className="px-4 pb-4">{!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت تنظیمات…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={reload} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{items && <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">{items.map((item, index) => <div key={item.category} className={`flex items-center gap-3 p-4 ${index < items.length - 1 ? "border-b border-border" : ""}`}><div className="flex-1"><p className="text-sm font-semibold text-foreground">{labels[item.category].label}</p><p className="mt-0.5 text-xs text-muted-foreground">{labels[item.category].description}</p></div><button aria-label={labels[item.category].label} disabled={saving !== null} onClick={() => void toggle(item)} className={`relative flex h-6 w-12 flex-shrink-0 rounded-full transition-all disabled:opacity-60 ${item.inAppEnabled ? "bg-primary" : "bg-muted"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${item.inAppEnabled ? "left-[26px]" : "left-0.5"}`} /></button></div>)}</div>}</div></div>;
}
