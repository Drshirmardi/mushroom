"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, Calendar, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthSession } from "@/components/auth/session-gate";
import { PageHeader } from "@/components/shared/page-header";
import { followUpErrorMessage, listNotifications, readAllNotifications, readNotification, type NotificationCategory, type PatientNotification } from "@/lib/follow-up-api";
import { toP } from "@/lib/format";

const ICON_MAP: Record<NotificationCategory, { icon: LucideIcon; color: string }> = { REMINDER: { icon: Calendar, color: "bg-blue-50 text-blue-600" }, TREATMENT: { icon: FileText, color: "bg-green-50 text-green-600" }, CONTENT: { icon: BookOpen, color: "bg-purple-50 text-purple-600" }, SYSTEM: { icon: Bell, color: "bg-muted text-muted-foreground" } };

export default function NotificationsPage() {
  const router = useRouter(); const { authentication } = useAuthSession(); const [items, setItems] = useState<PatientNotification[] | null>(null); const [error, setError] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const reload = () => { setItems(null); setError(null); void listNotifications(authentication.accessToken).then((value) => setItems(value.items), (reason: unknown) => setError(followUpErrorMessage(reason))); };
  useEffect(reload, [authentication.accessToken]);
  const markRead = async (id: string) => { if (!items?.find((item) => item.id === id && !item.readAt)) return; setSaving(true); try { await readNotification(authentication.accessToken, id); setItems((current) => current?.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) ?? null); } catch (reason) { setError(followUpErrorMessage(reason, "خواندن اعلان ممکن نشد؛ دوباره تلاش کنید.")); } finally { setSaving(false); } };
  const markAllRead = async () => { setSaving(true); try { await readAllNotifications(authentication.accessToken); setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ?? null); } catch (reason) { setError(followUpErrorMessage(reason, "به‌روزرسانی اعلان‌ها ممکن نشد؛ دوباره تلاش کنید.")); } finally { setSaving(false); } };
  const unread = items?.filter((item) => !item.readAt).length ?? 0;
  return <div><PageHeader title="اعلان‌ها" onBack={() => router.back()} right={unread > 0 ? <button disabled={saving} onClick={markAllRead} className="text-xs font-bold text-primary disabled:opacity-60">خواندن همه</button> : undefined} />{unread > 0 && <div className="mx-4 mb-3 rounded-2xl bg-primary/10 p-3 text-center"><p className="text-sm font-semibold text-primary">{toP(unread)} اعلان خوانده‌نشده</p></div>}<div className="space-y-2 px-4 pb-4">{!items && !error && <p role="status" className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">در حال دریافت اعلان‌ها…</p>}{error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={reload} className="mt-3 font-bold text-primary">تلاش دوباره</button></div>}{items?.length === 0 && <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">اعلانی برای شما وجود ندارد.</p>}{items?.map((item) => { const { icon: Icon, color } = ICON_MAP[item.category]; const read = Boolean(item.readAt); return <button key={item.id} disabled={saving} onClick={() => void markRead(item.id)} className={`w-full rounded-2xl border p-3.5 text-right transition-all disabled:opacity-70 ${read ? "border-border bg-white" : "border-primary/20 bg-primary/5"}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={18} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className={`text-sm font-bold ${read ? "text-foreground" : "text-primary"}`}>{item.title}</p>{!read && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}</div><p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p></div></div></button>; })}</div></div>;
}
