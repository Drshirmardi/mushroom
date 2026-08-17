"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calendar,
  FileText,
  Package,
  Pill,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { NOTIFICATIONS } from "@/lib/data/catalog";
import { toP } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

const ICON_MAP: Record<AppNotification["type"], { icon: LucideIcon; color: string }> = {
  prescription: { icon: FileText, color: "bg-amber-50 text-amber-600" },
  medication: { icon: Pill, color: "bg-green-50 text-green-600" },
  appointment: { icon: Calendar, color: "bg-blue-50 text-blue-600" },
  article: { icon: BookOpen, color: "bg-purple-50 text-purple-600" },
  order: { icon: Package, color: "bg-orange-50 text-orange-600" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<AppNotification[]>(NOTIFICATIONS);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div>
      <PageHeader title="اعلان‌ها" onBack={() => router.back()} right={unread > 0 ? <button onClick={() => setNotifs(n => n.map(x => ({ ...x, read: true })))} className="text-primary text-xs font-bold">خواندن همه</button> : undefined} />
      {unread > 0 && <div className="mx-4 mb-3 bg-primary/10 rounded-2xl p-3 text-center"><p className="text-sm text-primary font-semibold">{toP(unread)} اعلان خوانده‌نشده</p></div>}
      <div className="px-4 space-y-2 pb-4">
        {notifs.map(n => {
          const { icon: Icon, color } = ICON_MAP[n.type] || { icon: Bell, color: "bg-muted text-muted-foreground" };
          return (
            <button key={n.id} onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
              className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-right transition-all ${n.read ? "bg-white border-border" : "bg-primary/5 border-primary/20"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}><Icon size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${n.read ? "text-foreground" : "text-primary"}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
