"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NOTIFS, NOTIF_ICON_FALLBACK, NOTIF_ICON_MAP } from "@/data/notifications";
import { p } from "@/lib/utils";

export function NotifPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const unread = NOTIFS.filter(n => !n.read);
  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground">اعلان‌ها</h3>
          {unread.length > 0 && <span className="bg-red-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold">{p(unread.length)} جدید</span>}
        </div>
        <button className="text-xs text-primary font-semibold hover:underline">همه خوانده‌شده</button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {NOTIFS.map(n => {
          const { icon: Icon, bg } = NOTIF_ICON_MAP[n.type] ?? NOTIF_ICON_FALLBACK;
          return (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/40 cursor-pointer transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}><Icon size={14} /></div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.text}</p>
                <p className="text-[0.65rem] text-muted-foreground/60 mt-1">{n.time}</p>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
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
