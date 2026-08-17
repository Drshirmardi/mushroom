"use client";

import { useState } from "react";
import { Search, Send } from "lucide-react";
import { BOT_CHAT, BOT_CONVS } from "@/data/bots";
import type { BotConversation } from "@/data/bots";
import { p } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  "AI": "bg-blue-100 text-blue-700",
  "انتقال": "bg-amber-100 text-amber-700",
  "تکمیل": "bg-emerald-100 text-emerald-700",
};

export function BotConversationsPage() {
  const [active, setActive] = useState<BotConversation>(BOT_CONVS[0]);
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="w-72 border-l border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="relative"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input placeholder="جستجو..." className="w-full bg-secondary rounded-xl pr-8 pl-4 py-2 text-sm outline-none" /></div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {BOT_CONVS.map(c => (
            <button key={c.id} onClick={() => setActive(c)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-right ${active.id === c.id ? "bg-secondary" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">@</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5"><p className="text-sm font-bold truncate">{c.user}</p><span className="text-[0.62rem] text-muted-foreground">{c.time}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-[0.6rem] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{c.platform}</span><p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p></div>
              </div>
              {c.unread > 0 && <span className="w-5 h-5 bg-primary text-white text-[0.6rem] rounded-full flex items-center justify-center font-bold flex-shrink-0">{p(c.unread)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3.5 border-b border-border bg-card flex items-center gap-4 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">@</div>
          <div><p className="font-bold text-sm">{active.user}</p><div className="flex items-center gap-2"><span className="text-[0.62rem] text-muted-foreground">{active.platform}</span>{active.temperament !== "—" && <span className="text-[0.62rem] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">مزاج: {active.temperament}</span>}</div></div>
          <div className="mr-auto flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[active.status]}`}>{active.status}</span>
            {active.status !== "تکمیل" && <button className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200">انتقال به پزشک</button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-secondary/10">
          {BOT_CHAT.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0 ${m.from === "bot" ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{m.from === "bot" ? "🤖" : "@"}</div>
              <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${m.from === "bot" ? "bg-card border border-border" : "bg-primary text-primary-foreground"}`}>{m.text}<p className={`text-[0.6rem] mt-1 ${m.from === "bot" ? "text-muted-foreground" : "text-white/60"}`}>{m.time}</p></div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border bg-card flex gap-2 flex-shrink-0">
          <input placeholder="پاسخ دستی به کاربر..." className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none" />
          <button className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/90"><Send size={15} className="text-white" /></button>
        </div>
      </div>
      {/* User profile sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-4">
        <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">پروفایل کاربر</p>
        <div className="space-y-3 text-xs">
          {[["یوزرنیم", active.user], ["پلتفرم", active.platform], ["مزاج", active.temperament], ["وضعیت مشتری", "بالقوه"], ["تعداد مکالمات", p(3)], ["آخرین تعامل", active.time]].map(([l, v]) => (
            <div key={l}><p className="text-muted-foreground">{l}</p><p className="font-semibold mt-0.5">{v}</p></div>
          ))}
          <div className="pt-2 border-t border-border space-y-1.5">
            <button className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">ایجاد پرونده بیمار</button>
            <button className="w-full py-2 border border-border rounded-xl text-xs font-semibold hover:bg-secondary">ارجاع به پزشک</button>
          </div>
        </div>
      </div>
    </div>
  );
}
