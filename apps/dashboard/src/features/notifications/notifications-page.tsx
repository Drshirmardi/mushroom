"use client";

import { useState } from "react";
import { Archive, Search, Trash2 } from "lucide-react";
import { NOTIFS, NOTIF_ICON_FALLBACK, NOTIF_ICON_MAP } from "@/data/notifications";

export function NotificationsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const filtered = NOTIFS.filter(n => {
    const ms = n.text.includes(search);
    const mf = filter === "all" || (filter === "unread" && !n.read) || (filter === "archived" && n.read);
    return ms && mf;
  });
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-7 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در اعلان‌ها..." className="w-full bg-card border border-border rounded-xl pr-8 pl-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          {([["all", "همه"], ["unread", "خوانده‌نشده"], ["archived", "آرشیو"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <button className="text-xs text-primary font-semibold hover:underline mr-auto">همه خوانده‌شده</button>
      </div>
      <div className="space-y-2 max-w-2xl">
        {filtered.map(n => {
          const { icon: Icon, bg } = NOTIF_ICON_MAP[n.type] ?? NOTIF_ICON_FALLBACK;
          return (
            <div key={n.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${!n.read ? "bg-card border-primary/20 shadow-sm" : "bg-card border-border"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}><Icon size={18} /></div>
              <div className="flex-1 min-w-0"><p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.text}</p><p className="text-xs text-muted-foreground mt-1">{n.time}</p></div>
              <div className="flex gap-1 flex-shrink-0">
                <button className="p-1.5 hover:bg-secondary rounded-lg"><Archive size={13} className="text-muted-foreground" /></button>
                <button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-muted-foreground" /></button>
              </div>
              {!n.read && <div className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
