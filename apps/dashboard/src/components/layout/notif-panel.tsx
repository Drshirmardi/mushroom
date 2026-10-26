"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, Calendar, FileText, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboardSession } from "@/components/auth/dashboard-session-gate";
import { dashboardPhaseEightError, listDashboardNotifications, type DashboardNotification } from "@/lib/phase-08-api";
import { p } from "@/lib/utils";

const ICONS: Record<DashboardNotification["category"], LucideIcon> = { FINANCIAL: Wallet, REMINDER: Calendar, TREATMENT: FileText, CONTENT: BookOpen, SYSTEM: Bell };

export function NotifPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { authentication } = useDashboardSession();
  const [items, setItems] = useState<DashboardNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.focus();
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    void listDashboardNotifications(authentication.accessToken).then(
      (value) => { if (active) { setItems(value.items); setError(null); setLoadedToken(authentication.accessToken); } },
      (reason: unknown) => { if (active) { setItems(null); setError(dashboardPhaseEightError(reason, "اعلان‌های کلینیک دریافت نشد.")); setLoadedToken(authentication.accessToken); } },
    );
    return () => { active = false; };
  }, [authentication.accessToken]);

  const unread = (items ?? []).filter((item) => !item.readAt);
  const isCurrent = loadedToken === authentication.accessToken;
  return (
    <div ref={ref} tabIndex={-1} role="region" aria-label="اعلان‌های کلینیک" className="absolute top-full left-0 mt-2 w-[min(24rem,calc(100vw-1rem))] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground">اعلان‌ها</h3>
          {unread.length > 0 && <span className="bg-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold">{p(unread.length)} جدید</span>}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {(!isCurrent || (!items && !error)) && <p className="px-4 py-5 text-xs text-muted-foreground" role="status">در حال دریافت اعلان‌ها…</p>}
        {isCurrent && error && <p className="px-4 py-5 text-xs text-red-700" role="alert">{error}</p>}
        {isCurrent && items?.length === 0 && <p className="px-4 py-5 text-xs text-muted-foreground">اعلانی وجود ندارد.</p>}
        {isCurrent && items?.slice(0, 5).map(item => {
          const Icon = ICONS[item.category] ?? Bell;
          return (
            <div key={item.id} className={`flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors ${!item.readAt ? "bg-primary/5" : ""}`}>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={14} /></div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${!item.readAt ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-foreground">کاربر: {item.recipientDisplayName || "نام ثبت نشده"}</p><p className="mt-1 text-xs text-muted-foreground"><span className="font-medium">متن ارسال‌شده به کاربر: </span>{item.body}</p>
                <p className="text-[0.65rem] text-muted-foreground/60 mt-1">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p>
              </div>
              {!item.readAt && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <button onClick={() => { router.push("/notifications"); onClose(); }}
          className="w-full py-2 text-xs text-primary font-bold hover:bg-primary/5 rounded-xl transition-colors">
          مشاهده همه اعلان‌ها ←
        </button>
      </div>
    </div>
  );
}
